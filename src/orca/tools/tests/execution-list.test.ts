import { expect, test } from 'bun:test'
import { ExecutionService } from '../../execution/service'
import { ExecutionList } from '../execution-list'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('execution-list', (getCtx) => {
  testToolDefinition(ExecutionList, { name: 'execution-list', agents: ['orca', 'planner', 'specialist'] })

  test('returns empty array for plan with no executions', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.approve(plan.plan_id)

    const tool = ExecutionList.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    expect(result).toMatchObject({ title: 'Found 0 execution(s) for plan' })
    const output = JSON.parse((result as { output: string }).output)
    expect(output).toEqual([])
  })

  test('returns execution summaries', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.approve(plan.plan_id)

    const execService = new ExecutionService(ctx.tempDir, plan.plan_id, ctx.planningService)
    await execService.create()
    await execService.create()

    const tool = ExecutionList.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    if (typeof result === 'string') throw new Error('Result should not be a string')

    expect(result).toMatchObject({ title: 'Found 2 execution(s) for plan' })
    const output = JSON.parse(result.output)
    expect(output).toHaveLength(2)
    expect(output[0]).toMatchObject({
      plan_id: plan.plan_id,
      stage: 'pending',
      tasks_completed: 0,
      tasks_total: 1,
    })
  })

  test('sorts executions by recency (newest first)', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.approve(plan.plan_id)

    const execService = new ExecutionService(ctx.tempDir, plan.plan_id, ctx.planningService)
    const exec1 = await execService.create()
    const exec2 = await execService.create()

    const tool = ExecutionList.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    if (typeof result === 'string') throw new Error('Result should not be a string')

    const output = JSON.parse(result.output)
    expect(output[0].execution_id).toBe(exec2.execution_id)
    expect(output[1].execution_id).toBe(exec1.execution_id)
  })

  test('includes metadata with count', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.approve(plan.plan_id)

    const execService = new ExecutionService(ctx.tempDir, plan.plan_id, ctx.planningService)
    await execService.create()

    const tool = ExecutionList.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id }, ctx.mockCtx)

    if (typeof result === 'string') throw new Error('Result should not be a string')

    expect(result.metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: plan.plan_id,
      count: 1,
    })
  })
})
