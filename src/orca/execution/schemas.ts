import { z } from 'zod'
import { AgentId } from '../../common/agent'
import * as Identifier from '../../common/identifier'

// ============================================================================
// Task Context - What flows into a task
// ============================================================================

export const PreviousTaskSummary = z.strictObject({
  step_index: z.number().int().nonnegative(),
  agent: AgentId,
  description: z.string(),
  summary: z.string().describe('Brief summary of what was accomplished'),
  artifacts: z.array(z.string()).describe('Files created/modified'),
  key_findings: z.array(z.string()).optional().describe('Important discoveries'),
})
export type PreviousTaskSummary = z.infer<typeof PreviousTaskSummary>

export const PreviousAttempt = z.strictObject({
  error: z.string().describe('Error message from the failed attempt'),
  cause: z.string().optional().describe('Root cause if known'),
  user_guidance: z.string().optional().describe('User-provided guidance for retry'),
})
export type PreviousAttempt = z.infer<typeof PreviousAttempt>

export const TaskContext = z.strictObject({
  plan_id: Identifier.schema('plan'),
  plan_goal: z.string().describe('Overall plan objective'),
  step_index: z.number().int().nonnegative().describe('Current step (0-based)'),
  total_steps: z.number().int().positive().describe('Total steps in plan'),
  relevant_files: z.array(z.string()).describe('Files relevant to this plan'),
  previous_tasks: z.array(PreviousTaskSummary).default([]).describe('Context from previously completed tasks'),
  previous_attempts: z
    .array(PreviousAttempt)
    .default([])
    .describe('Context from failed attempts at this task (indicates retry)'),
})
export type TaskContext = z.infer<typeof TaskContext>

// ============================================================================
// Task Output - What a completed task produces
// ============================================================================

export const TaskOutput = z.strictObject({
  summary: z.string().min(1).describe('Brief description of what was accomplished'),
  artifacts: z.array(z.string()).describe('Files created or modified'),
  key_findings: z.array(z.string()).optional().describe('Important discoveries (for research tasks)'),
  verification: z.array(z.string()).optional().describe('Verification steps performed'),
  raw_response: z.string().describe('Full response text for debugging'),
})
export type TaskOutput = z.infer<typeof TaskOutput>

// ============================================================================
// Task Record - Discriminated union (make invalid states unrepresentable)
// ============================================================================

const TaskRecordBase = z.strictObject({
  step_index: z.number().int().nonnegative(),
})

export const PendingTask = TaskRecordBase.extend({
  status: z.literal('pending'),
})
export type PendingTask = z.infer<typeof PendingTask>

export const RunningTask = TaskRecordBase.extend({
  status: z.literal('running'),
  agent_session_id: Identifier.schema('session').optional(),
  started_at: z.iso.datetime(),
  context: TaskContext,
  retry_count: z.number().int().nonnegative().default(0),
})
export type RunningTask = z.infer<typeof RunningTask>

export const CompletedTask = TaskRecordBase.extend({
  status: z.literal('completed'),
  agent_session_id: Identifier.schema('session').optional(),
  started_at: z.iso.datetime(),
  completed_at: z.iso.datetime(),
  context: TaskContext,
  output: TaskOutput,
  retry_count: z.number().int().nonnegative().default(0),
})
export type CompletedTask = z.infer<typeof CompletedTask>

export const FailedTask = TaskRecordBase.extend({
  status: z.literal('failed'),
  agent_session_id: Identifier.schema('session').optional(),
  started_at: z.iso.datetime(),
  failed_at: z.iso.datetime(),
  context: TaskContext,
  error: z.string(),
  retry_count: z.number().int().nonnegative().default(0),
})
export type FailedTask = z.infer<typeof FailedTask>

const taskRecordOptions = [PendingTask, RunningTask, CompletedTask, FailedTask] as const

export const TaskRecord = z.discriminatedUnion('status', taskRecordOptions)
export type TaskRecord = z.infer<typeof TaskRecord>

export const TaskStatus = z.enum(taskRecordOptions.map((t) => t.shape.status.value) as [string, ...string[]])
export type TaskStatus = z.infer<typeof TaskStatus>

// ============================================================================
// Execution Status - Discriminated union
// ============================================================================

export const PendingExecution = z.strictObject({
  stage: z.literal('pending'),
  updated_at: z.iso.datetime(),
})
export type PendingExecution = z.infer<typeof PendingExecution>

export const RunningExecution = z.strictObject({
  stage: z.literal('running'),
  updated_at: z.iso.datetime(),
})
export type RunningExecution = z.infer<typeof RunningExecution>

export const CompletedExecution = z.strictObject({
  stage: z.literal('completed'),
  updated_at: z.iso.datetime(),
})
export type CompletedExecution = z.infer<typeof CompletedExecution>

export const FailedExecution = z.strictObject({
  stage: z.literal('failed'),
  error: z.string(),
  failed_step: z.number().int().nonnegative(),
  user_stop_reason: z.string().optional().describe('User context when they chose to stop'),
  updated_at: z.iso.datetime(),
})
export type FailedExecution = z.infer<typeof FailedExecution>

export const StoppedExecution = z.strictObject({
  stage: z.literal('stopped'),
  reason: z.string(),
  updated_at: z.iso.datetime(),
})
export type StoppedExecution = z.infer<typeof StoppedExecution>

const executionStatusOptions = [
  PendingExecution,
  RunningExecution,
  CompletedExecution,
  FailedExecution,
  StoppedExecution,
] as const

export const ExecutionStatus = z.discriminatedUnion('stage', executionStatusOptions)
export type ExecutionStatus = z.infer<typeof ExecutionStatus>

export const ExecutionStage = z.enum(executionStatusOptions.map((s) => s.shape.stage.value) as [string, ...string[]])
export type ExecutionStage = z.infer<typeof ExecutionStage>

// ============================================================================
// Plan Execution - Runtime record of executing a plan
// ============================================================================

export const PlanExecution = z.strictObject({
  execution_id: Identifier.schema('exec'),
  plan_id: Identifier.schema('plan'),
  created_at: z.iso.datetime(),
  status: ExecutionStatus,
  tasks: z.array(TaskRecord).describe('Execution state for each plan step'),
})
export type PlanExecution = z.infer<typeof PlanExecution>

// ============================================================================
// Execution Summary - For listing
// ============================================================================

export const ExecutionSummary = z.strictObject({
  execution_id: z.string(),
  plan_id: z.string(),
  stage: ExecutionStage,
  created_at: z.string(),
  tasks_completed: z.number(),
  tasks_total: z.number(),
})
export type ExecutionSummary = z.infer<typeof ExecutionSummary>
