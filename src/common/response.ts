import { z } from 'zod'
import { ErrorCode } from './error-code'

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
// Response Variants (primitives for discriminated unions)
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
