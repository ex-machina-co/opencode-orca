import { z } from 'zod'
import { AgentId } from '../../common/agent-id'
import Identifier from '../../common/identifier'

// ============================================================================
// Plan Step
// ============================================================================

export const PlanStep = z.strictObject({
  description: z.string().min(1).describe('What this step accomplishes'),
  agent: AgentId.describe('The specialist agent assigned to execute this step'),
  command: z.string().optional().describe('Suggested approach or command'),
})
export type PlanStep = z.infer<typeof PlanStep>

// ============================================================================
// Plan Status - Discriminated Union
//
// State machine:
//   proposal ⟲ (revise) → approved
//                       ↓
//                    rejected
// ============================================================================

export const ProposalStatus = z.strictObject({
  stage: z.literal('proposal'),
  updated_at: z.iso.datetime(),
})
export type ProposalStatus = z.infer<typeof ProposalStatus>

export const ApprovedStatus = z.strictObject({
  stage: z.literal('approved'),
  updated_at: z.iso.datetime(),
})
export type ApprovedStatus = z.infer<typeof ApprovedStatus>

export const RejectedStatus = z.strictObject({
  stage: z.literal('rejected'),
  reason: z.string().optional().describe('Why the user rejected the plan'),
  updated_at: z.iso.datetime(),
})
export type RejectedStatus = z.infer<typeof RejectedStatus>

const planStatusOptions = [ProposalStatus, ApprovedStatus, RejectedStatus] as const

export const PlanStatus = z.discriminatedUnion('stage', planStatusOptions)
export type PlanStatus = z.infer<typeof PlanStatus>

export const PlanStage = z.enum(
  planStatusOptions.map((s) => s.shape.stage.value) as [string, ...string[]],
)
export type PlanStage = z.infer<typeof PlanStage>

// ============================================================================
// Stored Plan - Pure plan definition, no execution state
// ============================================================================

export const StoredPlan = z.strictObject({
  plan_id: Identifier.schema('plan'),
  planner_session_id: Identifier.schema('session', 'for context continuity'),
  created_at: z.iso.datetime(),

  status: PlanStatus,

  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  summary: z.string().optional().describe('Planner-provided summary'),
  steps: z.array(PlanStep).min(1).describe('Steps to execute'),
  assumptions: z.array(z.string()).min(1).describe('What we are assuming'),
  files_touched: z.array(z.string()).min(1).describe('Files that will be modified'),
  verification: z.array(z.string()).min(1).describe('How to confirm success'),
  risks: z.array(z.string()).min(1).describe('What could go wrong'),
})
export type StoredPlan = z.infer<typeof StoredPlan>

// ============================================================================
// Plan Summary - For listing
// ============================================================================

export const PlanSummary = z.strictObject({
  plan_id: z.string(),
  goal: z.string(),
  stage: PlanStage,
  created_at: z.string(),
  step_count: z.number(),
  has_executions: z.boolean(),
})
export type PlanSummary = z.infer<typeof PlanSummary>
