import { describe, expect, test } from 'bun:test'
import { MessageEnvelopeSchema } from '../../schemas/messages'
import { type ResponseType, ResponseTypeSchema } from '../config'
import {
  TYPE_GUIDANCE,
  createResponseExamples,
  generateResponseFormatInstructions,
} from '../response-format'

describe('createResponseExamples', () => {
  const responseTypes: ResponseType[] = ['answer', 'plan', 'question', 'failure']

  test.each(responseTypes)('%s example validates against MessageEnvelopeSchema', (type) => {
    const examples = createResponseExamples('test-agent')
    const result = MessageEnvelopeSchema.safeParse(examples[type])

    if (!result.success) {
      console.error(`Validation errors for ${type}:`, result.error.format())
    }
    expect(result.success).toBe(true)
  })

  test('uses provided agent_id in all examples', () => {
    const examples = createResponseExamples('my-custom-agent')

    expect(examples.answer.agent_id).toBe('my-custom-agent')
    expect(examples.plan.agent_id).toBe('my-custom-agent')
    expect(examples.question.agent_id).toBe('my-custom-agent')
    expect(examples.failure.agent_id).toBe('my-custom-agent')
  })

  test('no examples contain session_id', () => {
    const examples = createResponseExamples('test-agent')

    for (const [type, example] of Object.entries(examples)) {
      const json = JSON.stringify(example)
      expect(json).not.toContain('session_id')
    }
  })
})

describe('TYPE_GUIDANCE', () => {
  test('has guidance for all response types', () => {
    const responseTypes: ResponseType[] = ['answer', 'plan', 'question', 'failure']
    for (const type of responseTypes) {
      expect(TYPE_GUIDANCE[type]).toBeDefined()
      expect(TYPE_GUIDANCE[type].length).toBeGreaterThan(10)
    }
  })
})

describe('generateResponseFormatInstructions', () => {
  test('returns empty string for empty responseTypes', () => {
    const result = generateResponseFormatInstructions('orca', [])
    expect(result).toBe('')
  })

  test.each(ResponseTypeSchema.options)(
    'generates correct format instructions for %s response type',
    (type) => {
      const result = generateResponseFormatInstructions('test-agent', [type])
      expect(result).toMatchSnapshot()
    },
  )

  test('generates correct format instructions for ALL response types', () => {
    expect(
      generateResponseFormatInstructions('test-agent', ResponseTypeSchema.options),
    ).toMatchSnapshot()
  })

  test('includes MUST respond directive', () => {
    const result = generateResponseFormatInstructions('coder', ['answer'])
    expect(result).toContain('MUST respond with a valid JSON message envelope')
  })

  test('includes only specified response types', () => {
    const result = generateResponseFormatInstructions('coder', ['answer', 'failure'])

    expect(result).toContain('"type": "answer"')
    expect(result).toContain('"type": "failure"')
    expect(result).not.toContain('"type": "plan"')
    expect(result).not.toContain('"type": "escalation"')
    expect(result).not.toContain('"type": "question"')
  })

  test('includes all types for planner', () => {
    const types: ResponseType[] = ['plan', 'question', 'answer', 'failure']
    const result = generateResponseFormatInstructions('planner', types)

    for (const type of types) {
      expect(result).toContain(`"type": "${type}"`)
    }
  })

  test('replaces agent_id placeholder', () => {
    const result = generateResponseFormatInstructions('my-agent', ['answer'])
    expect(result).toContain('"agent_id": "my-agent"')
    expect(result).not.toContain('<agent_id>')
  })

  test('includes type selection guidance', () => {
    const result = generateResponseFormatInstructions('planner', ['plan', 'answer'])
    expect(result).toContain('Type Selection Guidance')
    expect(result).toContain('**plan**:')
    expect(result).toContain('**answer**:')
  })

  test('lists allowed response types', () => {
    const result = generateResponseFormatInstructions('coder', ['answer', 'failure'])
    expect(result).toContain('`answer`')
    expect(result).toContain('`failure`')
  })
})
