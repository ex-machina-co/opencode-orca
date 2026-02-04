import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import { ExecutionService } from '../execution/service'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const ExecutionDescribeInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  execution_id: Identifier.schema('exec'),
})
export type ExecutionDescribeInput = z.infer<typeof ExecutionDescribeInput>

export const ExecutionDescribe = defineTool({
  name: 'execution-describe',
  agents: ['orca', 'planner', 'specialist'],
  create: (deps: { directory: string; planningService: PlanningService }) =>
    tool({
      description: 'Get full details of a specific execution including task status',
      args: ExecutionDescribeInput.shape,
      async execute(args, ctx) {
        const executionService = new ExecutionService(deps.directory, args.plan_id, deps.planningService)
        const execution = await executionService.getExecution(args.execution_id)
        if (!execution) {
          return {
            title: 'Execution not found',
            metadata: planMetadata(ctx, args.plan_id, { executionId: args.execution_id }),
            output: JSON.stringify({ error: `Execution not found: ${args.execution_id}` }),
          }
        }
        return {
          title: `Execution ${execution.status.stage}: ${execution.tasks.filter((t) => t.status === 'completed').length}/${execution.tasks.length} tasks`,
          metadata: planMetadata(ctx, args.plan_id, {
            executionId: args.execution_id,
            stage: execution.status.stage,
          }),
          output: JSON.stringify(execution),
        }
      },
    }),
})
