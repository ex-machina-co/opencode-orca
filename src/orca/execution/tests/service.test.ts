import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PlanContent } from '../../planning/service'
import { PlanningService } from '../../planning/service'
import type { TaskContext, TaskOutput } from '../schemas'
import { ExecutionService } from '../service'

describe('ExecutionService', () => {
  let tempDir: string
  let planningService: PlanningService
  let planId: string

  const validContent: PlanContent = {
    goal: 'Implement feature X',
    steps: [
      { description: 'Step 1', agent: 'coder' },
      { description: 'Step 2', agent: 'tester' },
    ],
    assumptions: ['Assumption 1'],
    files_touched: ['src/foo.ts'],
    verification: ['Tests pass'],
    risks: ['Risk 1'],
  }

  const makeContext = (stepIndex: number): TaskContext => ({
    plan_id: planId,
    plan_goal: 'Implement feature X',
    step_index: stepIndex,
    total_steps: 2,
    relevant_files: ['src/foo.ts'],
    previous_tasks: [],
    previous_attempts: [],
  })

  const makeOutput = (): TaskOutput => ({
    summary: 'Did the thing',
    artifacts: ['src/foo.ts'],
    raw_response: 'Full response here',
  })

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'execution-test-'))
    planningService = new PlanningService(tempDir)

    const plan = await planningService.createProposal('ses_123', validContent)
    await planningService.approve(plan.plan_id)
    planId = plan.plan_id
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('create', () => {
    test('creates execution for approved plan', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()

      expect(execution.execution_id).toStartWith('exec_')
      expect(execution.plan_id).toBe(planId)
      expect(execution.status.stage).toBe('pending')
      expect(execution.tasks).toHaveLength(2)
      expect(execution.tasks[0].status).toBe('pending')
    })

    test('throws for non-approved plan', async () => {
      const proposal = await planningService.createProposal('ses_456', validContent)
      const service = new ExecutionService(tempDir, proposal.plan_id)

      expect(service.create()).rejects.toThrow('Cannot execute plan in stage: proposal')
    })

    test('throws for non-existent plan', () => {
      const service = new ExecutionService(tempDir, 'plan_nonexistent')
      expect(service.create()).rejects.toThrow('Plan not found')
    })
  })

  describe('start', () => {
    test('transitions execution to running', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      const started = await service.start(execution.execution_id)

      expect(started.status.stage).toBe('running')
    })

    test('throws for non-pending execution', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      expect(service.start(execution.execution_id)).rejects.toThrow(
        'Cannot start execution in stage: running',
      )
    })
  })

  describe('claimNextTask', () => {
    test('claims the first pending task', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      const task = await service.claimNextTask(execution.execution_id, makeContext(0))

      expect(task).not.toBeNull()
      expect(task?.record.status).toBe('running')
      expect(task?.record.step_index).toBe(0)
      expect(task?.definition.description).toBe('Step 1')
    })

    test('returns null when no pending tasks', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      // Claim and complete both tasks
      await service.claimNextTask(execution.execution_id, makeContext(0))
      await service.completeTask(execution.execution_id, 0, makeOutput())
      await service.claimNextTask(execution.execution_id, makeContext(1))
      await service.completeTask(execution.execution_id, 1, makeOutput())

      const task = await service.claimNextTask(execution.execution_id, makeContext(0))
      expect(task).toBeNull()
    })

    test('returns null when execution not running', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      // Don't start - still pending

      const task = await service.claimNextTask(execution.execution_id, makeContext(0))
      expect(task).toBeNull()
    })
  })

  describe('completeTask', () => {
    test('marks task as completed', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)
      await service.claimNextTask(execution.execution_id, makeContext(0))

      const updated = await service.completeTask(execution.execution_id, 0, makeOutput())

      expect(updated.tasks[0].status).toBe('completed')
      expect((updated.tasks[0] as { output: TaskOutput }).output.summary).toBe('Did the thing')
    })

    test('throws when task not running', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)
      // Task 0 is still pending, not running

      expect(service.completeTask(execution.execution_id, 0, makeOutput())).rejects.toThrow(
        'Task 0 is not running',
      )
    })
  })

  describe('failTask', () => {
    test('marks task as failed', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)
      await service.claimNextTask(execution.execution_id, makeContext(0))

      const updated = await service.failTask(execution.execution_id, 0, 'Something broke')

      expect(updated.tasks[0].status).toBe('failed')
      expect((updated.tasks[0] as { error: string }).error).toBe('Something broke')
    })

    test('increments retry_count when restarting failed task', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      // First attempt - fail
      await service.claimNextTask(execution.execution_id, makeContext(0))
      await service.failTask(execution.execution_id, 0, 'First failure')

      // Retry via startTask
      const updated = await service.startTask(execution.execution_id, 0, makeContext(0))
      expect((updated.tasks[0] as { retry_count: number }).retry_count).toBe(1)
    })
  })

  describe('complete', () => {
    test('marks execution as completed when all tasks done', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      // Complete all tasks
      await service.claimNextTask(execution.execution_id, makeContext(0))
      await service.completeTask(execution.execution_id, 0, makeOutput())
      await service.claimNextTask(execution.execution_id, makeContext(1))
      await service.completeTask(execution.execution_id, 1, makeOutput())

      const completed = await service.complete(execution.execution_id)
      expect(completed.status.stage).toBe('completed')
    })

    test('throws when tasks incomplete', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      expect(service.complete(execution.execution_id)).rejects.toThrow(
        'Cannot complete execution with incomplete tasks',
      )
    })
  })

  describe('fail', () => {
    test('marks execution as failed', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      const failed = await service.fail(execution.execution_id, 'Fatal error', 0)

      expect(failed.status.stage).toBe('failed')
      expect((failed.status as { error: string }).error).toBe('Fatal error')
      expect((failed.status as { failed_step: number }).failed_step).toBe(0)
    })
  })

  describe('stop', () => {
    test('marks execution as stopped', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)

      const stopped = await service.stop(execution.execution_id, 'User requested')

      expect(stopped.status.stage).toBe('stopped')
      expect((stopped.status as { reason: string }).reason).toBe('User requested')
    })
  })

  describe('listExecutions', () => {
    test('returns empty array when no executions', async () => {
      const service = new ExecutionService(tempDir, planId)
      const executions = await service.listExecutions()
      expect(executions).toEqual([])
    })

    test('returns summaries sorted by most recent first', async () => {
      const service = new ExecutionService(tempDir, planId)
      await service.create()
      await service.create()

      const executions = await service.listExecutions()

      expect(executions).toHaveLength(2)
      // Second created should be first (most recent)
      expect(executions[0].execution_id > executions[1].execution_id).toBe(true)
    })

    test('includes task progress', async () => {
      const service = new ExecutionService(tempDir, planId)
      const execution = await service.create()
      await service.start(execution.execution_id)
      await service.claimNextTask(execution.execution_id, makeContext(0))
      await service.completeTask(execution.execution_id, 0, makeOutput())

      const executions = await service.listExecutions()

      expect(executions[0].tasks_completed).toBe(1)
      expect(executions[0].tasks_total).toBe(2)
    })
  })

  describe('getLatestExecution', () => {
    test('returns null when no executions', async () => {
      const service = new ExecutionService(tempDir, planId)
      const latest = await service.getLatestExecution()
      expect(latest).toBeNull()
    })

    test('returns most recent execution', async () => {
      const service = new ExecutionService(tempDir, planId)
      await service.create()
      const second = await service.create()

      const latest = await service.getLatestExecution()
      expect(latest?.execution_id).toBe(second.execution_id)
    })
  })

  describe('dependency injection', () => {
    test('accepts injected PlanningService', async () => {
      const injectedPlanning = new PlanningService(tempDir)
      const service = new ExecutionService(tempDir, planId, injectedPlanning)

      const execution = await service.create()
      expect(execution.plan_id).toBe(planId)
    })
  })
})
