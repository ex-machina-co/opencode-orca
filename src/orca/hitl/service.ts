import type { OpencodeClient as OpencodeClientV2, QuestionAnswer, QuestionInfo } from '@opencode-ai/sdk/v2'
import type { Logger } from '../../common/log'
import { getLogger } from '../../common/log'
import { QUESTION_TIMEOUT_MS } from '../../plugin/constants'
import type { HITLQuestion, UserAnswer } from '../dispatch/schemas'

export type QuestionResult =
  | { type: 'answered'; answers: QuestionAnswer[] }
  | { type: 'rejected' }
  | { type: 'timeout' }

export interface HITLServiceDeps {
  client: OpencodeClientV2
  logger?: Logger
  timeoutMs?: number
}

export class HITLService {
  private readonly client: OpencodeClientV2
  private readonly logger: Logger
  private readonly timeoutMs: number
  private readonly pending = new Map<string, (result: QuestionResult) => void>()

  constructor(deps: HITLServiceDeps) {
    this.client = deps.client
    this.logger = deps.logger ?? getLogger()
    this.timeoutMs = deps.timeoutMs ?? QUESTION_TIMEOUT_MS
  }

  async askUser(sessionId: string, questions: HITLQuestion[]): Promise<UserAnswer | null> {
    const result = await this.askQuestion(sessionId, questions)

    if (result.type !== 'answered') {
      this.logger.warn('Question not answered', { type: result.type, sessionId })
      return null
    }

    return {
      answers: result.answers,
    }
  }

  async askQuestion(sessionId: string, questions: QuestionInfo[]): Promise<QuestionResult> {
    const result = await this.client.question.ask({
      questionAskInput: {
        sessionID: sessionId,
        questions: questions.map((q) => ({
          question: q.question,
          header: q.header,
          options: q.options,
        })),
      },
    })

    const questionId = result.data?.id
    if (!questionId) {
      throw new Error('Failed to create question: no ID returned')
    }

    this.logger.info('Question asked', { questionId, sessionId })

    return new Promise<QuestionResult>((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pending.has(questionId)) {
          this.pending.delete(questionId)
          this.logger.warn('Question timed out', { questionId, timeoutMs: this.timeoutMs })
          resolve({ type: 'timeout' })
        }
      }, this.timeoutMs)

      this.pending.set(questionId, (questionResult) => {
        clearTimeout(timeoutId)
        resolve(questionResult)
      })
    })
  }

  handleQuestionReplied(requestId: string, answers: QuestionAnswer[]): void {
    this.logger.debug('handleQuestionReplied', { requestId, pendingKeys: [...this.pending.keys()] })
    const resolver = this.pending.get(requestId)
    if (resolver) {
      this.logger.info('Resolved pending question', { requestId })
      this.pending.delete(requestId)
      resolver({ type: 'answered', answers })
    } else {
      this.logger.warn('No pending question found', { requestId })
    }
  }

  handleQuestionRejected(requestId: string): void {
    const resolver = this.pending.get(requestId)
    if (resolver) {
      this.logger.info('Question rejected', { requestId })
      this.pending.delete(requestId)
      resolver({ type: 'rejected' })
    } else {
      this.logger.warn('No pending question found', { requestId })
    }
  }

  hasPendingQuestions(): boolean {
    return this.pending.size > 0
  }

  pendingCount(): number {
    return this.pending.size
  }
}
