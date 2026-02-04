import { expect, test } from 'bun:test'
import { PlanDescribe } from '../plan-describe'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-describe', (getCtx) => {
  testToolDefinition(PlanDescribe, { name: 'plan-describe', agents: ['orca', 'planner', 'specialist'] })

  test('returns plan details for existing plan', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanDescribe.create(ctx.planningService)
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

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
    const ctx = getCtx()
    const tool = PlanDescribe.create(ctx.planningService)
    const result = await tool.execute({ plan_id: 'plan_nonexistent123' }, ctx.mockCtx)

    expect((result as { title: string }).title).toBe('Plan not found')
    const output = JSON.parse((result as { output: string }).output)
    expect(output).toMatchObject({ error: 'Plan not found: plan_nonexistent123' })
  })

  test('includes all plan fields in response', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanDescribe.create(ctx.planningService)
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    const output = JSON.parse((result as { output: string }).output)
    expect(output).toMatchObject({
      plan_id: plan.plan_id,
      planner_session_id: 'ses_1',
      stage: 'proposal',
      goal: 'Test plan goal',
      steps: expect.any(Array),
      assumptions: ['Assumption 1'],
      verification: ['Tests pass'],
      risks: ['Risk 1'],
      created_at: expect.any(String),
      updated_at: expect.any(String),
    })
  })

  test('truncates long goals in title', async () => {
    const ctx = getCtx()
    const longGoal = 'A'.repeat(100)
    const plan = await ctx.planningService.createProposal('ses_1', { ...validPlanContent, goal: longGoal })

    const tool = PlanDescribe.create(ctx.planningService)
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    const title = (result as { title: string }).title
    expect(title.length).toBeLessThan(60)
    expect(title).toContain('...')
  })

  test('includes metadata with plan info', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanDescribe.create(ctx.planningService)
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: plan.plan_id,
      stage: 'proposal',
    })
  })
})
