import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { OpencodeClient, Part, TextPart } from '@opencode-ai/sdk/v2'
import { DispatchService, ParseError } from '../service'

const makeTextPart = (text: string): TextPart => ({
  id: 'part_1',
  sessionID: 'ses_1',
  messageID: 'msg_1',
  type: 'text',
  text,
})

const makePromptResponse = (parts: Part[]) => ({
  data: {
    info: {
      id: 'msg_1',
      sessionID: 'ses_1',
      role: 'assistant' as const,
      time: { created: Date.now() },
      parentID: 'parent_1',
      modelID: 'model_1',
      providerID: 'provider_1',
      mode: 'default',
      agent: 'coder',
      path: { cwd: '/tmp', root: '/tmp' },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    },
    parts,
  },
  error: undefined,
  request: new Request('http://localhost'),
  response: new Response(),
})

const makeErrorResponse = () => ({
  data: undefined,
  error: { name: 'NotFoundError' as const, data: { message: 'Session not found' } },
  request: new Request('http://localhost'),
  response: new Response(),
})

function createMockClient() {
  return {
    session: {
      create: mock(() => Promise.resolve({ data: { id: 'ses_1' } })),
      prompt: mock(() => Promise.resolve(makePromptResponse([]))),
    },
  } as unknown as OpencodeClient
}

