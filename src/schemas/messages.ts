import { z } from 'zod'
import { BaseEnvelopeSchema } from './common'
import {
  AnswerPayloadSchema,
  EscalationPayloadSchema,
  FailurePayloadSchema,
  InterruptPayloadSchema,
  PlanPayloadSchema,
  QuestionPayloadSchema,
  ResultPayloadSchema,
  TaskPayloadSchema,
  UserInputPayloadSchema,
} from './payloads'

/**
 * Task message - Orca assigns work to a specialist agent
 */
export const TaskMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('task'),
  payload: TaskPayloadSchema,
}).strict()

export type TaskMessage = z.infer<typeof TaskMessageSchema>

/**
 * Result message - Specialist returns completed work
 */
export const ResultMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('result'),
  payload: ResultPayloadSchema,
}).strict()

export type ResultMessage = z.infer<typeof ResultMessageSchema>

/**
 * Plan message - Strategist returns an execution plan
 */
export const PlanMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('plan'),
  payload: PlanPayloadSchema,
}).strict()

export type PlanMessage = z.infer<typeof PlanMessageSchema>

/**
 * Answer message - Response to a question
 */
export const AnswerMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('answer'),
  payload: AnswerPayloadSchema,
}).strict()

export type AnswerMessage = z.infer<typeof AnswerMessageSchema>

/**
 * Question message - Agent asks for clarification
 */
export const QuestionMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('question'),
  payload: QuestionPayloadSchema,
}).strict()

export type QuestionMessage = z.infer<typeof QuestionMessageSchema>

/**
 * Escalation message - Agent escalates to Orca for a decision
 */
export const EscalationMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('escalation'),
  payload: EscalationPayloadSchema,
}).strict()

export type EscalationMessage = z.infer<typeof EscalationMessageSchema>

/**
 * User input message - User provides input
 */
export const UserInputMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('user_input'),
  payload: UserInputPayloadSchema,
}).strict()

export type UserInputMessage = z.infer<typeof UserInputMessageSchema>

/**
 * Interrupt message - User interrupts execution
 */
export const InterruptMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('interrupt'),
  payload: InterruptPayloadSchema,
}).strict()

export type InterruptMessage = z.infer<typeof InterruptMessageSchema>

/**
 * Failure message - Agent reports a failure
 */
export const FailureMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('failure'),
  payload: FailurePayloadSchema,
}).strict()

export type FailureMessage = z.infer<typeof FailureMessageSchema>

/**
 * Message envelope - Discriminated union of all message types
 */
export const MessageEnvelopeSchema = z.discriminatedUnion('type', [
  TaskMessageSchema,
  ResultMessageSchema,
  PlanMessageSchema,
  AnswerMessageSchema,
  QuestionMessageSchema,
  EscalationMessageSchema,
  UserInputMessageSchema,
  InterruptMessageSchema,
  FailureMessageSchema,
])

export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>

/**
 * Message type literal union
 */
export type MessageType = MessageEnvelope['type']
