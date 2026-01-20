import type { OpencodeClient as OpencodeClientV2 } from '@opencode-ai/sdk/v2'
import Identifier from '../../common/identifier'
import type { Logger } from '../../common/log'
import { getLogger } from '../../common/log'
import type { ExecutionService } from '../execution/service'
import type { HITLService } from '../hitl/service'
import type { PlanningService } from '../planning/service'
import type {
  AgentAnswer,
  AgentQuestion,
  OrcaDispatch,
  OrcaResponse,
  TaskDispatch,
  TaskResponse,
} from './schemas'

export interface DispatcherDeps {
  client: OpencodeClientV2
  directory: string
  planningService: PlanningService
  executionService: ExecutionService
  hitlService: HITLService
  logger?: Logger
}

export class DispatchService {
  private readonly client: OpencodeClientV2
  private readonly directory: string
  private readonly planningService: PlanningService
  private readonly executionService: ExecutionService
  private readonly hitlService: HITLService
  private readonly logger: Logger

  constructor(deps: DispatcherDeps) {
    this.client = deps.client
    this.directory = deps.directory
    this.planningService = deps.planningService
    this.executionService = deps.executionService
    this.hitlService = deps.hitlService
    this.logger = deps.logger ?? getLogger()
  }

  async dispatchToPlanner(
    dispatch: OrcaDispatch,
    sessionId?: string,
  ): Promise<{ response: OrcaResponse; sessionId: string }> {
    const targetSessionId = sessionId ?? Identifier.generateID('session')

    this.logger.info('Dispatching to planner', {
      sessionId: targetSessionId,
      hasPlanId: !!dispatch.plan_id,
    })

    // Create session if needed
    if (!sessionId) {
      await this.client.session.create({
        directory: this.directory,
        parentID: targetSessionId,
        title: 'Planner',
      })
    }

    // Send message to planner
    const result = await this.client.session.prompt({
      sessionID: targetSessionId,
      directory: this.directory,
      agent: 'planner',
      parts: [{ type: 'text', text: dispatch.message }],
    })

    // Parse response
    const response = this.parseOrcaResponse(result)

    return { response, sessionId: targetSessionId }
  }

  async askAgent(question: AgentQuestion): Promise<{ answer: AgentAnswer; sessionId: string }> {
    const targetSessionId = question.session_id ?? Identifier.generateID('session')

    this.logger.info('Asking agent', {
      agentId: question.agent_id,
      sessionId: targetSessionId,
    })

    // Create session if needed
    if (!question.session_id) {
      await this.client.session.create({
        directory: this.directory,
        parentID: targetSessionId,
        title: `Question to ${question.agent_id}`,
      })
    }

    // Send question to agent
    const result = await this.client.session.prompt({
      sessionID: targetSessionId,
      directory: this.directory,
      agent: question.agent_id,
      parts: [{ type: 'text', text: question.question }],
    })

    // Parse response
    const answer = this.parseAgentAnswer(result)

    return { answer, sessionId: targetSessionId }
  }

  async dispatchTask(
    task: TaskDispatch,
    agentId: string,
    sessionId?: string,
  ): Promise<{ response: TaskResponse; sessionId: string }> {
    const targetSessionId = sessionId ?? Identifier.generateID('session')

    this.logger.info('Dispatching task', {
      agentId,
      sessionId: targetSessionId,
      planId: task.plan_id,
      stepIndex: task.step_index,
    })

    // Create session if needed
    if (!sessionId) {
      await this.client.session.create({
        directory: this.directory,
        parentID: targetSessionId,
        title: `Task: ${task.description.slice(0, 50)}`,
      })
    }

    // Build task prompt
    const taskPrompt = this.buildTaskPrompt(task)

    // Send task to specialist
    const result = await this.client.session.prompt({
      sessionID: targetSessionId,
      directory: this.directory,
      agent: agentId,
      parts: [{ type: 'text', text: taskPrompt }],
    })

    // Parse response
    const response = this.parseTaskResponse(result)

    return { response, sessionId: targetSessionId }
  }

  getHITLService(): HITLService {
    return this.hitlService
  }

  private buildTaskPrompt(task: TaskDispatch): string {
    const lines = [
      '## Task Assignment',
      '',
      `**Plan ID:** ${task.plan_id}`,
      `**Step:** ${task.step_index + 1}`,
      '',
      '### Description',
      task.description,
    ]

    if (task.command) {
      lines.push('', '### Suggested Approach', task.command)
    }

    return lines.join('\n')
  }

  private parseOrcaResponse(result: unknown): OrcaResponse {
    // TODO: Implement response parsing
    //
    // 1. Extract the assistant message content from the session response
    // 2. Try to parse as JSON (strip markdown code fences if present)
    // 3. Validate against OrcaResponse schema (discriminated union: answer | plan | failure | interruption)
    // 4. If validation fails, attempt retry with correction prompt (up to maxRetries)
    // 5. If all retries exhausted, return Failure with VALIDATION_ERROR
    //
    // The planner agent is instructed to respond with structured JSON matching the Plan schema
    // when creating plans, or freeform text for direct answers.

    this.logger.debug('Parsing Orca response', { result })

    return {
      type: 'answer',
      content: 'Response parsing not yet implemented',
    }
  }

  private parseAgentAnswer(result: unknown): AgentAnswer {
    // TODO: Implement response parsing
    //
    // 1. Extract the assistant message content from the session response
    // 2. For question mode, agents respond with freeform text (Answer type)
    // 3. Wrap the content in an Answer response
    // 4. Handle interruptions (agent aborted) and failures (agent errors)

    this.logger.debug('Parsing agent answer', { result })

    return {
      type: 'answer',
      content: 'Response parsing not yet implemented',
    }
  }

  private parseTaskResponse(result: unknown): TaskResponse {
    // TODO: Implement response parsing
    //
    // 1. Extract the assistant message content from the session response
    // 2. Try to parse as JSON for structured Success response
    // 3. If not JSON, wrap raw content as Success with the content as summary
    // 4. Handle interruptions and failures
    // 5. Success should include: summary, artifacts (files modified), verification steps

    this.logger.debug('Parsing task response', { result })

    return {
      type: 'success',
      summary: 'Response parsing not yet implemented',
    }
  }
}
