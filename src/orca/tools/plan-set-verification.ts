import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanSetVerificationInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  verification: z.array(z.string().min(1)).min(1).describe('Plan-level verification criteria'),
})
export type PlanSetVerificationInput = z.infer<typeof PlanSetVerificationInput>

export const PlanSetVerification = defineTool({
  name: 'plan-set-verification',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Set plan-level verification criteria for a draft plan',
      args: PlanSetVerificationInput.shape,
      async execute(args, ctx) {
        await planningService.setPlanVerification(args.plan_id, args.verification)
        const output: Success = {
          type: 'success',
          summary: `Set ${args.verification.length} verification criteria`,
        }
        return {
          title: 'Verification set',
          metadata: planMetadata(ctx, args.plan_id, { count: args.verification.length }),
          output: JSON.stringify(output),
        }
      },
    }),
})
