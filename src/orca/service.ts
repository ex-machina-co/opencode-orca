import type { ToolContext } from '@opencode-ai/plugin'
import type { OpencodeClient as OpencodeClientV2, ToolPart } from '@opencode-ai/sdk/v2'
import type { Logger } from '../common/log'
import { getLogger } from '../common/log'
import { DispatchService, ParseError } from './dispatch/service'
import { HITLService } from './hitl/service'
import type { PlannerResponse } from './planning/schemas'
import { PlanningService } from './planning/service'
import type { InvokeInput, InvokeOutput } from './tools/orca-invoke'

export interface InvokeOptions {
  onSessionCreated?: (sessionId: string) => void | Promise<void>
  onToolPartUpdated?: (part: ToolPart) => void | Promise<void>
}

export interface OrcaServiceDeps {
  client: OpencodeClientV2
  directory: string
  logger?: Logger
}

export class OrcaService {
  public readonly client: OpencodeClientV2
  public readonly directory: string

  private readonly logger: Logger
  private readonly planningService: PlanningService
  private readonly hitlService: HITLService
  private readonly dispatchService: DispatchService

  constructor(deps: OrcaServiceDeps) {
    this.client = deps.client
    this.directory = deps.directory
    this.logger = deps.logger ?? getLogger()

    this.planningService = new PlanningService(this.directory)
    this.hitlService = new HITLService({ client: this.client, logger: this.logger })
    this.dispatchService = new DispatchService({
      client: this.client,
      directory: this.directory,
      logger: this.logger,
    })
  }

  get hitl(): HITLService {
    return this.hitlService
  }

  get dispatch(): DispatchService {
    return this.dispatchService
  }

  get planner(): PlanningService {
    return this.planningService
  }

  async invoke(input: InvokeInput, ctx: ToolContext, options?: InvokeOptions): Promise<InvokeOutput> {
    try {
      const { result, sessionId } = await this.dispatchService.dispatchUserMessage(ctx, input, {
        onSessionCreated: options?.onSessionCreated,
        onToolPartUpdated: options?.onToolPartUpdated,
      })
      return this.transformResponse(result, sessionId)
    } catch (error) {
      return this.handleInvokeError(error, input.session_id)
    }
  }

  private async transformResponse(response: PlannerResponse, sessionId: string): Promise<InvokeOutput> {
    switch (response.type) {
      case 'answer':
        return {
          type: 'answer',
          session_id: sessionId,
          content: response.content,
        }

      case 'plan': {
        const plan = await this.planningService.getPlan(response.plan_id)
        if (!plan) {
          return {
            type: 'failure',
            session_id: sessionId,
            code: 'VALIDATION_ERROR',
            message: `Planner referenced non-existent plan: ${response.plan_id}`,
          }
        }

        if (response.stage === 'draft') {
          return {
            type: 'plan_created',
            session_id: sessionId,
            plan_id: plan.plan_id,
            goal: plan.goal,
            stage: 'draft',
          }
        }

        return {
          type: 'plan_submitted',
          session_id: sessionId,
          plan_id: plan.plan_id,
          goal: plan.goal,
          stage: 'proposal',
          step_count: plan.steps.length,
        }
      }

      case 'failure':
        return {
          type: 'failure',
          session_id: sessionId,
          code: response.code,
          message: response.message,
        }
    }
  }

  private handleInvokeError(error: unknown, sessionId?: string): InvokeOutput {
    if (error instanceof ParseError) {
      this.logger.error('Planner response parse error', {
        message: error.message,
        rawContent: error.rawContent,
        zodError: error.zodError?.issues,
      })
      return {
        type: 'failure',
        session_id: sessionId,
        code: 'PARSE_ERROR',
        message: error.message,
      }
    }

    const message = error instanceof Error ? error.message : String(error)
    this.logger.error('Invoke error', { error: message })
    return {
      type: 'failure',
      session_id: sessionId,
      code: 'AGENT_ERROR',
      message,
    }
  }
}
