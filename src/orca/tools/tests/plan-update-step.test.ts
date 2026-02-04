import { expect, test } from 'bun:test'
import { PlanUpdateStep } from '../plan-update-step'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-update-step', (getCtx) => {
  testToolDefinition(PlanUpdateStep, { name: 'plan-update-step', agents: ['planner'] })

  test('updates step description', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Original', agent: 'coder' })

    const tool = PlanUpdateStep.create(ctx.planningService)
    const result = await tool.execute(
      { plan_id: draft.plan_id, index: 0, updates: { description: 'Updated description' } },
      ctx.mockCtx,
    )

    expect((result as { title: string }).title).toBe('Step updated')
    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps[0].description).toBe('Updated description')
  })

  test('updates step agent', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step', agent: 'coder' })

    const tool = PlanUpdateStep.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, index: 0, updates: { agent: 'tester' } }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps[0].agent).toBe('tester')
  })

  test('updates multiple fields at once', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step', agent: 'coder' })

    const tool = PlanUpdateStep.create(ctx.planningService)
    await tool.execute(
      {
        plan_id: draft.plan_id,
        index: 0,
        updates: { description: 'New description', agent: 'reviewer', verification: ['Check it'] },
      },
      ctx.mockCtx,
    )

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps[0]).toMatchObject({
      description: 'New description',
      agent: 'reviewer',
      verification: ['Check it'],
    })
  })

  test('throws error for invalid index', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step', agent: 'coder' })

    const tool = PlanUpdateStep.create(ctx.planningService)
    expect(
      tool.execute({ plan_id: draft.plan_id, index: 5, updates: { description: 'New' } }, ctx.mockCtx),
    ).rejects.toThrow('out of bounds')
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanUpdateStep.create(ctx.planningService)
    expect(
      tool.execute({ plan_id: proposal.plan_id, index: 0, updates: { description: 'New' } }, ctx.mockCtx),
    ).rejects.toThrow('not a draft')
  })

  test('includes metadata with index', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step', agent: 'coder' })

    const tool = PlanUpdateStep.create(ctx.planningService)
    const result = await tool.execute(
      { plan_id: draft.plan_id, index: 0, updates: { description: 'Updated' } },
      ctx.mockCtx,
    )

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      index: 0,
    })
  })
})
