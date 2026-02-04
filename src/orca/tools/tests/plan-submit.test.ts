import { expect, test } from 'bun:test'
import { PlanSubmit } from '../plan-submit'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-submit', (getCtx) => {
  testToolDefinition(PlanSubmit, { name: 'plan-submit', agents: ['planner'] })

  test('submits a complete draft plan', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })
    await ctx.planningService.setPlanAssumptions(draft.plan_id, ['Assumption'])
    await ctx.planningService.setPlanVerification(draft.plan_id, ['Verify'])
    await ctx.planningService.setPlanRisks(draft.plan_id, ['Risk'])

    const tool = PlanSubmit.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id }, ctx.mockCtx)

    expect((result as { title: string }).title).toBe('Plan submitted')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.summary).toContain('1 steps')
  })

  test('transitions plan to proposal stage', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })
    await ctx.planningService.setPlanAssumptions(draft.plan_id, ['A'])
    await ctx.planningService.setPlanVerification(draft.plan_id, ['V'])
    await ctx.planningService.setPlanRisks(draft.plan_id, ['R'])

    const tool = PlanSubmit.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.stage).toBe('proposal')
  })

  test('accepts optional summary', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })
    await ctx.planningService.setPlanAssumptions(draft.plan_id, ['A'])
    await ctx.planningService.setPlanVerification(draft.plan_id, ['V'])
    await ctx.planningService.setPlanRisks(draft.plan_id, ['R'])

    const tool = PlanSubmit.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, summary: 'This is my plan summary' }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.summary).toBe('This is my plan summary')
  })

  test('throws error for incomplete draft (no steps)', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.setPlanAssumptions(draft.plan_id, ['A'])
    await ctx.planningService.setPlanVerification(draft.plan_id, ['V'])
    await ctx.planningService.setPlanRisks(draft.plan_id, ['R'])

    const tool = PlanSubmit.create(ctx.planningService)
    expect(tool.execute({ plan_id: draft.plan_id }, ctx.mockCtx)).rejects.toThrow()
  })

  test('throws error for incomplete draft (no assumptions)', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step', agent: 'coder' })
    await ctx.planningService.setPlanVerification(draft.plan_id, ['V'])
    await ctx.planningService.setPlanRisks(draft.plan_id, ['R'])

    const tool = PlanSubmit.create(ctx.planningService)
    expect(tool.execute({ plan_id: draft.plan_id }, ctx.mockCtx)).rejects.toThrow()
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanSubmit.create(ctx.planningService)
    expect(tool.execute({ plan_id: proposal.plan_id }, ctx.mockCtx)).rejects.toThrow('not a draft')
  })

  test('includes metadata with step count', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 1', agent: 'coder' })
    await ctx.planningService.addStep(draft.plan_id, { description: 'Step 2', agent: 'tester' })
    await ctx.planningService.setPlanAssumptions(draft.plan_id, ['A'])
    await ctx.planningService.setPlanVerification(draft.plan_id, ['V'])
    await ctx.planningService.setPlanRisks(draft.plan_id, ['R'])

    const tool = PlanSubmit.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      stepCount: 2,
    })
  })
})
