import { expect, test } from 'bun:test'
import { PlanSetRisks } from '../plan-set-risks'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-set-risks', (getCtx) => {
  testToolDefinition(PlanSetRisks, { name: 'plan-set-risks', agents: ['planner'] })

  test('sets risks on draft plan', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetRisks.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id, risks: ['Risk 1', 'Risk 2'] }, ctx.mockCtx)

    expect((result as { title: string }).title).toBe('Risks set')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.summary).toContain('2 risks')
  })

  test('persists risks to storage', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetRisks.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, risks: ['First risk', 'Second risk'] }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.risks).toEqual(['First risk', 'Second risk'])
  })

  test('replaces existing risks', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.setPlanRisks(draft.plan_id, ['Old risk'])

    const tool = PlanSetRisks.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, risks: ['New risk'] }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.risks).toEqual(['New risk'])
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanSetRisks.create(ctx.planningService)
    expect(tool.execute({ plan_id: proposal.plan_id, risks: ['New'] }, ctx.mockCtx)).rejects.toThrow('not a draft')
  })

  test('includes metadata with count', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetRisks.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id, risks: ['R1', 'R2', 'R3'] }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      count: 3,
    })
  })
})
