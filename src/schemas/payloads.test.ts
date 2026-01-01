import { describe, expect, test } from 'bun:test'
import type { ZodTypeAny } from 'zod'
import {
  AnswerPayloadSchema,
  EscalationOptionSchema,
  EscalationPayloadSchema,
  FailurePayloadSchema,
  InterruptPayloadSchema,
  PlanPayloadSchema,
  PlanStepSchema,
  QuestionPayloadSchema,
  ResultPayloadSchema,
  TaskPayloadSchema,
  UserInputPayloadSchema,
} from './payloads'

// Valid fixtures for strict mode tests
const validFixtures: [string, ZodTypeAny, Record<string, unknown>][] = [
  ['TaskPayloadSchema', TaskPayloadSchema, { agent_id: 'a', prompt: 'p' }],
  ['ResultPayloadSchema', ResultPayloadSchema, { agent_id: 'a', content: 'c' }],
  ['PlanStepSchema', PlanStepSchema, { description: 'd' }],
  [
    'PlanPayloadSchema',
    PlanPayloadSchema,
    { agent_id: 'a', goal: 'g', steps: [{ description: 'd' }] },
  ],
  ['AnswerPayloadSchema', AnswerPayloadSchema, { agent_id: 'a', content: 'c' }],
  [
    'QuestionPayloadSchema',
    QuestionPayloadSchema,
    { agent_id: 'a', question: 'q', blocking: true },
  ],
  ['EscalationOptionSchema', EscalationOptionSchema, { label: 'l', value: 'v' }],
  [
    'EscalationPayloadSchema',
    EscalationPayloadSchema,
    {
      agent_id: 'a',
      decision_id: 'd',
      decision: 'd',
      options: [{ label: 'l', value: 'v' }],
      context: 'c',
    },
  ],
  ['UserInputPayloadSchema', UserInputPayloadSchema, { content: 'c' }],
  ['InterruptPayloadSchema', InterruptPayloadSchema, { reason: 'r' }],
  ['FailurePayloadSchema', FailurePayloadSchema, { code: 'AGENT_ERROR', message: 'm' }],
]

describe('strict mode rejects extra fields', () => {
  test.each(validFixtures)('%s', (_name, schema, valid) => {
    expect(() => schema.parse({ ...valid, extra: 'field' })).toThrow()
  })
})

describe('min(1) constraints reject empty values', () => {
  test('TaskPayloadSchema rejects empty prompt', () => {
    expect(() => TaskPayloadSchema.parse({ agent_id: 'a', prompt: '' })).toThrow()
  })

  test('PlanStepSchema rejects empty description', () => {
    expect(() => PlanStepSchema.parse({ description: '' })).toThrow()
  })

  test('PlanPayloadSchema rejects empty goal', () => {
    expect(() =>
      PlanPayloadSchema.parse({
        agent_id: 'a',
        goal: '',
        steps: [{ description: 'd' }],
      }),
    ).toThrow()
  })

  test('PlanPayloadSchema rejects empty steps array', () => {
    expect(() => PlanPayloadSchema.parse({ agent_id: 'a', goal: 'g', steps: [] })).toThrow()
  })

  test('QuestionPayloadSchema rejects empty question', () => {
    expect(() =>
      QuestionPayloadSchema.parse({ agent_id: 'a', question: '', blocking: true }),
    ).toThrow()
  })

  test('EscalationOptionSchema rejects empty label', () => {
    expect(() => EscalationOptionSchema.parse({ label: '', value: 'v' })).toThrow()
  })

  test('EscalationOptionSchema rejects empty value', () => {
    expect(() => EscalationOptionSchema.parse({ label: 'l', value: '' })).toThrow()
  })

  test('EscalationPayloadSchema rejects empty options array', () => {
    expect(() =>
      EscalationPayloadSchema.parse({
        agent_id: 'a',
        decision_id: 'd',
        decision: 'd',
        options: [],
        context: 'c',
      }),
    ).toThrow()
  })

  test('EscalationPayloadSchema rejects empty decision_id', () => {
    expect(() =>
      EscalationPayloadSchema.parse({
        agent_id: 'a',
        decision_id: '',
        decision: 'd',
        options: [{ label: 'l', value: 'v' }],
        context: 'c',
      }),
    ).toThrow()
  })

  test('InterruptPayloadSchema rejects empty reason', () => {
    expect(() => InterruptPayloadSchema.parse({ reason: '' })).toThrow()
  })

  test('FailurePayloadSchema rejects empty message', () => {
    expect(() => FailurePayloadSchema.parse({ code: 'AGENT_ERROR', message: '' })).toThrow()
  })
})

describe('intentional design decisions', () => {
  test('UserInputPayloadSchema allows empty content', () => {
    // Intentionally no .min(1) — users can send empty messages
    const result = UserInputPayloadSchema.parse({ content: '' })
    expect(result.content).toBe('')
  })
})
