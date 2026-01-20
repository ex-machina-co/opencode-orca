import { join } from 'node:path'
import { type Plugin, tool } from '@opencode-ai/plugin'
import type { Event, QuestionAnswer } from '@opencode-ai/sdk/v2'
import { initLogger } from '../common/log'
import { OrcaService } from '../orca/service'
import { DEFAULT_AGENTS, mergeAgentConfigs } from './agents'
import { loadUserConfig } from './config'
import { ensureSchema } from './schema'
import { runUpdateNotifier } from './update-notifier'
import { getPluginVersion } from './version'

export const createOrcaPlugin = (): Plugin => {
  return async (input) => {
    const { client, clientNext, directory } = input

    // Initialize logger first
    const log = initLogger(clientNext)

    // Initialize orchestration service (holds HITL, planning, execution services)
    const orca = new OrcaService({
      client: clientNext,
      directory,
      logger: log,
    })

    let userConfig: Awaited<ReturnType<typeof loadUserConfig>>
    let configLoadError: string | undefined
    try {
      userConfig = await loadUserConfig(directory)
    } catch (error) {
      userConfig = undefined
      configLoadError = error instanceof Error ? error.message : String(error)
      log.error('Failed to load user config', { error: configLoadError })
    }

    // Merge default agents with user overrides/additions
    const agents = mergeAgentConfigs(DEFAULT_AGENTS, {
      orca: userConfig?.orca,
      planner: userConfig?.planner,
      agents: userConfig?.agents,
    })

    // Ensure schema file exists for editor autocomplete (silent failure)
    ensureSchema(join(directory, '.opencode'))

    // Track plugin entry for update notifier (will be populated in config hook)
    let pluginEntry: string | undefined
    let hasRunUpdateNotifier = false

    return {
      tool: {
        // TODO: New tools will be added here:
        // - orca_ask_planner: Send user messages to planner
        // - orca_ask_agent: Ask read-only questions to agents
        // - orca_ask_user: HITL user questions tool
        // - orca_list_plans: List existing plans
        // - orca_describe_plan: Get details about a specific plan
      },
      async config(config) {
        config.agent = config.agent ?? {}

        // Inject all Orca agents
        for (const [agentId, agentConfig] of Object.entries(agents)) {
          config.agent[agentId] = agentConfig
        }

        // Find our plugin entry for update notifier
        pluginEntry = config.plugin?.find(
          (p) => p === '@ex-machina/opencode-orca' || p.startsWith('@ex-machina/opencode-orca@'),
        )
      },

      async event({ event }: { event: Event }) {
        // Handle question events for HITL workflow
        if (event.type === 'question.replied') {
          const props = event.properties as { requestID: string; answers: QuestionAnswer[] }
          log.info('question.replied event received', {
            requestID: props.requestID,
            answers: props.answers,
          })
          orca.hitl.handleQuestionReplied(props.requestID, props.answers)
          return
        }

        if (event.type === 'question.rejected') {
          const props = event.properties as { requestID: string }
          log.info('question.rejected event received', { requestID: props.requestID })
          orca.hitl.handleQuestionRejected(props.requestID)
          return
        }

        ///////////////////////////////
        //   UPDATE NOTIFIER BELOW   //
        ///////////////////////////////

        // Only run update notifier once per startup
        if (hasRunUpdateNotifier) return

        // Skip sub-sessions (background tasks)
        const props = event.properties as { info?: { parentID?: string } } | undefined
        if (props?.info?.parentID) return

        hasRunUpdateNotifier = true

        // Show config error toast on first interaction (TUI not ready during init)
        if (configLoadError) {
          setTimeout(() => {
            client.tui
              .showToast({
                body: {
                  title: 'Orca Config Error',
                  message: configLoadError,
                  variant: 'error',
                  duration: 20_000,
                },
              })
              .catch(() => {})
          }, 0)
        } else {
          // Show startup toast
          setTimeout(() => {
            const version = getPluginVersion()
            client.tui
              .showToast({
                body: {
                  title: `Orca v${version}`,
                  message: 'Loaded and ready to orchestrate',
                  variant: 'success',
                  duration: 5_000,
                },
              })
              .catch(() => {})
          }, 0)
        }

        // Run update notifier on first interaction (uses internal caching for npm checks)
        setTimeout(() => {
          runUpdateNotifier({
            client,
            currentVersion: getPluginVersion(),
            pluginEntry,
            settings: userConfig?.settings,
          }).catch(() => {
            // Silently ignore update notifier errors
          })
        }, 0)
      },
    }
  }
}

/**
 * Default Orca plugin instance
 *
 * This is the standard export for OpenCode plugin registration.
 * Add to your opencode.jsonc: "plugin": ["@ex-machina/opencode-orca"]
 */
export default createOrcaPlugin()
