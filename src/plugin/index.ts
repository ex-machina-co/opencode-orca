import type { Plugin } from '@opencode-ai/plugin'
import type { AgentConfig as OpenCodeAgentConfig } from '@opencode-ai/sdk'
import { DEFAULT_AGENTS, mergeAgentConfigs } from './agents'
import { type AgentConfig, loadUserConfig } from './config'

/**
 * Convert our AgentConfig to OpenCode's AgentConfig format
 * They're compatible but we need to ensure type safety
 */
function toOpenCodeAgentConfig(config: AgentConfig): OpenCodeAgentConfig {
  return config as OpenCodeAgentConfig
}

/**
 * Create the Orca plugin instance
 *
 * This is the factory function that creates a configured plugin.
 * Use this if you need to customize plugin behavior before initialization.
 */
export const createOrcaPlugin = (): Plugin => {
  return async (input) => {
    const { directory } = input

    // Load user config (graceful fallback if missing)
    let userConfig: Awaited<ReturnType<typeof loadUserConfig>>
    try {
      userConfig = await loadUserConfig(directory)
    } catch (err) {
      // Log error but don't crash - use defaults only
      console.error(
        `[opencode-orca] Failed to load user config: ${err instanceof Error ? err.message : err}`,
      )
      userConfig = undefined
    }

    // Merge default agents with user overrides/additions
    const agents = mergeAgentConfigs(DEFAULT_AGENTS, userConfig?.agents)

    return {
      /**
       * Config hook - injects Orca agent definitions into OpenCode
       */
      async config(config) {
        // Initialize agent record if needed
        config.agent = config.agent ?? {}

        // Inject all Orca agents
        for (const [agentId, agentConfig] of Object.entries(agents)) {
          config.agent[agentId] = toOpenCodeAgentConfig(agentConfig)
        }
      },

      /**
       * Tool definitions will be added in future stories:
       * - orca_dispatch: Route messages between agents
       */
      tool: {
        // orca_dispatch will be implemented in the Plugin Tool story
      },
    }
  }
}

/**
 * Default Orca plugin instance
 *
 * This is the standard export for OpenCode plugin registration.
 * Add to your opencode.jsonc: "plugin": ["opencode-orca"]
 */
export default createOrcaPlugin()
