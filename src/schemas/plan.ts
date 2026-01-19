import { z } from 'zod'
import { AgentId, SessionId } from './common'

// ============================================================================
// Step Schemas
// ============================================================================

/**
 * A step in a stored plan - includes agent assignment
 */
export const StoredPlanStep = z.strictObject({
  description: z.string().min(1).describe('What this step accomplishes'),
  agent: AgentId.describe('The specialist agent assigned to execute this step'),
  command: z.string().optional().describe('Suggested approach or command'),
})
export type StoredPlanStep = z.infer<typeof StoredPlanStep>

/**
 * Output captured from a completed step
 */
export const StepOutput = z.strictObject({
  summary: z.string().min(1).describe('Brief description of what was accomplished'),
  artifacts: z.array(z.string()).describe('Files created or modified'),
  key_findings: z
    .array(z.string())
    .optional()
    .describe('Important discoveries (for research steps)'),
  verification: z.array(z.string()).optional().describe('Verification steps performed'),
  raw_response: z.string().describe('Full response text for debugging'),
})
export type StepOutput = z.infer<typeof StepOutput>

/**
 * Context from a previous failed attempt (for retries)
 */
export const PreviousAttempt = z.strictObject({
  error: z.string().describe('Error message from the failed attempt'),
  cause: z.string().optional().describe('Root cause if known'),
  user_guidance: z.string().optional().describe('User-provided guidance for retry'),
})
export type PreviousAttempt = z.infer<typeof PreviousAttempt>

/**
 * Summary of a previous step (for context threading)
 */
export const PreviousStepSummary = z.strictObject({
  step_index: z.number().int().nonnegative(),
  agent: AgentId,
  description: z.string(),
  summary: z.string().describe('Brief summary of what was accomplished'),
  artifacts: z.array(z.string()).describe('Files created/modified'),
  key_findings: z.array(z.string()).optional().describe('Important discoveries'),
})
export type PreviousStepSummary = z.infer<typeof PreviousStepSummary>

/**
 * Context provided to a step - what flows in from previous steps
 */
export const StepContext = z.strictObject({
  plan_id: z.string().describe('Plan reference for orca_describe_plan lookups'),
  plan_goal: z.string().describe('Overall plan objective'),
  step_index: z.number().int().nonnegative().describe('Current step (0-based)'),
  total_steps: z.number().int().positive().describe('Total steps in plan'),
  previous_steps: z.array(PreviousStepSummary).describe('Summaries from completed steps'),
  relevant_files: z.array(z.string()).describe('Files relevant to this plan'),
  previous_attempt: PreviousAttempt.optional().describe(
    'Context from failed attempt (for retries)',
  ),
})
export type StepContext = z.infer<typeof StepContext>

// ============================================================================
// Step Result - Discriminated Union (make invalid states unrepresentable)
// ============================================================================

const StepResultBase = z.strictObject({
  step_index: z.number().int().nonnegative(),
})

export const PendingStepResult = StepResultBase.extend({
  status: z.literal('pending'),
})
export type PendingStepResult = z.infer<typeof PendingStepResult>

export const InProgressStepResult = StepResultBase.extend({
  status: z.literal('in_progress'),
  agent_session_id: SessionId.optional().describe('Session ID for the executing agent'),
  started_at: z.string().datetime(),
  retry_count: z.number().int().nonnegative().default(0),
  input_context: StepContext.optional().describe('Context provided to this step'),
})
export type InProgressStepResult = z.infer<typeof InProgressStepResult>

