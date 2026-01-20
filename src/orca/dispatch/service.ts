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
 * This is a "dumb pipe" that doesn't know about plans, tasks, or execution.
 * It handles:
 * - Session creation/reuse
 * - Sending prompts to agents
 * - Parsing responses against a provided schema
 * - Retry logic on validation failure
 *
 * Usage:
 *   const { result, sessionId } = await dispatch.send({
 *     agent: 'coder',
 *     message: 'Implement the feature',
 *     resultSchema: Dispatch.Task.result,
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
   * Convenience method for dispatching typed dispatch objects.
   * Automatically uses the paired result schema.
   */
  async dispatch<T extends Dispatch.Any>(
    dispatch: T,
    options?: { sessionId?: string; sessionTitle?: string; maxRetries?: number },
  ): Promise<SendResult<Dispatch.ResultFor<T>>> {
    // Get the result schema based on dispatch type
    const resultSchema = this.getResultSchema(dispatch)

    // Get agent from dispatch (Task and AgentQuestion have it, UserQuestion doesn't)
    const agent = this.getAgent(dispatch)

    const result = await this.send({
      agent,
      message: this.formatMessage(dispatch),
      resultSchema,
      ...options,
    })

    // Cast is safe because getResultSchema returns the correct schema for each dispatch type
    return result as SendResult<Dispatch.ResultFor<T>>
  }

  private getResultSchema(dispatch: Dispatch.Any): z.ZodType {
    switch (dispatch.type) {
      case 'task':
        return Dispatch.Task.result
      case 'agent_question':
        return Dispatch.AgentQuestion.result
      case 'user_question':
        return Dispatch.UserQuestion.result
    }
  }

  private getAgent(dispatch: Dispatch.Any): string {
    switch (dispatch.type) {
      case 'task':
        return dispatch.agent
      case 'agent_question':
        return dispatch.agent
      case 'user_question':
        // User questions go through HITL, not to an agent
        // This shouldn't be called for user questions
        throw new Error('UserQuestion dispatch should use HITL, not agent dispatch')
    }
  }

  private formatMessage(dispatch: Dispatch.Any): string {
    switch (dispatch.type) {
      case 'task':
        return this.formatTaskMessage(dispatch)
      case 'agent_question':
        return dispatch.question
      case 'user_question':
        throw new Error('UserQuestion dispatch should use HITL, not agent dispatch')
    }
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
