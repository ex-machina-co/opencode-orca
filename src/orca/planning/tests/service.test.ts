import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PlanContent, PlanningService as PlanningServiceType } from '../service'
import { PlanningService } from '../service'
import { readPlan } from '../storage'

describe('PlanningService', () => {
  let tempDir: string
  let service: PlanningServiceType

  const validContent: PlanContent = {
    goal: 'Implement feature X',
    steps: [{ description: 'Step 1', agent: 'coder' }],
    assumptions: ['Assumption 1'],
    files_touched: ['src/foo.ts'],
    verification: ['Tests pass'],
    risks: ['Risk 1'],
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'planning-test-'))
    service = new PlanningService(tempDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('createProposal', () => {
    test('creates a proposal with correct initial state', async () => {
      const plan = await service.createProposal('ses_123', validContent)

      expect(plan.plan_id).toStartWith('plan_')
      expect(plan.planner_session_id).toBe('ses_123')
      expect(plan.status.stage).toBe('proposal')
      expect(plan.goal).toBe('Implement feature X')
      expect(plan.steps).toHaveLength(1)
    })

    test('persists the plan to disk', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      const fromDisk = await readPlan(tempDir, plan.plan_id)

      expect(fromDisk).not.toBeNull()
      expect(fromDisk?.plan_id).toBe(plan.plan_id)
    })

    test('rejects invalid content', async () => {
      const invalid = { ...validContent, steps: [] }
      expect(service.createProposal('ses_123', invalid)).rejects.toThrow()
    })
  })

  describe('revise', () => {
    test('updates plan content', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      const revised = await service.revise(plan.plan_id, {
        ...validContent,
        goal: 'Updated goal',
      })

      expect(revised.goal).toBe('Updated goal')
      expect(revised.status.stage).toBe('proposal')
    })

    test('throws for non-existent plan', () => {
      expect(service.revise('plan_nonexistent', validContent)).rejects.toThrow('Plan not found')
    })

    test('throws for non-proposal plan', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      await service.approve(plan.plan_id)

      expect(service.revise(plan.plan_id, validContent)).rejects.toThrow(
        'Cannot revise plan in stage: approved',
      )
    })
  })

  describe('approve', () => {
    test('transitions to approved', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      const approved = await service.approve(plan.plan_id)

      expect(approved.status.stage).toBe('approved')
    })

    test('throws for non-proposal plan', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      await service.reject(plan.plan_id)

      expect(service.approve(plan.plan_id)).rejects.toThrow(
        'Cannot approve plan in stage: rejected',
      )
    })
  })

  describe('reject', () => {
    test('transitions to rejected', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      const rejected = await service.reject(plan.plan_id, 'Not what I wanted')

      expect(rejected.status.stage).toBe('rejected')
      expect(rejected.status).toHaveProperty('reason', 'Not what I wanted')
    })

    test('allows rejection without reason', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      const rejected = await service.reject(plan.plan_id)

      expect(rejected.status.stage).toBe('rejected')
    })
  })

  describe('getPlan / getPlanOrThrow', () => {
    test('returns null for non-existent plan', async () => {
      const plan = await service.getPlan('plan_nonexistent')
      expect(plan).toBeNull()
    })

    test('getPlanOrThrow throws for non-existent plan', () => {
      expect(service.getPlanOrThrow('plan_nonexistent')).rejects.toThrow('Plan not found')
    })
  })

  describe('listPlans', () => {
    test('returns empty array when no plans', async () => {
      const plans = await service.listPlans()
      expect(plans).toEqual([])
    })

    test('returns summaries sorted by most recent first', async () => {
      await service.createProposal('ses_1', { ...validContent, goal: 'First' })
      await service.createProposal('ses_2', { ...validContent, goal: 'Second' })

      const plans = await service.listPlans()

      expect(plans).toHaveLength(2)
      expect(plans[0].goal).toBe('Second')
      expect(plans[1].goal).toBe('First')
    })

    test('includes has_executions field', async () => {
      const plan = await service.createProposal('ses_1', validContent)
      const plans = await service.listPlans()

      expect(plans[0].plan_id).toBe(plan.plan_id)
      expect(plans[0].has_executions).toBe(false)
    })
  })

  describe('removePlan', () => {
    test('deletes the plan', async () => {
      const plan = await service.createProposal('ses_123', validContent)
      await service.removePlan(plan.plan_id)

      const fromDisk = await service.getPlan(plan.plan_id)
      expect(fromDisk).toBeNull()
    })

    test('does not throw for non-existent plan', () => {
      expect(service.removePlan('plan_nonexistent')).resolves.toBeUndefined()
    })
  })
})
