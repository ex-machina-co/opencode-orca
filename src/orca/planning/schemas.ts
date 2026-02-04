import { z } from 'zod'
import { AgentId } from '../../common/agent'
import * as Identifier from '../../common/identifier'
import { Answer, Failure } from '../../common/response'

// ============================================================================
// Plan Step
// ============================================================================

export const PlanStep = z.strictObject({
  description: z.string().min(1).describe('What this step accomplishes'),
  agent: AgentId.describe('The specialist agent assigned to execute this step'),
  command: z.string().optional().describe('Suggested approach or command'),
  assumptions: z.array(z.string()).optional().describe('Step-specific assumptions'),
  risks: z.array(z.string()).optional().describe('Step-specific risks'),
  verification: z.array(z.string()).optional().describe('Step-specific verification'),
})
export type PlanStep = z.infer<typeof PlanStep>

// ============================================================================
// Plan Reference (output from planner) - just ID and stage, not full content
// ============================================================================

export const PlanReference = z.strictObject({
  type: z.literal('plan'),
  plan_id: Identifier.schema('plan'),
  stage: z.enum(['draft', 'proposal']),
})
export type PlanReference = z.infer<typeof PlanReference>

// ============================================================================
// Planner Response (used by OrcaService.invoke)
// ============================================================================

export const PlannerResponse = z.discriminatedUnion('type', [Answer, PlanReference, Failure])
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

// Draft plan content fields (loose - arrays can be empty, default to [])
const DraftPlanContentFields = {
  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  summary: z.string().optional().describe('Planner-provided summary'),
  steps: z.array(PlanStep).default([]).describe('Steps to execute'),
  assumptions: z.array(z.string()).default([]).describe('Plan-level assumptions'),
  verification: z.array(z.string()).default([]).describe('Plan-level verification criteria'),
  risks: z.array(z.string()).default([]).describe('Plan-level risks'),
}

// Complete plan content fields (strict - require non-empty arrays)
const PlanContentFields = {
  goal: DraftPlanContentFields.goal,
  summary: DraftPlanContentFields.summary,
  steps: DraftPlanContentFields.steps.unwrap().min(1),
  assumptions: DraftPlanContentFields.assumptions.unwrap().min(1),
  verification: DraftPlanContentFields.verification.unwrap().min(1),
  risks: DraftPlanContentFields.risks.unwrap().min(1),
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
export const PlanStage = z.enum(planVariants.map((v) => v.shape.stage.value) as [string, ...string[]])
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
  execution_count: z.number(),
})
export type PlanSummary = z.infer<typeof PlanSummary>
