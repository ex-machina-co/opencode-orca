import { expect, test } from 'bun:test'
import { ExecutionService } from '../../execution/service'
import { ExecutionDescribe } from '../execution-describe'
import { describeWithContext, testToolDefinition, validPlanContent } from './test-utils'

describeWithContext('execution-describe', (getCtx) => {
  testToolDefinition(ExecutionDescribe, {
    name: 'execution-describe',
    agents: ['orca', 'planner', 'specialist'],
  })

  test('returns error for non-existent execution', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.approve(plan.plan_id)

    const tool = ExecutionDescribe.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id, execution_id: 'exec_nonexistent123' }, ctx.mockCtx)

    if (typeof result === 'string') throw new Error('Result should not be a string')

    expect(result.title).toBe('Execution not found')
    const output = JSON.parse((result as { output: string }).output)
    expect(output).toMatchObject({ error: 'Execution not found: exec_nonexistent123' })
  })

  test('shows task progress in title', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', {
      ...validPlanContent,
      steps: [
        { description: 'Step 1', agent: 'coder' },
        { description: 'Step 2', agent: 'tester' },
      ],
    })
    await ctx.planningService.approve(plan.plan_id)

    const execService = new ExecutionService(ctx.tempDir, plan.plan_id, ctx.planningService)
    const execution = await execService.create()
    await execService.start(execution.execution_id)
    await execService.startTask(execution.execution_id, 0, {
      plan_id: plan.plan_id,
      plan_goal: 'Test',
      step_index: 0,
      total_steps: 2,
      relevant_files: [],
      previous_tasks: [],
      previous_attempts: [],
    })
    await execService.completeTask(execution.execution_id, 0, {
      summary: 'Done',
      artifacts: [],
      raw_response: 'test',
    })

    const tool = ExecutionDescribe.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id, execution_id: execution.execution_id }, ctx.mockCtx)

    if (typeof result === 'string') throw new Error('Result should not be a string')

    expect(result.title).toContain('1/2 tasks')
  })

  test('returns execution details for existing execution', async () => {
    const ctx = getCtx()
    const plan = await ctx.planningService.createProposal('ses_1', validPlanContent)
    await ctx.planningService.approve(plan.plan_id)

    const execService = new ExecutionService(ctx.tempDir, plan.plan_id, ctx.planningService)
    const execution = await execService.create()

    const tool = ExecutionDescribe.create({ directory: ctx.tempDir, planningService: ctx.planningService })
    const result = await tool.execute({ plan_id: plan.plan_id, execution_id: execution.execution_id }, ctx.mockCtx)

    if (typeof result === 'string') throw new Error('Result should not be a string')

    const output = JSON.parse((result as { output: string }).output)
    expect(result.title).toContain('pending')
    expect(result.metadata).toMatchObject({
      sessionId: 'ses_test123',
      planId: plan.plan_id,
      executionId: execution.execution_id,
      stage: 'pending',
    })
    expect(output).toMatchObject({
      execution_id: execution.execution_id,
      plan_id: plan.plan_id,
      status: { stage: 'pending' },
      tasks: [{ step_index: 0, status: 'pending' }],
    })
  })
})
