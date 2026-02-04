import type { PermissionRuleset } from '@opencode-ai/sdk/v2'

export const READ_ONLY_PERMISSIONS: PermissionRuleset = [
  { permission: 'edit', pattern: '*', action: 'deny' },
  { permission: 'read', pattern: '*', action: 'allow' },
  { permission: 'glob', pattern: '*', action: 'allow' },
  { permission: 'grep', pattern: '*', action: 'allow' },
  { permission: 'list', pattern: '*', action: 'allow' },
  { permission: 'bash', pattern: 'ls*', action: 'allow' },
  { permission: 'bash', pattern: 'cat*', action: 'allow' },
  { permission: 'bash', pattern: 'git status*', action: 'allow' },
  { permission: 'bash', pattern: 'git log*', action: 'allow' },
  { permission: 'bash', pattern: 'git diff*', action: 'allow' },
  { permission: 'bash', pattern: 'git show*', action: 'allow' },
  { permission: 'bash', pattern: '*', action: 'ask' },
  { permission: 'task', pattern: '*', action: 'deny' },
]
