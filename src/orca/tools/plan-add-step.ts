import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Success } from '../../common/response'
import { PlanStep } from '../planning/schemas'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanAddStepInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
  step: PlanStep,
  position: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Insert at position (0-indexed) shifting other steps up. Appends if omitted.'),
})
export type PlanAddStepInput = z.infer<typeof PlanAddStepInput>

export const PlanAddStep = defineTool({
  name: 'plan-add-step',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Add a step to a draft plan',
      args: PlanAddStepInput.shape,
      async execute(args, ctx) {
        const updated = await planningService.addStep(args.plan_id, args.step, args.position)
        const output: Success = {
          type: 'success',
          summary: `Added step (${updated.steps.length} total)`,
        }
        return {
          title: 'Step added',
          metadata: planMetadata(ctx, args.plan_id, {
            stepCount: updated.steps.length,
            position: args.position ?? updated.steps.length - 1,
          }),
          output: JSON.stringify(output),
        }
      },
    }),
})
