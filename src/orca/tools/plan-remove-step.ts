import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanRemoveStepInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  index: z.number().int().min(0).describe('Step index to remove (0-indexed)'),
})
export type PlanRemoveStepInput = z.infer<typeof PlanRemoveStepInput>

export const PlanRemoveStep = defineTool({
  name: 'plan-remove-step',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Remove a step from a draft plan',
      args: PlanRemoveStepInput.shape,
      async execute(args, ctx) {
        const updated = await planningService.removeStep(args.plan_id, args.index)
        const output: Success = {
          type: 'success',
          summary: `Removed step ${args.index} (${updated.steps.length} remaining)`,
        }
        return {
          title: 'Step removed',
          metadata: planMetadata(ctx, args.plan_id, {
            index: args.index,
            stepCount: updated.steps.length,
          }),
          output: JSON.stringify(output),
        }
      },
    }),
})
