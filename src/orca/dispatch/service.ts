import type { OpencodeClient as OpencodeClientV2 } from '@opencode-ai/sdk/v2'
import type { z } from 'zod'
import * as Identifier from '../../common/identifier'
import type { Logger } from '../../common/log'
import { getLogger } from '../../common/log'
import * as Dispatch from './schemas'

export interface DispatchServiceDeps {
  client: OpencodeClientV2
  directory: string
  logger?: Logger
}

export interface SendOptions<TResult extends z.ZodType> {
  agent: string
  message: string
  resultSchema: TResult
  sessionId?: string
  sessionTitle?: string
  maxRetries?: number
}

export interface SendResult<T> {
  result: T
  sessionId: string
}

/**
 * Generic dispatch service - sends messages to agents and parses responses.
 *
 * This is a "dumb pipe" that doesn't know about plans or execution state.
 * It handles:
 * - Session creation/reuse
 * - Sending prompts to agents
 * - Parsing responses against a provided schema
 * - Retry logic on validation failure
 *
 * Usage:
 *   // Dispatch a task to a specialist
 *   const { result, sessionId } = await dispatch.dispatchTask({
 *     type: 'task',
 *     agent: 'coder',
 *     description: 'Implement the feature',
 *   })
 *
 *   // Ask an agent a read-only question
 *   const { result, sessionId } = await dispatch.dispatchQuestion({
 *     type: 'agent_question',
 *     agent: 'researcher',
 *     question: 'What auth patterns exist in this codebase?',
 *   })
 */
export class DispatchService {
  private readonly client: OpencodeClientV2
  private readonly directory: string
  private readonly logger: Logger

  constructor(deps: DispatchServiceDeps) {
    this.client = deps.client
    this.directory = deps.directory
    this.logger = deps.logger ?? getLogger()
  }

  /**
   * Send a message to an agent and parse the response against a schema.
   */
  async send<TResult extends z.ZodType>(
    options: SendOptions<TResult>,
  ): Promise<SendResult<z.infer<TResult>>> {
    const { agent, message, resultSchema, maxRetries = 2 } = options
    const sessionId = options.sessionId ?? Identifier.generateID('session')

    this.logger.info('Dispatching to agent', { agent, sessionId })

    // Create session if new
    if (!options.sessionId) {
      await this.client.session.create({
        directory: this.directory,
        parentID: sessionId,
        title: options.sessionTitle ?? `Dispatch to ${agent}`,
      })
    }

    // Send message
    const response = await this.client.session.prompt({
      sessionID: sessionId,
      directory: this.directory,
      agent,
      parts: [{ type: 'text', text: message }],
    })

    // Parse response with retries
    const result = await this.parseWithRetries(response, resultSchema, sessionId, maxRetries)

    return { result, sessionId }
  }

  /**
   * Dispatch a task to a specialist agent.
   * Returns TaskResult (Success | Failure | Interruption).
   */
  async dispatchTask(
    task: Dispatch.Task,
    options?: { sessionId?: string; sessionTitle?: string; maxRetries?: number },
  ): Promise<SendResult<Dispatch.TaskResult>> {
    return this.send({
      agent: task.agent,
      message: this.formatTaskMessage(task),
      resultSchema: Dispatch.Task.result,
      sessionTitle: options?.sessionTitle ?? `Task: ${task.description.slice(0, 50)}`,
      ...options,
    })
  }

  /**
   * Dispatch a read-only question to an agent.
   * Returns AgentAnswer (Answer | Failure | Interruption).
   */
  async dispatchQuestion(
    question: Dispatch.AgentQuestion,
    options?: { sessionTitle?: string; maxRetries?: number },
  ): Promise<SendResult<Dispatch.AgentAnswer>> {
    return this.send({
      agent: question.agent,
      message: question.question,
      resultSchema: Dispatch.AgentQuestion.result,
      sessionId: question.session_id,
      sessionTitle: options?.sessionTitle ?? `Question to ${question.agent}`,
      ...options,
    })
  }

  private formatTaskMessage(task: Dispatch.Task): string {
    const lines = ['## Task', '', task.description]

    if (task.command) {
      lines.push('', '### Suggested Approach', task.command)
    }

    return lines.join('\n')
  }

  private async parseWithRetries<T extends z.ZodType>(
    response: unknown,
    schema: T,
    sessionId: string,
    maxRetries: number,
  ): Promise<z.infer<T>> {
    // TODO: Implement response parsing with retries
    //
    // 1. Extract the assistant message content from the session response
    // 2. Try to parse as JSON (strip markdown code fences if present)
    // 3. Validate against the provided schema
    // 4. If validation fails, send a correction prompt and retry (up to maxRetries)
    // 5. If all retries exhausted, throw an error

    this.logger.debug('Parsing response', { response, sessionId, maxRetries })

    // Placeholder - return a minimal valid response
    // This will be replaced with actual parsing logic
    const parsed = schema.safeParse({
      type: 'answer',
      content: 'Response parsing not yet implemented',
    })

    if (parsed.success) {
      return parsed.data
    }

    // Try success type for task results
    const successParsed = schema.safeParse({
      type: 'success',
      summary: 'Response parsing not yet implemented',
    })

    if (successParsed.success) {
      return successParsed.data
    }

    // Fall back to answer type
    return {
      type: 'answer',
      content: 'Response parsing not yet implemented',
    } as z.infer<T>
  }
}
