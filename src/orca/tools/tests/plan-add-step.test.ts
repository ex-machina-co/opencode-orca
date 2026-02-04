import { expect, test } from 'bun:test'
import { PlanAddStep } from '../plan-add-step'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-add-step', (getCtx) => {
  testToolDefinition(PlanAddStep, { name: 'plan-add-step', agents: ['planner'] })

  test('adds a step to a draft plan', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanAddStep.create(ctx.planningService)
    const result = await tool.execute(
      { plan_id: draft.plan_id, step: { description: 'Step 1', agent: 'coder' } },
      ctx.mockCtx,
    )

    expect((result as { title: string }).title).toBe('Step added')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.summary).toContain('1 total')
  })

  test('appends step to end by default', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'First', agent: 'coder' })

    const tool = PlanAddStep.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, step: { description: 'Second', agent: 'tester' } }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps).toHaveLength(2)
    expect(plan?.steps[1].description).toBe('Second')
  })

  test('inserts step at specified position', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'First', agent: 'coder' })
    await ctx.planningService.addStep(draft.plan_id, { description: 'Third', agent: 'reviewer' })

    const tool = PlanAddStep.create(ctx.planningService)
    await tool.execute(
      { plan_id: draft.plan_id, step: { description: 'Second', agent: 'tester' }, position: 1 },
      ctx.mockCtx,
    )

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps).toHaveLength(3)
    expect(plan?.steps[0].description).toBe('First')
    expect(plan?.steps[1].description).toBe('Second')
    expect(plan?.steps[2].description).toBe('Third')
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanAddStep.create(ctx.planningService)
    expect(
      tool.execute({ plan_id: proposal.plan_id, step: { description: 'New step', agent: 'coder' } }, ctx.mockCtx),
    ).rejects.toThrow('not a draft')
  })

  test('includes metadata with step info', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanAddStep.create(ctx.planningService)
    const result = await tool.execute(
      { plan_id: draft.plan_id, step: { description: 'Step 1', agent: 'coder' } },
      ctx.mockCtx,
    )

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      stepCount: 1,
      position: 0,
    })
  })
})
