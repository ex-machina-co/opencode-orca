import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import { ExecutionService } from '../execution/service'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const ExecutionListInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
})
export type ExecutionListInput = z.infer<typeof ExecutionListInput>

export const ExecutionListOutput = z.array(
  z.strictObject({
    execution_id: z.string(),
    plan_id: z.string(),
    stage: z.string(),
    created_at: z.string(),
    tasks_completed: z.number(),
    tasks_total: z.number(),
  }),
)
export type ExecutionListOutput = z.infer<typeof ExecutionListOutput>

export const ExecutionList = defineTool({
  name: 'execution-list',
  agents: ['orca', 'planner', 'specialist'],
  create: (deps: { directory: string; planningService: PlanningService }) =>
    tool({
      description: 'List all executions for a specific plan',
      args: ExecutionListInput.shape,
      async execute(args, ctx) {
        const plan = await deps.planningService.getPlan(args.plan_id)
        if (!plan) {
          return {
            title: 'Plan not found',
            metadata: planMetadata(ctx, args.plan_id),
            output: JSON.stringify({ error: `Plan not found: ${args.plan_id}` }),
          }
        }
        const executionService = new ExecutionService(deps.directory, args.plan_id, deps.planningService)
        const summaries = await executionService.listExecutions()
        return {
          title: `Found ${summaries.length} execution(s) for plan`,
          metadata: planMetadata(ctx, args.plan_id, { count: summaries.length }),
          output: JSON.stringify(summaries),
        }
      },
    }),
})
