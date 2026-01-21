import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanSetRisksInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  risks: z.array(z.string().min(1)).min(1).describe('Plan-level risks'),
})
export type PlanSetRisksInput = z.infer<typeof PlanSetRisksInput>

export const PlanSetRisks = defineTool({
  name: 'plan-set-risks',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Set plan-level risks for a draft plan',
      args: PlanSetRisksInput.shape,
      async execute(args, ctx) {
        await planningService.setPlanRisks(args.plan_id, args.risks)
        const output: Success = {
          type: 'success',
          summary: `Set ${args.risks.length} risks`,
        }
        return {
          title: 'Risks set',
          metadata: planMetadata(ctx, args.plan_id, { count: args.risks.length }),
          output: JSON.stringify(output),
        }
      },
    }),
})