describe('DispatchService', () => {
  let mockClient: OpencodeClient
  let service: DispatchService

  beforeEach(() => {
    mockClient = createMockClient()
    service = new DispatchService({
      client: mockClient,
      directory: '/tmp/test',
    })
  })

  describe('dispatchTask', () => {
    test('parses valid JSON response on first attempt', async () => {
      const validJson = '{"type": "success", "summary": "Task completed"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      const { result } = await service.dispatchTask({
        type: 'task',
        agent: 'coder',
        description: 'Do something',
      })

      expect(result).toEqual({ type: 'success', summary: 'Task completed' })
    })

    test('strips markdown code fences before parsing', async () => {
      const wrappedJson = '```json\n{"type": "success", "summary": "Done"}\n```'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(wrappedJson)]),
      )

      const { result } = await service.dispatchTask({
        type: 'task',
        agent: 'coder',
        description: 'Do something',
      })

      expect(result).toEqual({ type: 'success', summary: 'Done' })
    })

    test('creates session when sessionId not provided', async () => {
      const validJson = '{"type": "success", "summary": "Done"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      await service.dispatchTask({
        type: 'task',
        agent: 'coder',
        description: 'Do something',
      })

      expect(mockClient.session.create).toHaveBeenCalledTimes(1)
    })

    test('skips session creation when sessionId provided', async () => {
      const validJson = '{"type": "success", "summary": "Done"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      await service.dispatchTask(
        { type: 'task', agent: 'coder', description: 'Do something' },
        { sessionId: 'existing_session' },
      )

      expect(mockClient.session.create).not.toHaveBeenCalled()
    })

    test('formats task message correctly', async () => {
      const validJson = '{"type": "success", "summary": "Done"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      await service.dispatchTask({
        type: 'task',
        agent: 'coder',
        description: 'Implement feature X',
      })

      const promptCall = (mockClient.session.prompt as ReturnType<typeof mock>).mock.calls[0][0]
      expect(promptCall.parts[0].text).toContain('## Task')
      expect(promptCall.parts[0].text).toContain('Implement feature X')
    })

    test('includes command in task message when provided', async () => {
      const validJson = '{"type": "success", "summary": "Done"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      await service.dispatchTask({
        type: 'task',
        agent: 'coder',
        description: 'Implement feature X',
        command: 'Start with the tests',
      })

      const promptCall = (mockClient.session.prompt as ReturnType<typeof mock>).mock.calls[0][0]
      expect(promptCall.parts[0].text).toContain('### Suggested Approach')
      expect(promptCall.parts[0].text).toContain('Start with the tests')
    })
  })

  describe('dispatchQuestion', () => {
    test('parses valid answer response', async () => {
      const validJson = '{"type": "answer", "content": "The answer is 42"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      const { result } = await service.dispatchQuestion({
        type: 'agent_question',
        agent: 'researcher',
        question: 'What is the meaning of life?',
      })

      expect(result).toEqual({ type: 'answer', content: 'The answer is 42' })
    })

    test('sends question to correct agent', async () => {
      const validJson = '{"type": "answer", "content": "The answer is 42"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      await service.dispatchQuestion({
        type: 'agent_question',
        agent: 'researcher',
        question: 'What is the meaning of life?',
      })

      const promptCall = (mockClient.session.prompt as ReturnType<typeof mock>).mock.calls[0][0]
      expect(promptCall.agent).toBe('researcher')
      expect(promptCall.parts[0].text).toBe('What is the meaning of life?')
    })

    test('reuses session_id when provided', async () => {
      const validJson = '{"type": "answer", "content": "Follow-up answer"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([makeTextPart(validJson)]),
      )

      await service.dispatchQuestion({
        type: 'agent_question',
        agent: 'researcher',
        question: 'Follow-up question',
        session_id: 'session_existing123',
      })

      expect(mockClient.session.create).not.toHaveBeenCalled()
      const promptCall = (mockClient.session.prompt as ReturnType<typeof mock>).mock.calls[0][0]
      expect(promptCall.sessionID).toBe('session_existing123')
    })
  })

  describe('retry logic', () => {
    test('retries on JSON parse error and succeeds', async () => {
      const invalidJson = 'I think the answer is...'
      const validJson = '{"type": "success", "summary": "Fixed"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>)
        .mockResolvedValueOnce(makePromptResponse([makeTextPart(invalidJson)]))
        .mockResolvedValueOnce(makePromptResponse([makeTextPart(validJson)]))

      const { result } = await service.dispatchTask(
        { type: 'task', agent: 'coder', description: 'Do something' },
        { maxRetries: 1 },
      )

      expect(result).toEqual({ type: 'success', summary: 'Fixed' })
      expect(mockClient.session.prompt).toHaveBeenCalledTimes(2)
    })

    test('retries on schema validation error and succeeds', async () => {
      const wrongType = '{"type": "failure", "code": "unknown", "message": "oops"}'
      const validJson = '{"type": "success", "summary": "Fixed"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>)
        .mockResolvedValueOnce(makePromptResponse([makeTextPart(wrongType)]))
        .mockResolvedValueOnce(makePromptResponse([makeTextPart(validJson)]))

      const { result } = await service.dispatchTask(
        { type: 'task', agent: 'coder', description: 'Do something' },
        { maxRetries: 1 },
      )

      expect(result).toEqual({ type: 'success', summary: 'Fixed' })
      expect(mockClient.session.prompt).toHaveBeenCalledTimes(2)
    })

    test('passes agent to correction requests', async () => {
      const invalidJson = 'not json'
      const validJson = '{"type": "success", "summary": "Fixed"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>)
        .mockResolvedValueOnce(makePromptResponse([makeTextPart(invalidJson)]))
        .mockResolvedValueOnce(makePromptResponse([makeTextPart(validJson)]))

      await service.dispatchTask(
        { type: 'task', agent: 'coder', description: 'Do something' },
        { maxRetries: 1 },
      )

      // Second call is the correction request - should include agent
      const correctionCall = (mockClient.session.prompt as ReturnType<typeof mock>).mock.calls[1][0]
      expect(correctionCall.agent).toBe('coder')
    })

    test('throws after exhausting retries on JSON error', async () => {
      const invalidJson = 'not json at all'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValue(
        makePromptResponse([makeTextPart(invalidJson)]),
      )

      const error = await service
        .dispatchTask(
          { type: 'task', agent: 'coder', description: 'Do something' },
          { maxRetries: 1 },
        )
        .catch((e) => e)

      expect(error).toBeInstanceOf(ParseError)
      // Initial + 1 retry = 2 calls
      expect(mockClient.session.prompt).toHaveBeenCalledTimes(2)
    })

    test('throws after exhausting retries on schema error', async () => {
      const invalidSchema = '{"type": "wrong"}'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValue(
        makePromptResponse([makeTextPart(invalidSchema)]),
      )

      const error = await service
        .dispatchTask(
          { type: 'task', agent: 'coder', description: 'Do something' },
          { maxRetries: 1 },
        )
        .catch((e) => e)

      expect(error).toBeInstanceOf(ParseError)
      expect(error.zodError).toBeDefined()
      expect(error.message).toContain('Schema validation failed')
    })

    test('uses default maxRetries of 2', async () => {
      const invalidJson = 'not json'
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValue(
        makePromptResponse([makeTextPart(invalidJson)]),
      )

      const error = await service
        .dispatchTask({ type: 'task', agent: 'coder', description: 'Do something' })
        .catch((e) => e)

      expect(error).toBeInstanceOf(ParseError)
      // Initial + 2 retries = 3 calls
      expect(mockClient.session.prompt).toHaveBeenCalledTimes(3)
    })
  })

  describe('error handling', () => {
    test('throws when SDK returns error instead of data', async () => {
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makeErrorResponse(),
      )

      const error = await service
        .dispatchTask({ type: 'task', agent: 'coder', description: 'Do something' })
        .catch((e) => e)

      expect(error).toBeInstanceOf(ParseError)
    })

    test('throws when response has no text parts', async () => {
      ;(mockClient.session.prompt as ReturnType<typeof mock>).mockResolvedValueOnce(
        makePromptResponse([]),
      )

      const error = await service
        .dispatchTask({ type: 'task', agent: 'coder', description: 'Do something' })
        .catch((e) => e)

      expect(error).toBeInstanceOf(ParseError)
      expect(error.message).toContain('No text content in response')
    })
  })
})
