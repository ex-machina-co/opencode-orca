/**
 * Tool restrictions for the Orca agent.
 *
 * Orca should ONLY have access to `orca-invoke`. All other tools are denied
 * using a wildcard pattern, then `orca-invoke` is explicitly allowed.
 *
 * OpenCode evaluates tool rules with "last matching rule wins" semantics,
 * so `*: false` followed by `orca-invoke: true` gives us whitelist behavior.
 */
export const ORCA_TOOL_RESTRICTIONS = {
  '*': false,
  'orca-invoke': true,
} as const

export type OrcaToolRestrictions = typeof ORCA_TOOL_RESTRICTIONS
