import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import { ErrorCode } from '../../common/error-code'
import * as Identifier from '../../common/identifier'
import type { OrcaService } from '../service'
import { defineTool } from './common'

// ============================================================================
// Schemas
// ============================================================================

export const InvokeInput = z.strictObject({
  message: z.string().min(1).describe('User message to send to planner'),
  session_id: Identifier.schema('session')
    .optional()
    .describe('Continue existing planner conversation'),
})
export type InvokeInput = z.infer<typeof InvokeInput>

export const InvokeOutput = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('answer'),
    session_id: Identifier.schema('session'),
    content: z.string().describe('Direct answer from planner'),
  }),
  z.strictObject({
    type: z.literal('plan_created'),
    session_id: Identifier.schema('session'),
    plan_id: Identifier.schema('plan'),
    goal: z.string(),
    stage: z.literal('draft'),
  }),
  z.strictObject({
    type: z.literal('plan_submitted'),
    session_id: Identifier.schema('session'),
    plan_id: Identifier.schema('plan'),
    goal: z.string(),
    stage: z.literal('proposal'),
    step_count: z.number(),
  }),
  z.strictObject({
    type: z.literal('failure'),
    session_id: Identifier.schema('session').optional(),
    code: ErrorCode,
    message: z.string(),
  }),
])
export type InvokeOutput = z.infer<typeof InvokeOutput>

// ============================================================================
// Tool
// ============================================================================

function formatTitle(result: InvokeOutput): string {
  switch (result.type) {
    case 'answer':
      return 'Answer received'
    case 'plan_created':
      return 'Draft plan created'
    case 'plan_submitted':
      return 'Plan submitted for approval'
    case 'failure':
      return 'Planning failed'
  }
}

export const OrcaInvoke = defineTool({
  name: 'orca-invoke',
  agents: ['orca'],
  create: (orca: OrcaService) =>
    tool({
      description: 'Send a user message to the planner for planning or direct answers',
      args: InvokeInput.shape,
      async execute(args, ctx) {
        const result = await orca.invoke(args, ctx)
        return {
          title: formatTitle(result),
          metadata: { sessionId: ctx.sessionID, result },
          output: JSON.stringify(result),
        }
      },
    }),
})
