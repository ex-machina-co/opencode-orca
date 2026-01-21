import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanSetAssumptionsInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  assumptions: z.array(z.string().min(1)).min(1).describe('Plan-level assumptions'),
})
export type PlanSetAssumptionsInput = z.infer<typeof PlanSetAssumptionsInput>

export const PlanSetAssumptions = defineTool({
  name: 'plan-set-assumptions',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Set plan-level assumptions for a draft plan',
      args: PlanSetAssumptionsInput.shape,
      async execute(args, ctx) {
        await planningService.setPlanAssumptions(args.plan_id, args.assumptions)
        const output: Success = {
          type: 'success',
          summary: `Set ${args.assumptions.length} assumptions`,
        }
        return {
          title: 'Assumptions set',
          metadata: planMetadata(ctx, args.plan_id, { count: args.assumptions.length }),
          output: JSON.stringify(output),
        }
      },
    }),
})
