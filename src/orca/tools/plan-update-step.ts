import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import { PlanStep } from '../planning/schemas'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanUpdateStepInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  index: z.number().int().min(0).describe('Step index to update (0-indexed)'),
  updates: PlanStep.partial().refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  }),
})
export type PlanUpdateStepInput = z.infer<typeof PlanUpdateStepInput>

export const PlanUpdateStep = defineTool({
  name: 'plan-update-step',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Update an existing step in a draft plan',
      args: PlanUpdateStepInput.shape,
      async execute(args, ctx) {
        await planningService.updateStep(args.plan_id, args.index, args.updates)
        const output: Success = {
          type: 'success',
          summary: `Updated step ${args.index}`,
        }
        return {
          title: 'Step updated',
          metadata: planMetadata(ctx, args.plan_id, { index: args.index }),
          output: JSON.stringify(output),
        }
      },
    }),
})
