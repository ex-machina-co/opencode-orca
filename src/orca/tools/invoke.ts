import { z } from 'zod'
import { ErrorCode } from '../../common/error-code'
import * as Identifier from '../../common/identifier'

// ============================================================================
// Schemas
// ============================================================================

export const InvokeInput = z.strictObject({
  message: z.string().min(1).describe('User message to send to planner'),
  plan_id: Identifier.schema('plan').optional().describe('Continue work on existing plan'),
})
export type InvokeInput = z.infer<typeof InvokeInput>

export const InvokeOutput = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('answer'),
    content: z.string().describe('Direct answer from planner'),
  }),
  z.strictObject({
    type: z.literal('plan_created'),
    plan_id: Identifier.schema('plan'),
    goal: z.string(),
    stage: z.literal('draft'),
  }),
  z.strictObject({
    type: z.literal('plan_submitted'),
    plan_id: Identifier.schema('plan'),
    goal: z.string(),
    stage: z.literal('proposal'),
    step_count: z.number(),
  }),
  z.strictObject({
    type: z.literal('failure'),
    code: ErrorCode,
    message: z.string(),
  }),
])
export type InvokeOutput = z.infer<typeof InvokeOutput>

// ============================================================================
// Tool implementation (Step 8)
// ============================================================================

// TODO: implement tool factory that takes OrcaService
