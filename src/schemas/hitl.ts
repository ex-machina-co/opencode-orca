import type { QuestionInfo, QuestionOption } from '@opencode-ai/sdk/v2'
import { z } from 'zod'

/**
 * Option for HITL questions - matches SDK's QuestionOption
 */
export const HITLOption = z.strictObject({
  label: z.string().min(1).describe('Display text (1-5 words, concise)'),
  description: z.string().describe('Explanation of choice'),
})
export type HITLOption = z.infer<typeof HITLOption>

/**
 * HITL question schema - matches SDK's QuestionInfo
 */
export const HITLQuestion = z.strictObject({
  header: z.string().min(1).max(30).describe('Very short label for tab header (max 30 chars)'),
  question: z.string().min(1).describe('Complete question text displayed to user'),
  options: z.array(HITLOption).describe('Available choices (can be empty for pure freeform)'),
  multiple: z.boolean().optional().describe('Allow selecting multiple choices'),
  custom: z.boolean().optional().describe('Allow typing a custom answer (default: true in SDK)'),
})
export type HITLQuestion = z.infer<typeof HITLQuestion>

/**
 * Agent-emitted question message - wrapper for when agents need clarification
 */
export const AgentQuestionMessage = z.strictObject({
  type: z.literal('question'),
  questions: z.array(HITLQuestion).min(1).describe('Questions to ask the user'),
})
export type AgentQuestionMessage = z.infer<typeof AgentQuestionMessage>

// ============================================================================
// Type alignment tests - compile-time only, no runtime cost
// These ensure our Zod schemas stay aligned with SDK types.
// If SDK changes, TypeScript will error here.
// ============================================================================

type AssertAssignable<T, U extends T> = U

// Forward: our types must be assignable to SDK types
type _OptionToSDK = AssertAssignable<QuestionOption, HITLOption>
type _QuestionToSDK = AssertAssignable<QuestionInfo, HITLQuestion>

// Reverse: SDK types must be assignable to our types
type _SDKToOption = AssertAssignable<HITLOption, QuestionOption>
type _SDKToQuestion = AssertAssignable<HITLQuestion, QuestionInfo>
