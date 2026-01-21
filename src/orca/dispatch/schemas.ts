import type { QuestionInfo, QuestionOption } from '@opencode-ai/sdk/v2'
import { z } from 'zod'
import { AgentId } from '../../common/agent'
import * as Identifier from '../../common/identifier'
import { Answer, Failure, Interruption, Success } from '../../common/response'
import type { AssertAssignable } from '../../common/types'

// ============================================================================
// HITL Schemas (aligned with OpenCode SDK)
// ============================================================================

export const HITLOption = z.strictObject({
  label: z.string().min(1).describe('Display text (1-5 words, concise)'),
  description: z.string().describe('Explanation of choice'),
})
export type HITLOption = z.infer<typeof HITLOption>

export const HITLQuestion = z.strictObject({
  header: z.string().min(1).max(30).describe('Very short label for tab header (max 30 chars)'),
  question: z.string().min(1).describe('Complete question text displayed to user'),
  options: z.array(HITLOption).describe('Available choices (can be empty for pure freeform)'),
  multiple: z.boolean().optional().describe('Allow selecting multiple choices'),
  custom: z.boolean().optional().describe('Allow typing a custom answer (default: true in SDK)'),
})
export type HITLQuestion = z.infer<typeof HITLQuestion>

// Compile-time alignment checks (no runtime cost)
type _OptionToSDK = AssertAssignable<QuestionOption, HITLOption>
type _QuestionToSDK = AssertAssignable<QuestionInfo, HITLQuestion>
type _SDKToOption = AssertAssignable<HITLOption, QuestionOption>
type _SDKToQuestion = AssertAssignable<HITLQuestion, QuestionInfo>

// ============================================================================
// Result Types (composed from building blocks)
// ============================================================================

export const TaskResult = z.discriminatedUnion('type', [Success, Failure, Interruption])
export type TaskResult = z.infer<typeof TaskResult>

export const AgentAnswer = z.discriminatedUnion('type', [Answer, Failure, Interruption])
export type AgentAnswer = z.infer<typeof AgentAnswer>

export const UserAnswer = z.strictObject({
  answers: z.array(z.array(z.string())).describe('Selected answers for each question'),
})
export type UserAnswer = z.infer<typeof UserAnswer>

// ============================================================================
// Dispatch Types (import * as Dispatch from './schemas')
//
// Usage:
//   Dispatch.schema.parse(input)         // any dispatch
//   Dispatch.Task.schema.parse(input)    // specific dispatch
//   Dispatch.Task.result.parse(response) // expected result
// ============================================================================

export const Task = {
  schema: z.strictObject({
    type: z.literal('task'),
    agent: AgentId,
    description: z.string().min(1).describe('What this step should accomplish'),
    command: z.string().optional().describe('Suggested approach'),
    session_id: Identifier.schema('session')
      .optional()
      .describe('Continue existing conversation with target agent'),
  }),
  result: TaskResult,
}
export type Task = z.infer<typeof Task.schema>

export const UserQuestion = {
  schema: z.strictObject({
    type: z.literal('user_question'),
    questions: z.array(HITLQuestion).min(1).describe('Questions to ask the user'),
  }),
  result: UserAnswer,
}
export type UserQuestion = z.infer<typeof UserQuestion.schema>

export const AgentQuestion = {
  schema: z.strictObject({
    type: z.literal('agent_question'),
    agent: AgentId.describe('Target agent to ask'),
    question: z.string().min(1).describe('The question to ask'),
    session_id: Identifier.schema('session')
      .optional()
      .describe('Continue existing conversation with target agent'),
  }),
  result: AgentAnswer,
}
export type AgentQuestion = z.infer<typeof AgentQuestion.schema>

// Union of all dispatch types
export const schema = z.discriminatedUnion('type', [
  Task.schema,
  UserQuestion.schema,
  AgentQuestion.schema,
])
export type Any = z.infer<typeof schema>

// Type helper for getting result type from dispatch type
export type ResultFor<T extends Any> = T extends Task
  ? TaskResult
  : T extends UserQuestion
    ? UserAnswer
    : T extends AgentQuestion
      ? AgentAnswer
      : never
