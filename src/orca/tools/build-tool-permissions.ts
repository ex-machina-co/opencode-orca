import type { AgentType } from '../../common/agent'

type PermissionValue = 'allow' | 'deny' | 'ask'

export function buildToolPermissions(
  tools: Array<{ name: string; agents: readonly AgentType[] }>,
): {
  defaults: Record<string, PermissionValue>
  byAgentType: Record<AgentType, Record<string, PermissionValue>>
} {
  const defaults: Record<string, PermissionValue> = {}
  const byAgentType: Record<AgentType, Record<string, PermissionValue>> = {
    orca: {},
    planner: {},
    specialist: {},
  }

  for (const tool of tools) {
    defaults[tool.name] = 'deny'
    for (const agentType of tool.agents) {
      byAgentType[agentType][tool.name] = 'allow'
    }
  }

  return { defaults, byAgentType }
}
