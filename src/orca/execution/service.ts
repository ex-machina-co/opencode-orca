import * as Identifier from '../../common/identifier'
import type { PlanStep } from '../planning/schemas'
import { PlanningService } from '../planning/service'
import {
  type CompletedTask,
  type ExecutionSummary,
  type FailedTask,
  type PlanExecution,
  PlanExecution as PlanExecutionSchema,
  type RunningTask,
  type TaskContext,
  type TaskOutput,
  type TaskRecord,
} from './schemas'
import { getLatestExecutionId, listExecutionIds, readExecution, writeExecution } from './storage'

export type TaskWithDefinition = {
  record: TaskRecord
  definition: PlanStep
}

export class ExecutionService {
  private planningService: PlanningService

  constructor(
    private workingDir: string,
    private planId: string,
    planningService?: PlanningService,
  ) {
    this.planningService = planningService ?? new PlanningService(workingDir)
  }

  async create(): Promise<PlanExecution> {
    const plan = await this.planningService.getPlanOrThrow(this.planId)
    if (plan.status.stage !== 'approved') {
      throw new Error(`Cannot execute plan in stage: ${plan.status.stage}`)
    }

    const now = new Date().toISOString()
    const execution: PlanExecution = {
      execution_id: Identifier.generateID('exec'),
      plan_id: this.planId,
      created_at: now,
      status: { stage: 'pending', updated_at: now },
      tasks: plan.steps.map((_, i): TaskRecord => ({ step_index: i, status: 'pending' })),
    }

    PlanExecutionSchema.parse(execution)
    await writeExecution(this.workingDir, this.planId, execution)
    return execution
  }

  async getExecution(executionId: string): Promise<PlanExecution | null> {
    return readExecution(this.workingDir, this.planId, executionId)
  }

  async getLatestExecution(): Promise<PlanExecution | null> {
    const id = await getLatestExecutionId(this.workingDir, this.planId)
    if (!id) return null
    return readExecution(this.workingDir, this.planId, id)
  }

  private async getExecutionOrThrow(executionId: string): Promise<PlanExecution> {
    const execution = await this.getExecution(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)
    return execution
  }

