/**
 * Host tools that the Orca agent is explicitly denied access to.
 *
 * This is a security measure to ensure the Orca orchestrator agent can only
 * use `orca-invoke` to communicate with the planner. It should not have
 * direct access to file system, bash, or web tools.
 *
 * These denies are applied AFTER user config merge, so they cannot be
 * overridden by user configuration.
 */
export const ORCA_HOST_TOOLS_DENY_LIST = {
  read: false,
  glob: false,
  grep: false,
  bash: false,
  edit: false,
  write: false,
  webfetch: false,
  task: false,
  apply_patch: false,
} as const

export type OrcaHostToolsDenyList = typeof ORCA_HOST_TOOLS_DENY_LIST
