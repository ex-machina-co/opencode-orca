import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { PlanningService } from '../planning/service'
import { defineTool, planMetadata } from './common'

export const PlanDescribeInput = z.strictObject({
  plan_id: Identifier.schema('plan'),
})
export type PlanDescribeInput = z.infer<typeof PlanDescribeInput>

export const PlanDescribe = defineTool({
  name: 'plan-describe',
  agents: ['orca', 'planner', 'specialist'],
  create: (planningService: PlanningService) =>
    tool({
      description: 'Get full details of a specific plan by ID',
      args: PlanDescribeInput.shape,
      async execute(args, ctx) {
        const plan = await planningService.getPlan(args.plan_id)
        if (!plan) {
          return {
            title: 'Plan not found',
            metadata: planMetadata(ctx, args.plan_id),
            output: JSON.stringify({ error: `Plan not found: ${args.plan_id}` }),
          }
        }
        return {
          title: `Plan: ${plan.goal.substring(0, 50)}${plan.goal.length > 50 ? '...' : ''}`,
          metadata: planMetadata(ctx, args.plan_id, { stage: plan.stage }),
          output: JSON.stringify(plan),
        }
      },
    }),
})
