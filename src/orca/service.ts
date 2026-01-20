import type { OpencodeClient as OpencodeClientV2 } from '@opencode-ai/sdk/v2'
import type { Logger } from '../common/log'
import { getLogger } from '../common/log'
import { HITLService } from './hitl/service'
import { PlanningService } from './planning/service'

export interface OrcaServiceDeps {
  client: OpencodeClientV2
  directory: string
  logger?: Logger
}

// ============================================================================
// TODO: Implement actual orchestration logic (plan approval, execution, HITL)
// ============================================================================

export class OrcaService {
  private readonly client: OpencodeClientV2
  private readonly directory: string
  private readonly logger: Logger
  private readonly planningService: PlanningService
  private readonly hitlService: HITLService

  constructor(deps: OrcaServiceDeps) {
    this.client = deps.client
    this.directory = deps.directory
    this.logger = deps.logger ?? getLogger()

    this.planningService = new PlanningService(deps.directory)
    this.hitlService = new HITLService({ client: deps.client, logger: this.logger })
  }

  get hitl(): HITLService {
    return this.hitlService
  }

  get planner(): PlanningService {
    return this.planningService
  }
}
