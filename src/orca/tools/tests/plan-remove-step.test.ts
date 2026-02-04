import { expect, test } from 'bun:test'
import { PlanRemoveStep } from '../plan-remove-step'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-remove-step', (getCtx) => {
  testToolDefinition(PlanRemoveStep, { name: 'plan-remove-step', agents: ['planner'] })

  test('removes a step from draft plan', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 2', agent: 'tester' })

    const tool = PlanRemoveStep.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id, index: 0 }, ctx.mockCtx)

    expect((result as { title: string }).title).toBe('Step removed')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.summary).toContain('1 remaining')
  })

  test('shifts subsequent steps down', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'First', agent: 'coder' })
    await ctx.planningService.addStep(draft.plan_id, { description: 'Second', agent: 'tester' })
    await ctx.planningService.addStep(draft.plan_id, { description: 'Third', agent: 'reviewer' })

    const tool = PlanRemoveStep.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, index: 1 }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps).toHaveLength(2)
    expect(plan?.steps[0].description).toBe('First')
    expect(plan?.steps[1].description).toBe('Third')
  })

  test('removes last step', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })

    const tool = PlanRemoveStep.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, index: 0 }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.steps).toHaveLength(0)
  })

  test('throws error for invalid index', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step', agent: 'coder' })

    const tool = PlanRemoveStep.create(ctx.planningService)
    expect(tool.execute({ plan_id: draft.plan_id, index: 5 }, ctx.mockCtx)).rejects.toThrow('out of bounds')
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanRemoveStep.create(ctx.planningService)
    expect(tool.execute({ plan_id: proposal.plan_id, index: 0 }, ctx.mockCtx)).rejects.toThrow('not a draft')
  })

  test('includes metadata with index and count', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 2', agent: 'tester' })

    const tool = PlanRemoveStep.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id, index: 0 }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      index: 0,
      stepCount: 1,
    })
  })
})
