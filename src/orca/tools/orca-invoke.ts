import { tool } from '@opencode-ai/plugin'
import type { ToolPart } from '@opencode-ai/sdk/v2'
import { z } from 'zod'
import { ErrorCode } from '../../common/error-code'
import * as Identifier from '../../common/identifier'
import { getLogger } from '../../common/log'
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
// Tool Part Summary (for metadata display)
// ============================================================================

interface ToolPartSummary {
  id: string
  tool: string
  state: {
    status: string
    title?: string
  }
}

function summarizeToolPart(part: ToolPart): ToolPartSummary {
  return {
    id: part.id,
    tool: part.tool,
    state: {
      status: part.state.status,
      title:
        part.state.status === 'completed' ? (part.state as { title?: string }).title : undefined,
    },
  }
}

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
        const log = getLogger()
        const parts: Record<string, ToolPartSummary> = {}
        const startTime = Date.now()

        // Build augmented input with display fields for Task UI
        const augmentedInput = {
          message: args.message,
          session_id: args.session_id,
          subagent_type: 'planner',
          description: args.message.slice(0, 50) + (args.message.length > 50 ? '...' : ''),
        }

        // Fetch our tool part to get the partID for updates
        const msgResponse = await orca.client.session.message({
          sessionID: ctx.sessionID,
          messageID: ctx.messageID,
        })

        const ourPart = msgResponse.data?.parts.find(
          (p): p is ToolPart => p.type === 'tool' && p.callID === ctx.callID,
        )

        if (!ourPart) {
          log.warn('Could not find our tool part for streaming updates', { callID: ctx.callID })
        }

        let childSessionId: string | undefined

        const result = await orca.invoke(args, ctx, {
          onSessionCreated: async (id) => {
            childSessionId = id
            // Update with sessionId so Task card appears immediately
            if (ourPart) {
              await orca.client.part.update({
                sessionID: ctx.sessionID,
                messageID: ctx.messageID,
                partID: ourPart.id,
                directory: orca.directory,
                part: {
                  ...ourPart,
                  state: {
                    status: 'running',
                    input: augmentedInput,
                    title: 'Processing...',
                    metadata: { sessionId: childSessionId },
                    time: { start: startTime },
                  },
                },
              })
            }
          },
          onToolPartUpdated: async (part) => {
            if (!ourPart) return

            parts[part.id] = summarizeToolPart(part)
            const summary = Object.values(parts).sort((a, b) => a.id.localeCompare(b.id))

            await orca.client.part.update({
              sessionID: ctx.sessionID,
              messageID: ctx.messageID,
              partID: ourPart.id,
              directory: orca.directory,
              part: {
                ...ourPart,
                state: {
                  status: 'running',
                  input: augmentedInput,
                  title: 'Processing...',
                  metadata: { summary, sessionId: childSessionId },
                  time: { start: startTime },
                },
              },
            })
          },
        })

        const summary = Object.values(parts).sort((a, b) => a.id.localeCompare(b.id))

        return {
          title: formatTitle(result),
          metadata: {
            summary,
            sessionId: result.session_id,
            subagent_type: 'planner',
            description: args.message.slice(0, 50) + (args.message.length > 50 ? '...' : ''),
          },
          output: JSON.stringify(result),
        }
      },
    }),
})
