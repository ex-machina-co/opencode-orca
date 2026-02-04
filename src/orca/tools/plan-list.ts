import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import type { PlanningService } from '../planning/service'
import { defineTool } from './common'

export const PlanListOutput = z.array(
  z.strictObject({
    plan_id: z.string(),
    goal: z.string(),
    stage: z.string(),
    created_at: z.string(),
    step_count: z.number(),
    execution_count: z.number(),
  }),
)
export type PlanListOutput = z.infer<typeof PlanListOutput>

export const PlanList = defineTool({
  name: 'plan-list',
  agents: ['orca', 'planner', 'specialist'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'List all plans with their summary information',
      args: {},
      async execute(_args, ctx) {
        const summaries = await planningService.listPlans()
        return {
          title: `Found ${summaries.length} plan(s)`,
          metadata: { sessionId: ctx.sessionID, count: summaries.length },
          output: JSON.stringify(summaries),
        }
      },
    }),
})
