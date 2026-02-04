import type { ToolContext } from '@opencode-ai/plugin'
import type {
  Event,
  OpencodeClient as OpencodeClientV2,
  PermissionRuleset,
  Session,
  ToolPart,
} from '@opencode-ai/sdk/v2'
import type { ZodError, ZodType, z } from 'zod'
import * as Logging from '../../common/log'
import { PlannerResponse } from '../planning/schemas'
import type { InvokeInput } from '../tools/orca-invoke'
import * as Parser from './parser'
import { READ_ONLY_PERMISSIONS } from './permissions'
import * as Dispatch from './schemas'

export { ParseError } from './parser'

export interface DispatchServiceDeps {
  client: OpencodeClientV2
  directory: string
  logger?: Logging.Logger
}

export interface SendOptions<TResult extends z.ZodType> {
  agent: string
  message: string
  resultSchema: TResult
  parentSessionId: string
  targetSessionId?: string
  sessionTitle?: string
  maxRetries?: number
  permission?: PermissionRuleset
  onSessionCreated?: (sessionId: string) => void
  onToolPartUpdated?: (part: ToolPart) => void | Promise<void>
}

export interface SendResult<T> {
  result: T
  sessionId: string
}

/**
 * Generic dispatch service - sends messages to agents and parses responses.
 *
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
  private readonly logger: Logging.Logger

  constructor(deps: DispatchServiceDeps) {
    this.client = deps.client
    this.directory = deps.directory
    this.logger = deps.logger ?? Logging.getLogger()
  }

  async dispatchTask(
    ctx: ToolContext,
    task: Dispatch.Task,
    options?: {
      sessionTitle?: string
      maxRetries?: number
    },
  ): Promise<SendResult<Dispatch.TaskResult>> {
    return this.send({
      agent: task.agent,
      message: this.formatTaskMessage(task),
      resultSchema: Dispatch.Task.result,
      targetSessionId: task.session_id,
      parentSessionId: ctx.sessionID,
      sessionTitle: options?.sessionTitle ?? `Task: ${task.description.slice(0, 50)}`,
      ...options,
    })
  }

  async dispatchQuestion(
    ctx: ToolContext,
    question: Dispatch.AgentQuestion,
    options?: {
      sessionTitle?: string
      maxRetries?: number
    },
  ): Promise<SendResult<Dispatch.AgentAnswer>> {
    return this.send({
      agent: question.agent,
      message: question.question,
      resultSchema: Dispatch.AgentQuestion.result,
      targetSessionId: question.session_id,
      parentSessionId: ctx.sessionID,
      sessionTitle: options?.sessionTitle ?? `Question to ${question.agent}`,
      permission: READ_ONLY_PERMISSIONS,
      ...options,
    })
  }

  async dispatchUserMessage(
    ctx: ToolContext,
    input: InvokeInput,
    options?: {
      maxRetries?: number
      onSessionCreated?: (sessionId: string) => void | Promise<void>
      onToolPartUpdated?: (part: ToolPart) => void | Promise<void>
    },
  ): Promise<SendResult<PlannerResponse>> {
    return this.send({
      agent: 'planner',
      message: input.message,
      targetSessionId: input.session_id,
      resultSchema: PlannerResponse,
      sessionTitle: 'Planner session',
      parentSessionId: ctx.sessionID,
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

  private async send<TResult extends z.ZodType>(options: SendOptions<TResult>): Promise<SendResult<z.infer<TResult>>> {
    const { agent, message, resultSchema, maxRetries = 2, onToolPartUpdated } = options

    this.logger.info('Dispatching to agent', { agent, sessionId: options.targetSessionId })

    const session = await (async (): Promise<Session> => {
      if (options.targetSessionId) {
        const found = await this.client.session.get({ sessionID: options.targetSessionId }).catch(() => {})
        if (found?.data) return found.data
      }

      const response = await this.client.session.create({
        parentID: options.parentSessionId,
        directory: this.directory,
        title: options.sessionTitle ?? `Dispatch to ${agent}`,
        permission: options.permission,
      })

      if (!response.data) {
        throw new Error('No session data in response')
      }

      return response.data
    })()

    // Notify caller of session ID
    await options.onSessionCreated?.(session.id)

    // Set up event subscription if callback provided
    let stopEventStream: (() => void) | undefined
    if (onToolPartUpdated) {
      stopEventStream = this.subscribeToToolParts(session.id, onToolPartUpdated)
    }

    try {
      // Send message
      const response = await this.client.session.prompt({
        sessionID: session.id,
        directory: this.directory,
        agent,
        parts: [{ type: 'text', text: message }],
      })

      const result = await this.parseWithRetries(response, resultSchema, session.id, agent, maxRetries)

      return { result, sessionId: session.id }
    } finally {
      stopEventStream?.()
    }
  }

  private subscribeToToolParts(
    sessionId: string,
    onToolPartUpdated: (part: ToolPart) => void | Promise<void>,
  ): () => void {
    let stopped = false

    const processEvents = async () => {
      try {
        this.logger.info('Starting event stream subscription', { sessionId })
        const eventStream = await this.client.event.subscribe({ directory: this.directory })
        this.logger.info('Event stream connected', { sessionId })

        for await (const event of eventStream.stream) {
          if (stopped) {
            this.logger.info('Event stream stopped', { sessionId })
            break
          }

          this.logger.debug('Event received', { type: event.type, sessionId })

          if (this.isToolPartUpdateEvent(event, sessionId)) {
            this.logger.info('Tool part update', { partId: event.properties.part.id, sessionId })
            await onToolPartUpdated(event.properties.part as ToolPart)
          }
        }
      } catch (error) {
        if (!stopped) {
          this.logger.warn('Event stream error', { error, sessionId })
        }
      }
    }

    processEvents()

    return () => {
      stopped = true
    }
  }

  private isToolPartUpdateEvent(
    event: Event,
    sessionId: string,
  ): event is Event & {
    type: 'message.part.updated'
    properties: { part: ToolPart }
  } {
    if (event.type !== 'message.part.updated') return false
    const part = event.properties.part
    return part.sessionID === sessionId && part.type === 'tool'
  }

  private async parseWithRetries<T extends ZodType>(
    response: Awaited<ReturnType<OpencodeClientV2['session']['prompt']>>,
    schema: T,
    sessionId: string,
    agent: string,
    maxRetries: number,
  ): Promise<z.infer<T>> {
    if (!response.data) {
      const errorInfo = 'error' in response ? response.error : 'Unknown error'
      throw new Parser.ParseError(`SDK error: ${JSON.stringify(errorInfo)}`, '')
    }

    const textContent = Parser.extractTextContent(response.data.parts)

    if (!textContent) {
      throw new Parser.ParseError('No text content in response', textContent ?? '')
    }

    let lastError: ZodError | undefined
    let currentContent = textContent

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const jsonContent = Parser.stripMarkdownCodeFences(currentContent)

      // Try to parse as JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(jsonContent)
      } catch {
        const error = new Parser.ParseError(
          `Invalid JSON in response (attempt ${attempt + 1}/${maxRetries + 1})`,
          currentContent,
        )

        if (attempt === maxRetries) {
          throw error
        }

        this.logger.warn('JSON parse failed, requesting correction', {
          sessionId,
          attempt: attempt + 1,
        })

        currentContent = await this.requestCorrection(sessionId, agent, Parser.formatJsonErrorPrompt(currentContent))
        continue
      }

      // Validate against schema
      const result = schema.safeParse(parsed)

      if (result.success) {
        return result.data
      }

      lastError = result.error

      if (attempt === maxRetries) {
        throw new Parser.ParseError(
          `Schema validation failed after ${maxRetries + 1} attempts`,
          currentContent,
          lastError,
        )
      }

      this.logger.warn('Schema validation failed, requesting correction', {
        sessionId,
        attempt: attempt + 1,
        issues: result.error.issues,
      })

      currentContent = await this.requestCorrection(sessionId, agent, Parser.formatCorrectionPrompt(result.error))
    }

    // TypeScript requires this, but we'll never reach here
    throw new Parser.ParseError('Unexpected parse error', currentContent, lastError)
  }

  private async requestCorrection(sessionId: string, agent: string, correctionPrompt: string): Promise<string> {
    const response = await this.client.session.prompt({
      sessionID: sessionId,
      directory: this.directory,
      agent,
      parts: [{ type: 'text', text: correctionPrompt }],
    })

    if (!response.data) {
      throw new Parser.ParseError('No data in correction response', '')
    }

    const content = Parser.extractTextContent(response.data.parts)
    if (!content) {
      throw new Parser.ParseError('No text content in correction response', '')
    }

    return content
  }
}
