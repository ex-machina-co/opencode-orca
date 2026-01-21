import { z } from 'zod'
import { AgentId } from '../../common/agent-id'
import * as Identifier from '../../common/identifier'
import { Answer, Failure, Interruption } from '../../common/response'

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
// Plan (output from planner) - now just a reference, not full content
// ============================================================================

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
// Planner Response (used by OrcaService.invoke)
// ============================================================================

export const PlannerResponse = z.discriminatedUnion('type', [Answer, Plan, Failure, Interruption])
export type PlannerResponse = z.infer<typeof PlannerResponse>

// ============================================================================
// Stored Plan - Discriminated union by stage
//
// State machine (ADR-003 + ADR-004):
//   draft → proposal → approved
//                   → rejected
// ============================================================================

// Shared metadata fields
const PlanMetadataFields = {
  plan_id: Identifier.schema('plan'),
  planner_session_id: Identifier.schema('session', 'for context continuity'),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
}

// Complete plan content fields (strict - require non-empty arrays)
const PlanContentFields = {
  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  summary: z.string().optional().describe('Planner-provided summary'),
  steps: z.array(PlanStep).min(1).describe('Steps to execute'),
  assumptions: z.array(z.string()).min(1).describe('What we are assuming'),
  files_touched: z.array(z.string()).min(1).describe('Files that will be modified'),
  verification: z.array(z.string()).min(1).describe('How to confirm success'),
  risks: z.array(z.string()).min(1).describe('What could go wrong'),
}

// Draft plan content fields (loose - arrays can be empty)
const DraftPlanContentFields = {
  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  summary: z.string().optional().describe('Planner-provided summary'),
  steps: z.array(PlanStep).describe('Steps to execute'),
  assumptions: z.array(z.string()).describe('What we are assuming'),
  files_touched: z.array(z.string()).describe('Files that will be modified'),
  verification: z.array(z.string()).describe('How to confirm success'),
  risks: z.array(z.string()).describe('What could go wrong'),
}

// Draft - mutable, arrays can be empty
export const DraftPlan = z.strictObject({
  stage: z.literal('draft'),
  ...PlanMetadataFields,
  ...DraftPlanContentFields,
})
export type DraftPlan = z.infer<typeof DraftPlan>

// Proposal - complete, awaiting approval
export const ProposalPlan = z.strictObject({
  stage: z.literal('proposal'),
  ...PlanMetadataFields,
  ...PlanContentFields,
})
export type ProposalPlan = z.infer<typeof ProposalPlan>

// Approved - ready for execution
export const ApprovedPlan = z.strictObject({
  stage: z.literal('approved'),
  ...PlanMetadataFields,
  ...PlanContentFields,
})
export type ApprovedPlan = z.infer<typeof ApprovedPlan>

// Rejected - terminal state
export const RejectedPlan = z.strictObject({
  stage: z.literal('rejected'),
  rejection_reason: z.string().optional().describe('Why the user rejected the plan'),
  ...PlanMetadataFields,
  ...PlanContentFields,
})
export type RejectedPlan = z.infer<typeof RejectedPlan>

// All plan variants
const planVariants = [DraftPlan, ProposalPlan, ApprovedPlan, RejectedPlan] as const

// Union for reading from storage
export const StoredPlan = z.discriminatedUnion('stage', planVariants)
export type StoredPlan = z.infer<typeof StoredPlan>

// Derive stage enum from variants - single source of truth
export const PlanStage = z.enum(
  planVariants.map((v) => v.shape.stage.value) as [string, ...string[]],
)
export type PlanStage = z.infer<typeof PlanStage>

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
