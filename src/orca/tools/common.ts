import type { ToolContext, ToolDefinition } from '@opencode-ai/plugin'
import type { AgentType } from '../../common/agent'

export interface OrcaTool<TDeps = void> {
  name: string
  agents: readonly AgentType[]
  create: (deps: TDeps) => ToolDefinition
}

export function defineTool<TDeps>(def: {
  name: string
  agents: [AgentType, ...AgentType[]]
  create: (deps: TDeps) => ToolDefinition
}): OrcaTool<TDeps> {
  return def
}

export function planMetadata(ctx: ToolContext, planId: string, extra?: Record<string, unknown>) {
  return {
    sessionId: ctx.sessionID,
    planId,
    ...extra,
  }
}
