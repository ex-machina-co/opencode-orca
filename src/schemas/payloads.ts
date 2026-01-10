import { z } from 'zod'
import { AgentIdSchema, SessionIdSchema } from './common'
import { ErrorCodeSchema } from './errors'

/**
 * Plan context for tracking approval state within a plan
 */
export const PlanContextSchema = z.strictObject({
  goal: z.string().min(1).describe('The overall plan objective'),
  step_index: z.number().int().nonnegative().describe('Current step number (0-based)'),
  approved_remaining: z
    .boolean()
    .describe('If true, skip checkpoints for remaining steps in this plan'),
})

export type PlanContext = z.infer<typeof PlanContextSchema>

/**
 * Task fields - Fields for task messages (merged into TaskMessageSchema)
 */
export const TaskFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema,
  prompt: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  parent_session_id: SessionIdSchema.optional(),
  plan_context: PlanContextSchema.optional(),
})

export type TaskFields = z.infer<typeof TaskFieldsSchema>

/**
 * Plan step schema
 */
export const PlanStepSchema = z.strictObject({
  description: z.string().min(1),
  command: z.string().optional(),
})

export type PlanStep = z.infer<typeof PlanStepSchema>

/**
 * Plan fields - Fields for plan messages (merged into PlanMessageSchema)
 *
 * Field descriptions are used to generate the planner prompt,
 * ensuring documentation stays in sync with the schema.
 */
export const PlanFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema,
  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  steps: z.array(PlanStepSchema).min(1).describe('Numbered steps with specific actions'),
  assumptions: z.array(z.string()).min(1).describe('What we are assuming or need to clarify'),
  files_touched: z.array(z.string()).min(1).describe('List of files that will be modified'),
  verification: z
    .array(z.string())
    .min(1)
    .describe('How to confirm success - commands, tests, or checks to run'),
  risks: z.array(z.string()).min(1).describe('What could go wrong and how to recover/rollback'),
})

export type PlanFields = z.infer<typeof PlanFieldsSchema>

/**
 * Source schema - Reference to where information came from
 */
export const SourceSchema = z.strictObject({
  type: z.enum(['file', 'url', 'artifact']),
  ref: z.string(),
  title: z.string().optional(),
  excerpt: z.string().optional(),
})

export type Source = z.infer<typeof SourceSchema>

/**
 * Annotation schema - Meta-commentary on the response
 */
export const AnnotationSchema = z.strictObject({
  type: z.enum(['note', 'warning', 'assumption', 'caveat']),
  content: z.string(),
})

export type Annotation = z.infer<typeof AnnotationSchema>

/**
 * Answer fields - Fields for answer messages (merged into AnswerMessageSchema)
 */
export const AnswerFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema,
  content: z.string(),
  sources: z.array(SourceSchema).optional(),
  annotations: z.array(AnnotationSchema).optional(),
})

export type AnswerFields = z.infer<typeof AnswerFieldsSchema>

/**
 * Question fields - Fields for question messages (merged into QuestionMessageSchema)
 */
export const QuestionFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema,
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  blocking: z.boolean(),
})

export type QuestionFields = z.infer<typeof QuestionFieldsSchema>

/**
 * Interrupt fields - Fields for interrupt messages (merged into InterruptMessageSchema)
 */
export const InterruptFieldsSchema = z.strictObject({
  reason: z.string().min(1),
  agent_id: AgentIdSchema.optional(),
})

export type InterruptFields = z.infer<typeof InterruptFieldsSchema>

/**
 * Failure fields - Fields for failure messages (merged into FailureMessageSchema)
 */
export const FailureFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema.optional(),
  code: ErrorCodeSchema,
  message: z.string().min(1),
  cause: z.string().optional(),
})

export type FailureFields = z.infer<typeof FailureFieldsSchema>

/**
 * Checkpoint fields - Fields for checkpoint messages (merged into CheckpointMessageSchema)
 */
export const CheckpointFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema,
  prompt: z.string().min(1),
  step_index: z.number().int().nonnegative().optional(),
  plan_goal: z.string().optional(),
})

export type CheckpointFields = z.infer<typeof CheckpointFieldsSchema>

/**
 * Success fields - Fields for success messages (merged into SuccessMessageSchema)
 *
 * Used by execution specialists (coder, tester, document-writer) to report
 * successful completion of a task with details of what was done.
 */
export const SuccessFieldsSchema = z.strictObject({
  agent_id: AgentIdSchema,
  summary: z.string().min(1).describe('Brief description of what was completed'),
  artifacts: z.array(z.string()).optional().describe('Files created or modified'),
  verification: z.array(z.string()).optional().describe('Verification steps performed'),
  notes: z.array(z.string()).optional().describe('Additional context or caveats'),
})

export type SuccessFields = z.infer<typeof SuccessFieldsSchema>
