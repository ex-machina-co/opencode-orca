import { describe, expect, test } from 'bun:test'
import type { Part, TextPart } from '@opencode-ai/sdk/v2'
import { z } from 'zod'
import {
  ParseError,
  extractTextContent,
  formatCorrectionPrompt,
  formatJsonErrorPrompt,
  stripMarkdownCodeFences,
  tryParseAndValidate,
} from '../parser'

const makeTextPart = (text: string): TextPart => ({
  id: 'part_1',
  sessionID: 'ses_1',
  messageID: 'msg_1',
  type: 'text',
  text,
})

const makeToolPart = (): Part => ({
  id: 'part_2',
  sessionID: 'ses_1',
  messageID: 'msg_1',
  type: 'tool',
  callID: 'call_1',
  tool: 'some_tool',
  state: {
    status: 'completed',
    input: {},
    output: 'tool output',
    title: 'Tool',
    metadata: {},
    time: { start: 0, end: 1 },
  },
})

describe('extractTextContent', () => {
  test('returns null for empty parts array', () => {
    expect(extractTextContent([])).toBeNull()
  })

  test('returns null when no text parts', () => {
    expect(extractTextContent([makeToolPart()])).toBeNull()
  })

  test('extracts text from single text part', () => {
    const result = extractTextContent([makeTextPart('Hello world')])
    expect(result).toBe('Hello world')
  })

  test('concatenates multiple text parts with newlines', () => {
    const result = extractTextContent([makeTextPart('Line 1'), makeTextPart('Line 2')])
    expect(result).toBe('Line 1\nLine 2')
  })

  test('ignores non-text parts', () => {
    const result = extractTextContent([makeTextPart('Hello'), makeToolPart(), makeTextPart('World')])
    expect(result).toBe('Hello\nWorld')
  })
})

describe('stripMarkdownCodeFences', () => {
  test('returns bare JSON unchanged', () => {
    const json = '{"type": "success"}'
    expect(stripMarkdownCodeFences(json)).toBe(json)
  })

  test('strips ```json code fence', () => {
    const input = '```json\n{"type": "success"}\n```'
    expect(stripMarkdownCodeFences(input)).toBe('{"type": "success"}')
  })

  test('strips ``` code fence without language', () => {
    const input = '```\n{"type": "success"}\n```'
    expect(stripMarkdownCodeFences(input)).toBe('{"type": "success"}')
  })

  test('handles code fence with extra whitespace', () => {
    const input = '  ```json  \n{"type": "success"}\n```  '
    expect(stripMarkdownCodeFences(input)).toBe('{"type": "success"}')
  })

  test('handles multiline JSON inside code fence', () => {
    const input = '```json\n{\n  "type": "success",\n  "summary": "Done"\n}\n```'
    expect(stripMarkdownCodeFences(input)).toBe('{\n  "type": "success",\n  "summary": "Done"\n}')
  })

  test('is case insensitive for language identifier', () => {
    const input = '```JSON\n{"type": "success"}\n```'
    expect(stripMarkdownCodeFences(input)).toBe('{"type": "success"}')
  })

  test('trims whitespace from content inside fence', () => {
    const input = '```json\n  {"type": "success"}  \n```'
    expect(stripMarkdownCodeFences(input)).toBe('{"type": "success"}')
  })
})

describe('tryParseAndValidate', () => {
  const TestSchema = z.object({
    type: z.literal('success'),
    summary: z.string(),
  })

  test('returns success for valid JSON matching schema', () => {
    const content = '{"type": "success", "summary": "Task completed"}'
    const result = tryParseAndValidate(content, TestSchema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ type: 'success', summary: 'Task completed' })
    }
  })

  test('returns success for JSON wrapped in code fence', () => {
    const content = '```json\n{"type": "success", "summary": "Done"}\n```'
    const result = tryParseAndValidate(content, TestSchema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ type: 'success', summary: 'Done' })
    }
  })

  test('returns json_error for invalid JSON', () => {
    const content = 'not valid json'
    const result = tryParseAndValidate(content, TestSchema)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.type).toBe('json_error')
      expect(result.content).toBe(content)
    }
  })

  test('returns schema_error for JSON not matching schema', () => {
    const content = '{"type": "failure", "message": "oops"}'
    const result = tryParseAndValidate(content, TestSchema)

    expect(result.success).toBe(false)
    if (!result.success && result.type === 'schema_error') {
      expect(result.error).toBeDefined()
    }
  })

  test('returns schema_error for missing required fields', () => {
    const content = '{"type": "success"}'
    const result = tryParseAndValidate(content, TestSchema)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.type).toBe('schema_error')
    }
  })
})

describe('formatCorrectionPrompt', () => {
  test('formats single validation error', () => {
    // Create a real ZodError by failing validation
    const schema = z.object({ summary: z.string() })
    const result = schema.safeParse({ summary: 123 })
    if (result.success) throw new Error('Expected validation to fail')

    const prompt = formatCorrectionPrompt(result.error)

    expect(prompt).toContain('at "summary"')
    expect(prompt).toContain('valid JSON only')
  })

  test('formats multiple validation errors', () => {
    const schema = z.object({
      type: z.literal('success'),
      summary: z.string(),
    })
    const result = schema.safeParse({ type: 'failure' })
    if (result.success) throw new Error('Expected validation to fail')

    const prompt = formatCorrectionPrompt(result.error)

    // Should have errors for both fields
    expect(prompt).toContain('at "')
  })

  test('handles root-level errors', () => {
    const schema = z.object({ type: z.string() })
    const result = schema.safeParse('not an object')
    if (result.success) throw new Error('Expected validation to fail')

    const prompt = formatCorrectionPrompt(result.error)

    expect(prompt).toContain('at root')
  })
})

describe('formatJsonErrorPrompt', () => {
  test('includes original content', () => {
    const content = 'I think the answer is...'
    const prompt = formatJsonErrorPrompt(content)

    expect(prompt).toContain('could not be parsed as JSON')
    expect(prompt).toContain('I think the answer is...')
  })
})

describe('ParseError', () => {
  test('stores raw content', () => {
    const error = new ParseError('Parse failed', 'raw content here')
    expect(error.rawContent).toBe('raw content here')
    expect(error.name).toBe('ParseError')
  })

  test('stores zod error when provided', () => {
    const zodError = new z.ZodError([{ code: 'custom', path: [], message: 'test error' }])
    const error = new ParseError('Validation failed', 'content', zodError)

    expect(error.zodError).toBe(zodError)
  })
})
