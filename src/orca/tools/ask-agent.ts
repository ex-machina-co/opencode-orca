import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import { AgentId } from '../../common/agent'
import type { DispatchService } from '../dispatch/service'
import { defineTool } from './common'

export const AskAgentInput = z.strictObject({
  agent: AgentId.describe('Specialist to ask (e.g., researcher, architect)'),
  question: z.string().min(1).describe('The question to ask'),
  session_id: z.string().optional().describe('Continue existing conversation with this agent'),
})
export type AskAgentInput = z.infer<typeof AskAgentInput>

export const AskAgent = defineTool({
  name: 'ask-agent',
  agents: ['planner'],
  create: (dispatchService: DispatchService) =>
    tool({
      description:
        'Ask a specialist agent a technical question about the codebase or implementation.',
      args: AskAgentInput.shape,
      async execute(args, ctx) {
        const { result, sessionId } = await dispatchService.dispatchQuestion(ctx, {
          type: 'agent_question',
          agent: args.agent,
          question: args.question,
          session_id: args.session_id,
        })

        return {
          title: `Answer from ${args.agent}`,
          metadata: { agent: args.agent, sessionId },
          output: JSON.stringify({ ...result, session_id: sessionId }),
        }
      },
    }),
})
