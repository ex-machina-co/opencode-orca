import { describe, expect, test } from 'bun:test'
import type { ZodTypeAny } from 'zod'
import {
  AnnotationSchema,
  AnswerFieldsSchema,
  CheckpointFieldsSchema,
  FailureFieldsSchema,
  InterruptFieldsSchema,
  PlanContextSchema,
  PlanFieldsSchema,
  PlanStepSchema,
  QuestionFieldsSchema,
  SourceSchema,
  TaskFieldsSchema,
} from '../payloads'

// Valid fixtures for strict mode tests
const validFixtures: [string, ZodTypeAny, Record<string, unknown>][] = [
  ['TaskFieldsSchema', TaskFieldsSchema, { agent_id: 'a', prompt: 'p' }],
  ['PlanStepSchema', PlanStepSchema, { description: 'd' }],
  [
    'PlanFieldsSchema',
    PlanFieldsSchema,
    {
      agent_id: 'a',
      goal: 'g',
      steps: [{ description: 'd' }],
      assumptions: ['a'],
      files_touched: ['f'],
      verification: ['v'],
      risks: ['r'],
    },
  ],
  ['SourceSchema', SourceSchema, { type: 'file', ref: 'src/index.ts' }],
  ['AnnotationSchema', AnnotationSchema, { type: 'note', content: 'n' }],
  ['AnswerFieldsSchema', AnswerFieldsSchema, { agent_id: 'a', content: 'c' }],
  ['QuestionFieldsSchema', QuestionFieldsSchema, { agent_id: 'a', question: 'q', blocking: true }],
  ['InterruptFieldsSchema', InterruptFieldsSchema, { reason: 'r' }],
  ['FailureFieldsSchema', FailureFieldsSchema, { code: 'AGENT_ERROR', message: 'm' }],
  ['CheckpointFieldsSchema', CheckpointFieldsSchema, { agent_id: 'a', prompt: 'p' }],
  ['PlanContextSchema', PlanContextSchema, { goal: 'g', step_index: 0, approved_remaining: false }],
]

describe('descriptions', () => {
  test.each(validFixtures)('%s', (_name, schema) => {
    expect(schema.description).toMatchSnapshot()
    expect(schema.toJSONSchema()).toMatchSnapshot()
  })
})

describe('strict mode rejects extra fields', () => {
  test.each(validFixtures)('%s', (_name, schema, valid) => {
    expect(() => schema.parse({ ...valid, extra: 'field' })).toThrow()
  })
})

describe('min(1) constraints reject empty values', () => {
  test('TaskFieldsSchema rejects empty prompt', () => {
    expect(() => TaskFieldsSchema.parse({ agent_id: 'a', prompt: '' })).toThrow()
  })

  test('PlanStepSchema rejects empty description', () => {
    expect(() => PlanStepSchema.parse({ description: '' })).toThrow()
  })

  test('PlanFieldsSchema rejects empty goal', () => {
    expect(() =>
      PlanFieldsSchema.parse({
        agent_id: 'a',
        goal: '',
        steps: [{ description: 'd' }],
        assumptions: ['a'],
        files_touched: ['f'],
        verification: ['v'],
        risks: ['r'],
      }),
    ).toThrow()
  })

  test('PlanFieldsSchema rejects empty steps array', () => {
    expect(() =>
      PlanFieldsSchema.parse({
        agent_id: 'a',
        goal: 'g',
        steps: [],
        assumptions: ['a'],
        files_touched: ['f'],
        verification: ['v'],
        risks: ['r'],
      }),
    ).toThrow()
  })

  test('PlanFieldsSchema rejects empty verification array', () => {
    expect(() =>
      PlanFieldsSchema.parse({
        agent_id: 'a',
        goal: 'g',
        steps: [{ description: 'd' }],
        assumptions: ['a'],
        files_touched: ['f'],
        verification: [],
        risks: ['r'],
      }),
    ).toThrow()
  })

  test('PlanFieldsSchema rejects empty risks array', () => {
    expect(() =>
      PlanFieldsSchema.parse({
        agent_id: 'a',
        goal: 'g',
        steps: [{ description: 'd' }],
        assumptions: ['a'],
        files_touched: ['f'],
        verification: ['v'],
        risks: [],
      }),
    ).toThrow()
  })

  test('PlanFieldsSchema rejects empty assumptions array', () => {
    expect(() =>
      PlanFieldsSchema.parse({
        agent_id: 'a',
        goal: 'g',
        steps: [{ description: 'd' }],
        assumptions: [],
        files_touched: ['f'],
        verification: ['v'],
        risks: ['r'],
      }),
    ).toThrow()
  })

  test('PlanFieldsSchema rejects empty files_touched array', () => {
    expect(() =>
      PlanFieldsSchema.parse({
        agent_id: 'a',
        goal: 'g',
        steps: [{ description: 'd' }],
        assumptions: ['a'],
        files_touched: [],
        verification: ['v'],
        risks: ['r'],
      }),
    ).toThrow()
  })

  test('QuestionFieldsSchema rejects empty question', () => {
    expect(() =>
      QuestionFieldsSchema.parse({ agent_id: 'a', question: '', blocking: true }),
    ).toThrow()
  })

  test('InterruptFieldsSchema rejects empty reason', () => {
    expect(() => InterruptFieldsSchema.parse({ reason: '' })).toThrow()
  })

  test('FailureFieldsSchema rejects empty message', () => {
    expect(() => FailureFieldsSchema.parse({ code: 'AGENT_ERROR', message: '' })).toThrow()
  })
})

