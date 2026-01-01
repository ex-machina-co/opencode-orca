import { z } from 'zod'

/**
 * Error codes for agent communication failures
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_AGENT: 'UNKNOWN_AGENT',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  AGENT_ERROR: 'AGENT_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNKNOWN_AGENT',
  'SESSION_NOT_FOUND',
  'AGENT_ERROR',
  'TIMEOUT',
])

export type ErrorCode = z.infer<typeof ErrorCodeSchema>
