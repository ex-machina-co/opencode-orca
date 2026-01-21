import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import { HITLQuestion, UserAnswer } from '../dispatch/schemas'
import type { HITLService } from '../hitl/service'
import { defineTool } from './common'

export const AskUserInput = z.strictObject({
  questions: z.array(HITLQuestion).min(1).describe('Questions to ask the user'),
})
export type AskUserInput = z.infer<typeof AskUserInput>

export const AskUserOutput = z.strictObject({
  answered: z.boolean().describe('Whether the user answered (false if rejected/timeout)'),
  answers: UserAnswer.shape.answers
    .optional()
    .describe('User answers - array per question, each containing selected options'),
})
export type AskUserOutput = z.infer<typeof AskUserOutput>

export const AskUser = defineTool({
  name: 'ask-user',
  agents: ['planner'],
  create: (hitlService: HITLService) =>
    tool({
      description:
        'Ask the user clarifying questions about requirements, preferences, or domain knowledge.',
      args: AskUserInput.shape,
      async execute(args, ctx) {
        const result = await hitlService.askUser(ctx.sessionID, args.questions)

        if (!result) {
          const output: AskUserOutput = { answered: false }
          return {
            title: 'User did not answer',
            metadata: { sessionId: ctx.sessionID },
            output: JSON.stringify(output),
          }
        }

        const output: AskUserOutput = { answered: true, answers: result.answers }
        return {
          title: 'User answered',
          metadata: { sessionId: ctx.sessionID, questionCount: args.questions.length },
          output: JSON.stringify(output),
        }
      },
    }),
})