describe('CheckpointFieldsSchema', () => {
  test('accepts minimal checkpoint payload', () => {
    const payload = { agent_id: 'coder', prompt: 'Write tests' }
    expect(CheckpointFieldsSchema.parse(payload)).toEqual(payload)
  })

  test('accepts full checkpoint payload with optional fields', () => {
    const payload = {
      agent_id: 'coder',
      prompt: 'Write tests',
      step_index: 2,
      plan_goal: 'Implement feature X',
    }
    expect(CheckpointFieldsSchema.parse(payload)).toEqual(payload)
  })

  test('rejects empty prompt', () => {
    expect(() => CheckpointFieldsSchema.parse({ agent_id: 'a', prompt: '' })).toThrow()
  })

  test('rejects negative step_index', () => {
    expect(() =>
      CheckpointFieldsSchema.parse({ agent_id: 'a', prompt: 'p', step_index: -1 }),
    ).toThrow()
  })
})

describe('PlanContextSchema', () => {
  test('accepts valid plan context', () => {
    const context = { goal: 'Deploy app', step_index: 0, approved_remaining: false }
    expect(PlanContextSchema.parse(context)).toEqual(context)
  })

  test('rejects empty goal', () => {
    expect(() =>
      PlanContextSchema.parse({ goal: '', step_index: 0, approved_remaining: false }),
    ).toThrow()
  })

  test('rejects negative step_index', () => {
    expect(() =>
      PlanContextSchema.parse({ goal: 'g', step_index: -1, approved_remaining: false }),
    ).toThrow()
  })

  test('requires all fields (no optionals)', () => {
    expect(() => PlanContextSchema.parse({ goal: 'g', step_index: 0 })).toThrow()
    expect(() => PlanContextSchema.parse({ goal: 'g', approved_remaining: false })).toThrow()
  })
})

describe('TaskFieldsSchema with plan_context', () => {
  test('accepts task payload with plan_context', () => {
    const payload = {
      agent_id: 'coder',
      prompt: 'Write code',
      plan_context: {
        goal: 'Build feature',
        step_index: 1,
        approved_remaining: true,
      },
    }
    expect(TaskFieldsSchema.parse(payload)).toEqual(payload)
  })

  test('accepts task payload without plan_context', () => {
    const payload = { agent_id: 'coder', prompt: 'Write code' }
    expect(TaskFieldsSchema.parse(payload)).toEqual(payload)
  })
})

describe('SourceSchema', () => {
  test('accepts file source', () => {
    const source = { type: 'file' as const, ref: 'src/index.ts' }
    expect(SourceSchema.parse(source)).toEqual(source)
  })

  test('accepts url source', () => {
    const source = { type: 'url' as const, ref: 'https://example.com' }
    expect(SourceSchema.parse(source)).toEqual(source)
  })

  test('accepts artifact source', () => {
    const source = { type: 'artifact' as const, ref: 'output.json' }
    expect(SourceSchema.parse(source)).toEqual(source)
  })

  test('accepts optional fields', () => {
    const source = {
      type: 'file' as const,
      ref: 'src/index.ts',
      title: 'Main entry',
      excerpt: 'lines 1-10',
    }
    expect(SourceSchema.parse(source)).toEqual(source)
  })

  test('rejects invalid type', () => {
    expect(() => SourceSchema.parse({ type: 'invalid', ref: 'test' })).toThrow()
  })
})

describe('AnnotationSchema', () => {
  test('accepts note annotation', () => {
    const annotation = { type: 'note' as const, content: 'Important note' }
    expect(AnnotationSchema.parse(annotation)).toEqual(annotation)
  })

  test('accepts warning annotation', () => {
    const annotation = { type: 'warning' as const, content: 'Be careful' }
    expect(AnnotationSchema.parse(annotation)).toEqual(annotation)
  })

  test('accepts assumption annotation', () => {
    const annotation = { type: 'assumption' as const, content: 'Assuming X' }
    expect(AnnotationSchema.parse(annotation)).toEqual(annotation)
  })

  test('accepts caveat annotation', () => {
    const annotation = { type: 'caveat' as const, content: 'This may change' }
    expect(AnnotationSchema.parse(annotation)).toEqual(annotation)
  })

  test('rejects invalid type', () => {
    expect(() => AnnotationSchema.parse({ type: 'invalid', content: 'test' })).toThrow()
  })
})

describe('AnswerFieldsSchema with sources and annotations', () => {
  test('accepts answer with sources', () => {
    const payload = {
      agent_id: 'researcher',
      content: 'Found the answer',
      sources: [{ type: 'file' as const, ref: 'src/index.ts' }],
    }
    expect(AnswerFieldsSchema.parse(payload)).toEqual(payload)
  })

  test('accepts answer with annotations', () => {
    const payload = {
      agent_id: 'researcher',
      content: 'Found the answer',
      annotations: [{ type: 'note' as const, content: 'Verified' }],
    }
    expect(AnswerFieldsSchema.parse(payload)).toEqual(payload)
  })

  test('accepts answer with both sources and annotations', () => {
    const payload = {
      agent_id: 'researcher',
      content: 'Found the answer',
      sources: [{ type: 'file' as const, ref: 'src/index.ts', excerpt: 'lines 1-10' }],
      annotations: [
        { type: 'assumption' as const, content: 'Assuming latest version' },
        { type: 'warning' as const, content: 'May be deprecated' },
      ],
    }
    expect(AnswerFieldsSchema.parse(payload)).toEqual(payload)
  })

  test('accepts minimal answer without optional fields', () => {
    const payload = { agent_id: 'coder', content: 'Done' }
    expect(AnswerFieldsSchema.parse(payload)).toEqual(payload)
  })
})