  async start(executionId: string): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)
    if (execution.status.stage !== 'pending') {
      throw new Error(`Cannot start execution in stage: ${execution.status.stage}`)
    }

    const updated: PlanExecution = {
      ...execution,
      status: { stage: 'running', updated_at: new Date().toISOString() },
    }

    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async claimNextTask(
    executionId: string,
    context: TaskContext,
  ): Promise<TaskWithDefinition | null> {
    const execution = await this.getExecutionOrThrow(executionId)
    if (execution.status.stage !== 'running') {
      return null
    }

    const plan = await this.planningService.getPlanOrThrow(this.planId)

    const pendingIndex = execution.tasks.findIndex((t) => t.status === 'pending')
    if (pendingIndex === -1) return null

    const task = execution.tasks[pendingIndex]
    const retryCount = task.status === 'failed' ? (task as FailedTask).retry_count + 1 : 0

    const runningTask: RunningTask = {
      step_index: pendingIndex,
      status: 'running',
      started_at: new Date().toISOString(),
      context,
      retry_count: retryCount,
    }

    const tasks = [...execution.tasks]
    tasks[pendingIndex] = runningTask

    const updated: PlanExecution = { ...execution, tasks }
    await writeExecution(this.workingDir, this.planId, updated)

    return {
      record: runningTask,
      definition: plan.steps[pendingIndex],
    }
  }

  async startTask(
    executionId: string,
    stepIndex: number,
    context: TaskContext,
    sessionId?: string,
  ): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)

    const task = execution.tasks[stepIndex]
    if (!task) throw new Error(`Invalid step index: ${stepIndex}`)
    if (task.status !== 'pending' && task.status !== 'failed') {
      throw new Error(`Cannot start task in status: ${task.status}`)
    }

    const retryCount = task.status === 'failed' ? (task as FailedTask).retry_count + 1 : 0

    const runningTask: RunningTask = {
      step_index: stepIndex,
      status: 'running',
      agent_session_id: sessionId,
      started_at: new Date().toISOString(),
      context,
      retry_count: retryCount,
    }

    const tasks = [...execution.tasks]
    tasks[stepIndex] = runningTask

    const updated: PlanExecution = { ...execution, tasks }
    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async completeTask(
    executionId: string,
    stepIndex: number,
    output: TaskOutput,
  ): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)

    const task = execution.tasks[stepIndex]
    if (!task || task.status !== 'running') {
      throw new Error(`Task ${stepIndex} is not running`)
    }

    const runningTask = task as RunningTask
    const completedTask: CompletedTask = {
      step_index: stepIndex,
      status: 'completed',
      agent_session_id: runningTask.agent_session_id,
      started_at: runningTask.started_at,
      completed_at: new Date().toISOString(),
      context: runningTask.context,
      output,
      retry_count: runningTask.retry_count,
    }

    const tasks = [...execution.tasks]
    tasks[stepIndex] = completedTask

    const updated: PlanExecution = { ...execution, tasks }
    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async failTask(executionId: string, stepIndex: number, error: string): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)

    const task = execution.tasks[stepIndex]
    if (!task || task.status !== 'running') {
      throw new Error(`Task ${stepIndex} is not running`)
    }

    const runningTask = task as RunningTask
    const failedTask: FailedTask = {
      step_index: stepIndex,
      status: 'failed',
      agent_session_id: runningTask.agent_session_id,
      started_at: runningTask.started_at,
      failed_at: new Date().toISOString(),
      context: runningTask.context,
      error,
      retry_count: runningTask.retry_count,
    }

    const tasks = [...execution.tasks]
    tasks[stepIndex] = failedTask

    const updated: PlanExecution = { ...execution, tasks }
    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async complete(executionId: string): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)
    if (execution.status.stage !== 'running') {
      throw new Error(`Cannot complete execution in stage: ${execution.status.stage}`)
    }

    const allCompleted = execution.tasks.every((t) => t.status === 'completed')
    if (!allCompleted) {
      throw new Error('Cannot complete execution with incomplete tasks')
    }

    const updated: PlanExecution = {
      ...execution,
      status: { stage: 'completed', updated_at: new Date().toISOString() },
    }

    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async fail(
    executionId: string,
    error: string,
    failedStep: number,
    userStopReason?: string,
  ): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)
    if (execution.status.stage !== 'running') {
      throw new Error(`Cannot fail execution in stage: ${execution.status.stage}`)
    }

    const updated: PlanExecution = {
      ...execution,
      status: {
        stage: 'failed',
        error,
        failed_step: failedStep,
        user_stop_reason: userStopReason,
        updated_at: new Date().toISOString(),
      },
    }

    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async stop(executionId: string, reason: string): Promise<PlanExecution> {
    const execution = await this.getExecutionOrThrow(executionId)
    if (execution.status.stage !== 'running') {
      throw new Error(`Cannot stop execution in stage: ${execution.status.stage}`)
    }

    const updated: PlanExecution = {
      ...execution,
      status: { stage: 'stopped', reason, updated_at: new Date().toISOString() },
    }

    await writeExecution(this.workingDir, this.planId, updated)
    return updated
  }

  async listExecutions(): Promise<ExecutionSummary[]> {
    const ids = await listExecutionIds(this.workingDir, this.planId)
    const summaries: ExecutionSummary[] = []

    for (const id of ids) {
      const exec = await readExecution(this.workingDir, this.planId, id)
      if (!exec) continue

      summaries.push({
        execution_id: exec.execution_id,
        plan_id: exec.plan_id,
        stage: exec.status.stage,
        created_at: exec.created_at,
        tasks_completed: exec.tasks.filter((t) => t.status === 'completed').length,
        tasks_total: exec.tasks.length,
      })
    }

    // Most recent first (IDs encode timestamps)
    return summaries.sort((a, b) => b.execution_id.localeCompare(a.execution_id))
  }
}
