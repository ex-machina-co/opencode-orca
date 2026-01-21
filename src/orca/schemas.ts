import { z } from 'zod'
import * as Identifier from '../common/identifier'
import { Answer, Failure, Interruption } from '../common/response'
import { PlanReference } from './planning/schemas'

// ============================================================================
// Orca Orchestration Types (import * as Orca from './schemas')
//
// These are the entry point types for the orchestration system.
// The user sends an Orca.Request and receives an Orca.Response.
//
// Usage:
//   Orca.Request.parse(input)
//   Orca.Response.parse(output)
// ============================================================================

// Request to the orchestration system
export const Request = z.strictObject({
  message: z.string().min(1).describe('User message'),
  session_id: Identifier.schema('session').optional().describe('Continue existing session'),
})
export type Request = z.infer<typeof Request>

// Response from the orchestration system
export const Response = z.discriminatedUnion('type', [Answer, PlanReference, Failure, Interruption])
export type Response = z.infer<typeof Response>
