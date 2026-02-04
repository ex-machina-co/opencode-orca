import { join } from 'node:path'
import type { Plugin } from '@opencode-ai/plugin'
import type { Event, QuestionAnswer } from '@opencode-ai/sdk/v2'
import { AgentType } from '../common/agent'
import { initLogger } from '../common/log'
import { OrcaService } from '../orca/service'
import { Tools } from '../orca/tools'
import { buildToolPermissions } from '../orca/tools/build-tool-permissions'
import { DEFAULT_AGENTS, mergeAgentConfigs } from './agents'
import { loadUserConfig } from './config'
import { ORCA_TOOL_RESTRICTIONS } from './orca-restrictions'
import { ensureSchema } from './schema'
import { runUpdateNotifier } from './update-notifier'
import { getPluginVersion } from './version'

export const createOrcaPlugin = (): Plugin => {
  return async (input) => {
    const { client, clientNext, directory } = input

    const log = initLogger(clientNext)

    // Initialize orchestration service (holds HITL, planning, execution services)
    // Note: We pass both v1 (client) and v2 (clientNext) clients because
    // v1 handles streaming responses from session.prompt() properly
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
      settings: userConfig?.settings,
    })

    // Ensure schema file exists for editor autocomplete (silent failure)
    ensureSchema(join(directory, '.opencode'))

    // Track plugin entry for update notifier (will be populated in config hook)
    let pluginEntry: string | undefined
    let hasRunUpdateNotifier = false

    // Tool metadata for permission management (name -> allowed agent types)
    const toolPermissions: Array<{ name: string; agents: readonly AgentType[] }> =
      Object.values(Tools)

    return {
      tool: {
        // Planner tools - clarification
        [Tools.AskUser.name]: Tools.AskUser.create(orca.hitl),
        [Tools.AskAgent.name]: Tools.AskAgent.create(orca.dispatch),
        // Planner tools - plan building
        [Tools.PlanCreateDraft.name]: Tools.PlanCreateDraft.create(orca.planner),
        [Tools.PlanSetAssumptions.name]: Tools.PlanSetAssumptions.create(orca.planner),
        [Tools.PlanSetRisks.name]: Tools.PlanSetRisks.create(orca.planner),
        [Tools.PlanSetVerification.name]: Tools.PlanSetVerification.create(orca.planner),
        [Tools.PlanAddStep.name]: Tools.PlanAddStep.create(orca.planner),
        [Tools.PlanUpdateStep.name]: Tools.PlanUpdateStep.create(orca.planner),
        [Tools.PlanRemoveStep.name]: Tools.PlanRemoveStep.create(orca.planner),
        [Tools.PlanSubmit.name]: Tools.PlanSubmit.create(orca.planner),
        // Discovery tools - available to all agents
        [Tools.PlanList.name]: Tools.PlanList.create(orca.planner),
        [Tools.PlanDescribe.name]: Tools.PlanDescribe.create(orca.planner),
        [Tools.ExecutionList.name]: Tools.ExecutionList.create({
          workingDir: directory,
          planningService: orca.planner,
        }),
        [Tools.ExecutionDescribe.name]: Tools.ExecutionDescribe.create({
          workingDir: directory,
          planningService: orca.planner,
        }),
        // Orca tools
        [Tools.OrcaInvoke.name]: Tools.OrcaInvoke.create(orca),
      },

      async config(config) {
        config.agent = config.agent ?? {}

        // Inject all Orca agents
        for (const [agentId, agentConfig] of Object.entries(agents)) {
          config.agent[agentId] = agentConfig
        }

        // Apply tool permissions: deny all orca tools by default, allow per agent type
        const { defaults, byAgentType } = buildToolPermissions(toolPermissions)

        // Deny by default (user overrides take precedence)
        const existingPermission =
          typeof config.permission === 'object' && config.permission ? config.permission : {}
        config.permission = { ...defaults, ...existingPermission }

        // Allow per agent type (user overrides take precedence)
        for (const [agentId, agentConfig] of Object.entries(config.agent)) {
          if (!agentConfig) continue
          const result = AgentType.safeParse(agentId)
          const agentType = result.success ? result.data : 'specialist'
          const existingAgentPermission =
            typeof agentConfig.permission === 'object' && agentConfig.permission
              ? agentConfig.permission
              : {}
          agentConfig.permission = { ...byAgentType[agentType], ...existingAgentPermission }
        }

        // Orca agent can ONLY use orca-invoke (wildcard deny + explicit allow)
        const orcaAgent = config.agent.orca
        if (orcaAgent) {
          orcaAgent.tools = ORCA_TOOL_RESTRICTIONS
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
