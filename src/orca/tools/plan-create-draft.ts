import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanCreateDraftInput = z.strictObject({
  goal: z.string().min(1).describe('Clear statement of what the plan will achieve'),
})
export type PlanCreateDraftInput = z.infer<typeof PlanCreateDraftInput>

export const PlanCreateDraftOutput = z.strictObject({
  plan_id: Identifier.schema('plan'),
})
export type PlanCreateDraftOutput = z.infer<typeof PlanCreateDraftOutput>

export const PlanCreateDraft = defineTool({
  name: 'plan-create-draft',
  agents: ['planner'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Create a new draft plan with the specified goal',
      args: PlanCreateDraftInput.shape,
      async execute(args, ctx) {
        const draft = await planningService.createDraft(ctx.sessionID, args.goal)
        const output: PlanCreateDraftOutput = { plan_id: draft.plan_id }
        return {
          title: 'Draft created',
          metadata: planMetadata(ctx, draft.plan_id, { goal: args.goal }),
          output: JSON.stringify(output),
        }
      },
    }),
})
