import { expect, test } from 'bun:test'
import { PlanCreateDraft } from '../plan-create-draft'
import { describeWithContext, testToolDefinition } from './test-utils'

describeWithContext('plan-create-draft', (getCtx) => {
  testToolDefinition(PlanCreateDraft, { name: 'plan-create-draft', agents: ['planner'] })

  test('creates a draft plan', async () => {
    const ctx = getCtx()
    const tool = PlanCreateDraft.create(ctx.planningService)
    const result = await tool.execute({ goal: 'Implement feature X' }, ctx.mockCtx)

    expect((result as { title: string }).title).toBe('Draft created')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.plan_id).toMatch(/^plan_/)
  })

  test('persists the draft to storage', async () => {
    const ctx = getCtx()
    const tool = PlanCreateDraft.create(ctx.planningService)
    const result = await tool.execute({ goal: 'Implement feature X' }, ctx.mockCtx)

    const output = JSON.parse((result as { output: string }).output)
    const plan = await ctx.planningService.getPlan(output.plan_id)

    expect(plan).not.toBeNull()
    expect(plan?.stage).toBe('draft')
    expect(plan?.goal).toBe('Implement feature X')
  })

  test('uses session ID from context', async () => {
    const ctx = getCtx()
    const tool = PlanCreateDraft.create(ctx.planningService)
    const result = await tool.execute({ goal: 'Test goal' }, ctx.mockCtx)

    const output = JSON.parse((result as { output: string }).output)
    const plan = await ctx.planningService.getPlan(output.plan_id)

    expect(plan?.planner_session_id).toBe('ses_test123')
  })

  test('includes metadata with goal', async () => {
    const ctx = getCtx()
    const tool = PlanCreateDraft.create(ctx.planningService)
    const result = await tool.execute({ goal: 'Test goal' }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      goal: 'Test goal',
    })
  })

  test('initializes draft with empty arrays', async () => {
    const ctx = getCtx()
    const tool = PlanCreateDraft.create(ctx.planningService)
    const result = await tool.execute({ goal: 'Test goal' }, ctx.mockCtx)

    const output = JSON.parse((result as { output: string }).output)
    const plan = await ctx.planningService.getPlan(output.plan_id)

    expect(plan?.steps).toEqual([])
    expect(plan?.assumptions).toEqual([])
    expect(plan?.verification).toEqual([])
    expect(plan?.risks).toEqual([])
  })
})
