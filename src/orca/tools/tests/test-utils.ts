import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ToolContext } from '@opencode-ai/plugin'
import type { AgentType } from '../../../common/agent'
import type { PlanContent } from '../../planning/service'
import { PlanningService } from '../../planning/service'
import type { OrcaTool } from '../common'

export interface TestContext {
  tempDir: string
  planningService: PlanningService
  mockCtx: ToolContext
}

function createTestContext(): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), 'tool-test-'))
  return {
    tempDir,
    planningService: new PlanningService(tempDir),
    mockCtx: { sessionID: 'ses_test123' } as ToolContext,
  }
}

function cleanupTestContext(ctx: TestContext): void {
  rmSync(ctx.tempDir, { recursive: true, force: true })
}

export function describeWithContext(name: string, fn: (getContext: () => TestContext) => void): void {
  describe(name, () => {
    let ctx: TestContext

    beforeEach(() => {
      ctx = createTestContext()
    })

    afterEach(() => {
      cleanupTestContext(ctx)
    })

    fn(() => ctx)
  })
}

export function testToolDefinition<TDeps>(
  tool: OrcaTool<TDeps>,
  expected: { name: string; agents: readonly AgentType[] },
): void {
  test('has correct name and agents', () => {
    expect(tool.name).toBe(expected.name)
    expect(tool.agents).toEqual(expected.agents)
  })
}

export const validPlanContent: PlanContent = {
  goal: 'Test plan goal',
  steps: [{ description: 'Step 1', agent: 'coder' }],
  assumptions: ['Assumption 1'],
  verification: ['Tests pass'],
  risks: ['Risk 1'],
}
