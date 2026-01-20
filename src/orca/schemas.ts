import { z } from 'zod'
import * as Identifier from '../common/identifier'
import { Answer, Failure, Interruption } from './dispatch/schemas'
import { PlanStep } from './planning/schemas'

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

// Plan response type (only returned at orchestration level, not from dispatch)
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

// Request to the orchestration system
export const Request = z.strictObject({
  message: z.string().min(1).describe('User message'),
  session_id: Identifier.schema('session').optional().describe('Continue existing session'),
})
export type Request = z.infer<typeof Request>

// Response from the orchestration system
export const Response = z.discriminatedUnion('type', [Answer, Plan, Failure, Interruption])
export type Response = z.infer<typeof Response>
