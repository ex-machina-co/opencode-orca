import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanSubmitInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  summary: z.string().min(1).optional().describe('Optional summary of the plan'),
})
export type PlanSubmitInput = z.infer<typeof PlanSubmitInput>

export const PlanSubmit = defineTool({
  name: 'plan-submit',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Submit a draft plan for approval (validates completeness)',
      args: PlanSubmitInput.shape,
      async execute(args, ctx) {
        const proposal = await planningService.submit(args.plan_id, args.summary)
        const output: Success = {
          type: 'success',
          summary: `Plan submitted for approval (${proposal.steps.length} steps)`,
        }
        return {
          title: 'Plan submitted',
          metadata: planMetadata(ctx, args.plan_id, { stepCount: proposal.steps.length }),
          output: JSON.stringify(output),
        }
      },
    }),
})
