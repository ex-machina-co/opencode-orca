import { expect, test } from 'bun:test'
import { PlanSetAssumptions } from '../plan-set-assumptions'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-set-assumptions', (getCtx) => {
  testToolDefinition(PlanSetAssumptions, { name: 'plan-set-assumptions', agents: ['planner'] })

  test('sets assumptions on draft plan', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetAssumptions.create(ctx.planningService)
    const result = await tool.execute(
      { plan_id: draft.plan_id, assumptions: ['Assumption 1', 'Assumption 2'] },
      ctx.mockCtx,
    )

    expect((result as { title: string }).title).toBe('Assumptions set')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.summary).toContain('2 assumptions')
  })

  test('persists assumptions to storage', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetAssumptions.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, assumptions: ['First', 'Second', 'Third'] }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.assumptions).toEqual(['First', 'Second', 'Third'])
  })

  test('replaces existing assumptions', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.setPlanAssumptions(draft.plan_id, ['Old assumption'])

    const tool = PlanSetAssumptions.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, assumptions: ['New assumption'] }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.assumptions).toEqual(['New assumption'])
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanSetAssumptions.create(ctx.planningService)
    expect(tool.execute({ plan_id: proposal.plan_id, assumptions: ['New'] }, ctx.mockCtx)).rejects.toThrow(
      'not a draft',
    )
  })

  test('includes metadata with count', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetAssumptions.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id, assumptions: ['A', 'B'] }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      count: 2,
    })
  })
})