export const CompletedStepResult = StepResultBase.extend({
  status: z.literal('completed'),
  agent_session_id: SessionId.optional(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  retry_count: z.number().int().nonnegative().default(0),
  input_context: StepContext.optional(),
  output: StepOutput,
})
export type CompletedStepResult = z.infer<typeof CompletedStepResult>

export const FailedStepResult = StepResultBase.extend({
  status: z.literal('failed'),
  agent_session_id: SessionId.optional(),
  started_at: z.string().datetime(),
  failed_at: z.string().datetime(),
  retry_count: z.number().int().nonnegative().default(0),
  input_context: StepContext.optional(),
  error: z.string().describe('Error message'),
})
export type FailedStepResult = z.infer<typeof FailedStepResult>

export const StepResult = z.discriminatedUnion('status', [
  PendingStepResult,
  InProgressStepResult,
  CompletedStepResult,
  FailedStepResult,
])
export type StepResult = z.infer<typeof StepResult>

// ============================================================================
// Plan Status - Discriminated Union (state machine)
// ============================================================================

export const DraftingStatus = z.strictObject({
  stage: z.literal('drafting'),
  updated_at: z.string().datetime(),
})
export type DraftingStatus = z.infer<typeof DraftingStatus>

export const PendingApprovalStatus = z.strictObject({
  stage: z.literal('pending_approval'),
  updated_at: z.string().datetime(),
})
export type PendingApprovalStatus = z.infer<typeof PendingApprovalStatus>

export const ChangesRequestedStatus = z.strictObject({
  stage: z.literal('changes_requested'),
  changes: z.string().describe('What the user wants changed'),
  updated_at: z.string().datetime(),
})
export type ChangesRequestedStatus = z.infer<typeof ChangesRequestedStatus>

export const ApprovedStatus = z.strictObject({
  stage: z.literal('approved'),
  updated_at: z.string().datetime(),
})
export type ApprovedStatus = z.infer<typeof ApprovedStatus>

export const InProgressStatus = z.strictObject({
  stage: z.literal('in_progress'),
  updated_at: z.string().datetime(),
})
export type InProgressStatus = z.infer<typeof InProgressStatus>

export const CompletedStatus = z.strictObject({
  stage: z.literal('completed'),
  updated_at: z.string().datetime(),
})
export type CompletedStatus = z.infer<typeof CompletedStatus>

export const FailedStatus = z.strictObject({
  stage: z.literal('failed'),
  error: z.string(),
  failed_step: z.number().int().nonnegative(),
  user_stop_reason: z.string().optional().describe('User context when they chose to stop'),
  updated_at: z.string().datetime(),
})
export type FailedStatus = z.infer<typeof FailedStatus>

export const RejectedStatus = z.strictObject({
  stage: z.literal('rejected'),
  reason: z.string().optional().describe('Why the user rejected the plan'),
  updated_at: z.string().datetime(),
})
export type RejectedStatus = z.infer<typeof RejectedStatus>

export const PlanStatus = z.discriminatedUnion('stage', [
  DraftingStatus,
  PendingApprovalStatus,
  ChangesRequestedStatus,
  ApprovedStatus,
  InProgressStatus,
  CompletedStatus,
  FailedStatus,
  RejectedStatus,
])
export type PlanStatus = z.infer<typeof PlanStatus>

/** All possible plan status stages */
export const PlanStage = z.enum([
  'drafting',
  'pending_approval',
  'changes_requested',
  'approved',
  'in_progress',
  'completed',
  'failed',
  'rejected',
])
export type PlanStage = z.infer<typeof PlanStage>

// ============================================================================
// Stored Plan - Full plan structure persisted to disk
// ============================================================================

export const StoredPlan = z.strictObject({
  // Identity & Provenance
  plan_id: z.string().describe('Unique plan identifier (pln_xxx format)'),
  planner_session_id: SessionId.describe('Planner session for context continuity'),
  created_at: z.string().datetime(),

  // Status (state machine)
  status: PlanStatus,

  // Plan Content (may be partial during drafting)
  goal: z.string().min(1).describe('Clear statement of what we are achieving'),
  summary: z.string().optional().describe('Planner-provided summary'),
  steps: z.array(StoredPlanStep).describe('Steps to execute (empty during drafting)'),
  assumptions: z.array(z.string()).describe('What we are assuming'),
  files_touched: z.array(z.string()).describe('Files that will be modified'),
  verification: z.array(z.string()).describe('How to confirm success'),
  risks: z.array(z.string()).describe('What could go wrong'),

  // Execution State
  step_results: z.array(StepResult).describe('Per-step execution records'),
})
export type StoredPlan = z.infer<typeof StoredPlan>
