import { expect, test } from 'bun:test'
import { PlanList } from '../plan-list'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('plan-list', (getCtx) => {
  testToolDefinition(PlanList, { name: 'plan-list', agents: ['orca', 'planner', 'specialist'] })

  test('returns empty array when no plans exist', async () => {
    const ctx = getCtx()
    const tool = PlanList.create(ctx.planningService)
    const result = await tool.execute({}, ctx.mockCtx)

    expect(result).toMatchObject({ title: 'Found 0 plan(s)' })
    const output = JSON.parse((result as { output: string }).output)
    expect(output).toEqual([])
  })

  test('returns plan summaries', async () => {
    const ctx = getCtx()
    await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.createProposal('ses_2', { ...validPlanContent, goal: 'Second goal' })

    const tool = PlanList.create(ctx.planningService)
    const result = await tool.execute({}, ctx.mockCtx)

    expect(result).toMatchObject({ title: 'Found 2 plan(s)' })
    const output = JSON.parse((result as { output: string }).output)
    expect(output).toHaveLength(2)
    expect(output[0]).toMatchObject({
      goal: expect.any(String),
      stage: 'proposal',
      step_count: 1,
      execution_count: 0,
    })
  })

  test('sorts plans by recency (newest first)', async () => {
    const ctx = getCtx()
    const plan1 = await ctx.planningService.createProposal('ses_1', { ...validPlanContent, goal: 'First' })
    const plan2 = await ctx.planningService.createProposal('ses_2', { ...validPlanContent, goal: 'Second' })

    const tool = PlanList.create(ctx.planningService)
    const result = await tool.execute({}, ctx.mockCtx)

    const output = JSON.parse((result as { output: string }).output)
    expect(output[0].plan_id).toBe(plan2.plan_id)
    expect(output[1].plan_id).toBe(plan1.plan_id)
  })

  test('includes metadata with session and count', async () => {
    const ctx = getCtx()
    await ctx.planningService.createProposal('ses_1', validPlanContent)

    const tool = PlanList.create(ctx.planningService)
    const result = await tool.execute({}, ctx.mockCtx)

    expect((result as { metadata: unknown }).metadata).toMatchObject({
      sessionId: 'ses_test123',
      count: 1,
    })
  })
})
