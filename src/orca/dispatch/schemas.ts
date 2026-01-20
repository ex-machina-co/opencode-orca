import type { QuestionInfo, QuestionOption } from '@opencode-ai/sdk/v2'
import { z } from 'zod'
import { AgentId } from '../../common/agent-id'
import { ErrorCode } from '../../common/error-code'
import Identifier from '../../common/identifier'
import type { AssertAssignable } from '../../common/types'
import { PlanStep } from '../planning/schemas'

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
// Supporting Types
// ============================================================================

export const Source = z.strictObject({
  type: z.enum(['file', 'url', 'artifact']),
  ref: z.string(),
  title: z.string().optional(),
  excerpt: z.string().optional(),
})
export type Source = z.infer<typeof Source>

export const Annotation = z.strictObject({
  type: z.enum(['note', 'warning', 'assumption', 'caveat']),
  content: z.string(),
})
export type Annotation = z.infer<typeof Annotation>

// ============================================================================
// Response Variants (building blocks for discriminated unions)
// ============================================================================

export const Answer = z.strictObject({
  type: z.literal('answer'),
  content: z.string(),
  sources: z.array(Source).optional(),
  annotations: z.array(Annotation).optional(),
})
export type Answer = z.infer<typeof Answer>

export const Success = z.strictObject({
  type: z.literal('success'),
  summary: z.string().min(1).describe('Brief description of what was accomplished'),
  artifacts: z.array(z.string()).optional().describe('Files created or modified'),
  verification: z.array(z.string()).optional().describe('Verification steps performed'),
  notes: z.array(z.string()).optional().describe('Additional context or caveats'),
})
export type Success = z.infer<typeof Success>

export const Failure = z.strictObject({
  type: z.literal('failure'),
  code: ErrorCode,
  message: z.string().min(1),
  cause: z.string().optional(),
})
export type Failure = z.infer<typeof Failure>

export const Interruption = z.strictObject({
  type: z.literal('interruption'),
  reason: z.string().min(1),
})
export type Interruption = z.infer<typeof Interruption>

export const Plan = z.strictObject({
  type: z.literal('plan'),
  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  steps: z.array(PlanStep).min(1).describe('Steps to execute'),
  assumptions: z.array(z.string()).min(1).describe('What we are assuming'),
  files_touched: z.array(z.string()).min(1).describe('Files that will be modified'),
  verification: z.array(z.string()).min(1).describe('How to confirm success'),
  risks: z.array(z.string()).min(1).describe('What could go wrong'),
})
export type Plan = z.infer<typeof Plan>

// ============================================================================
// Orca <-> Planner (exclusive channel)
// ============================================================================

export const OrcaDispatch = z.strictObject({
  message: z.string().min(1).describe('User message to the planner'),
  plan_id: Identifier.schema('plan').optional().describe('Continue working on existing plan'),
})
export type OrcaDispatch = z.infer<typeof OrcaDispatch>

export const OrcaResponse = z.discriminatedUnion('type', [Answer, Plan, Failure, Interruption])
export type OrcaResponse = z.infer<typeof OrcaResponse>

// ============================================================================
// Agent <-> Agent (questions)
// ============================================================================

export const AgentQuestion = z.strictObject({
  agent_id: AgentId.describe('Target agent to ask'),
  session_id: Identifier.schema('session').optional().describe('Continue existing conversation'),
  question: z.string().min(1).describe('The question to ask'),
})
export type AgentQuestion = z.infer<typeof AgentQuestion>

export const AgentAnswer = z.discriminatedUnion('type', [Answer, Failure, Interruption])
export type AgentAnswer = z.infer<typeof AgentAnswer>

// ============================================================================
// Agent <-> User (HITL)
// ============================================================================

export const UserQuestion = z.strictObject({
  questions: z.array(HITLQuestion).min(1).describe('Questions to ask the user'),
})
export type UserQuestion = z.infer<typeof UserQuestion>

export const UserAnswer = z.strictObject({
  answers: z.array(z.array(z.string())).describe('Selected answers for each question'),
})
export type UserAnswer = z.infer<typeof UserAnswer>

// ============================================================================
// Task Dispatch (plan step execution)
// ============================================================================

export const TaskDispatch = z.strictObject({
  plan_id: Identifier.schema('plan'),
  step_index: z.number().int().nonnegative(),
  description: z.string().min(1).describe('What this step should accomplish'),
  command: z.string().optional().describe('Suggested approach'),
})
export type TaskDispatch = z.infer<typeof TaskDispatch>

export const TaskResponse = z.discriminatedUnion('type', [Success, Failure, Interruption])
export type TaskResponse = z.infer<typeof TaskResponse>
