import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ToolContext } from '@opencode-ai/plugin'
import { ExecutionService } from '../../execution/service'
import type { PlanContent } from '../../planning/service'
import { PlanningService } from '../../planning/service'
import { ExecutionDescribe } from '../execution-describe'
import { ExecutionList } from '../execution-list'
import { PlanDescribe } from '../plan-describe'
import { PlanList } from '../plan-list'

describe('Discovery Tools', () => {
  let tempDir: string
  let planningService: PlanningService
  let mockCtx: ToolContext

  const validContent: PlanContent = {
    goal: 'Test plan goal',
    steps: [{ description: 'Step 1', agent: 'coder' }],
    assumptions: ['Assumption 1'],
    verification: ['Tests pass'],
    risks: ['Risk 1'],
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'discovery-tools-test-'))
    planningService = new PlanningService(tempDir)
    mockCtx = { sessionID: 'ses_test123' } as ToolContext
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('plan-list', () => {
    test('has correct name and agents', () => {
      expect(PlanList.name).toBe('plan-list')
      expect(PlanList.agents).toEqual(['orca', 'planner', 'specialist'])
    })

    test('returns empty array when no plans exist', async () => {
      const tool = PlanList.create(planningService)
      const result = await tool.execute({}, mockCtx)

      expect(result).toMatchObject({
        title: 'Found 0 plan(s)',
      })
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toEqual([])
    })

    test('returns plan summaries', async () => {
      await planningService.createProposal('ses_1', validContent)
      await planningService.createProposal('ses_2', { ...validContent, goal: 'Second goal' })

      const tool = PlanList.create(planningService)
      const result = await tool.execute({}, mockCtx)

      expect(result).toMatchObject({
        title: 'Found 2 plan(s)',
      })
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toHaveLength(2)
      expect(output[0]).toMatchObject({
        goal: expect.any(String),
        stage: 'proposal',
        step_count: 1,
        execution_count: 0,
      })
    })
  })

  describe('plan-describe', () => {
    test('has correct name and agents', () => {
      expect(PlanDescribe.name).toBe('plan-describe')
      expect(PlanDescribe.agents).toEqual(['orca', 'planner', 'specialist'])
    })

    test('returns plan details for existing plan', async () => {
      const plan = await planningService.createProposal('ses_1', validContent)

      const tool = PlanDescribe.create(planningService)
      const result = await tool.execute({ plan_id: plan.plan_id }, mockCtx)

      expect((result as { title: string }).title).toContain('Test plan goal')
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toMatchObject({
        plan_id: plan.plan_id,
        stage: 'proposal',
        goal: 'Test plan goal',
        steps: [{ description: 'Step 1', agent: 'coder' }],
      })
    })

    test('returns error for non-existent plan', async () => {
      const tool = PlanDescribe.create(planningService)
      const result = await tool.execute({ plan_id: 'plan_nonexistent123' }, mockCtx)

      expect((result as { title: string }).title).toBe('Plan not found')
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toMatchObject({
        error: 'Plan not found: plan_nonexistent123',
      })
    })
  })

  describe('execution-list', () => {
    test('has correct name and agents', () => {
      expect(ExecutionList.name).toBe('execution-list')
      expect(ExecutionList.agents).toEqual(['orca', 'planner', 'specialist'])
    })

    test('returns empty array for plan with no executions', async () => {
      const plan = await planningService.createProposal('ses_1', validContent)
      await planningService.approve(plan.plan_id)

      const tool = ExecutionList.create({ workingDir: tempDir, planningService })
      const result = await tool.execute({ plan_id: plan.plan_id }, mockCtx)

      expect(result).toMatchObject({
        title: 'Found 0 execution(s) for plan',
      })
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toEqual([])
    })

    test('returns execution summaries', async () => {
      const plan = await planningService.createProposal('ses_1', validContent)
      await planningService.approve(plan.plan_id)

      const execService = new ExecutionService(tempDir, plan.plan_id, planningService)
      await execService.create()
      await execService.create()

      const tool = ExecutionList.create({ workingDir: tempDir, planningService })
      const result = await tool.execute({ plan_id: plan.plan_id }, mockCtx)

      expect(result).toMatchObject({
        title: 'Found 2 execution(s) for plan',
      })
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toHaveLength(2)
      expect(output[0]).toMatchObject({
        plan_id: plan.plan_id,
        stage: 'pending',
        tasks_completed: 0,
        tasks_total: 1,
      })
    })
  })

  describe('execution-describe', () => {
    test('has correct name and agents', () => {
      expect(ExecutionDescribe.name).toBe('execution-describe')
      expect(ExecutionDescribe.agents).toEqual(['orca', 'planner', 'specialist'])
    })

    test('returns execution details for existing execution', async () => {
      const plan = await planningService.createProposal('ses_1', validContent)
      await planningService.approve(plan.plan_id)

      const execService = new ExecutionService(tempDir, plan.plan_id, planningService)
      const execution = await execService.create()

      const tool = ExecutionDescribe.create({ workingDir: tempDir, planningService })
      const result = await tool.execute(
        { plan_id: plan.plan_id, execution_id: execution.execution_id },
        mockCtx,
      )

      expect((result as { title: string }).title).toContain('pending')
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toMatchObject({
        execution_id: execution.execution_id,
        plan_id: plan.plan_id,
        status: { stage: 'pending' },
        tasks: [{ step_index: 0, status: 'pending' }],
      })
    })

    test('returns error for non-existent execution', async () => {
      const plan = await planningService.createProposal('ses_1', validContent)
      await planningService.approve(plan.plan_id)

      const tool = ExecutionDescribe.create({ workingDir: tempDir, planningService })
      const result = await tool.execute(
        { plan_id: plan.plan_id, execution_id: 'exec_nonexistent123' },
        mockCtx,
      )

      expect((result as { title: string }).title).toBe('Execution not found')
      const output = JSON.parse((result as { output: string }).output)
      expect(output).toMatchObject({
        error: 'Execution not found: exec_nonexistent123',
      })
    })
  })
})
