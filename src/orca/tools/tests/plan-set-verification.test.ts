import { expect, test } from 'bun:test'
import { PlanSetVerification } from '../plan-set-verification'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-set-verification', (getCtx) => {
  testToolDefinition(PlanSetVerification, { name: 'plan-set-verification', agents: ['planner'] })

  test('sets verification on draft plan', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetVerification.create(ctx.planningService)
    const result = await tool.execute(
      { plan_id: draft.plan_id, verification: ['Tests pass', 'Build succeeds'] },
      ctx.mockCtx,
    )

    expect((result as { title: string }).title).toBe('Verification set')
    const output = JSON.parse((result as { output: string }).output)
    expect(output.summary).toContain('2 verification criteria')
  })

  test('persists verification to storage', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetVerification.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, verification: ['Check 1', 'Check 2'] }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.verification).toEqual(['Check 1', 'Check 2'])
  })

  test('replaces existing verification', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')
    await ctx.planningService.setPlanVerification(draft.plan_id, ['Old check'])

    const tool = PlanSetVerification.create(ctx.planningService)
    await tool.execute({ plan_id: draft.plan_id, verification: ['New check'] }, ctx.mockCtx)

    const plan = await ctx.planningService.getPlan(draft.plan_id)
    expect(plan?.verification).toEqual(['New check'])
  })

  test('throws error for non-draft plan', async () => {
    const ctx = getCtx()
    const proposal = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanSetVerification.create(ctx.planningService)
    expect(tool.execute({ plan_id: proposal.plan_id, verification: ['New'] }, ctx.mockCtx)).rejects.toThrow(
      'not a draft',
    )
  })

  test('includes metadata with count', async () => {
    const ctx = getCtx()
    const draft = await ctx.planningService.createDraft('ses_1', 'Test goal')

    const tool = PlanSetVerification.create(ctx.planningService)
    const result = await tool.execute({ plan_id: draft.plan_id, verification: ['V1'] }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: draft.plan_id,
      count: 1,
    })
  })
})
