import { z } from 'zod'
import { BaseEnvelopeSchema, ResponseEnvelopeSchema } from './common'
import {
  AnswerFieldsSchema,
  CheckpointFieldsSchema,
  FailureFieldsSchema,
  InterruptFieldsSchema,
  PlanFieldsSchema,
  QuestionFieldsSchema,
  SuccessFieldsSchema,
  TaskFieldsSchema,
} from './payloads'

/**
 * Task message - Orca assigns work to a specialist agent
 * Flattened: envelope fields + task fields at top level
 */
export const TaskMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('task'),
}).merge(TaskFieldsSchema)

export type TaskMessage = z.infer<typeof TaskMessageSchema>

/**
 * Plan message - Planner returns an execution plan
 * Flattened: envelope fields + plan fields at top level
 */
export const PlanMessageSchema = ResponseEnvelopeSchema.extend({
  type: z.literal('plan'),
}).merge(PlanFieldsSchema)

export type PlanMessage = z.infer<typeof PlanMessageSchema>

/**
 * Answer message - Agent response with optional sources and annotations
 * Flattened: envelope fields + answer fields at top level
 */
export const AnswerMessageSchema = ResponseEnvelopeSchema.extend({
  type: z.literal('answer'),
}).merge(AnswerFieldsSchema)

export type AnswerMessage = z.infer<typeof AnswerMessageSchema>

/**
 * Question message - Agent asks for clarification
 * Flattened: envelope fields + question fields at top level
 */
export const QuestionMessageSchema = ResponseEnvelopeSchema.extend({
  type: z.literal('question'),
}).merge(QuestionFieldsSchema)

export type QuestionMessage = z.infer<typeof QuestionMessageSchema>

/**
 * Interrupt message - User interrupts execution
 * Flattened: envelope fields + interrupt fields at top level
 */
export const InterruptMessageSchema = BaseEnvelopeSchema.extend({
  type: z.literal('interrupt'),
}).merge(InterruptFieldsSchema)

export type InterruptMessage = z.infer<typeof InterruptMessageSchema>

/**
 * Failure message - Agent reports a failure
 * Flattened: envelope fields + failure fields at top level
 */
export const FailureMessageSchema = ResponseEnvelopeSchema.extend({
  type: z.literal('failure'),
}).merge(FailureFieldsSchema)

export type FailureMessage = z.infer<typeof FailureMessageSchema>

/**
 * Checkpoint message - Supervision checkpoint requiring user approval
 * Flattened: envelope fields + checkpoint fields at top level
 */
export const CheckpointMessageSchema = ResponseEnvelopeSchema.extend({
  type: z.literal('checkpoint'),
}).merge(CheckpointFieldsSchema)

export type CheckpointMessage = z.infer<typeof CheckpointMessageSchema>

/**
 * Success message - Task completed successfully
 * Flattened: envelope fields + success fields at top level
 */
export const SuccessMessageSchema = ResponseEnvelopeSchema.extend({
  type: z.literal('success'),
}).merge(SuccessFieldsSchema)

export type SuccessMessage = z.infer<typeof SuccessMessageSchema>

/**
 * Message envelope - Discriminated union of all message types
 */
export const MessageEnvelopeSchema = z.discriminatedUnion('type', [
  QuestionMessageSchema,
  AnswerMessageSchema,
  SuccessMessageSchema,
  PlanMessageSchema,
  TaskMessageSchema,
  CheckpointMessageSchema,
  FailureMessageSchema,
  InterruptMessageSchema,
])

export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>

/**
 * Message type literal union
 */
export type MessageType = MessageEnvelope['type']
