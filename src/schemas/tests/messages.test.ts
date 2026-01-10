import { describe, expect, test } from 'bun:test'
import { MessageEnvelopeSchema } from '../messages'

// Request messages require session_id
const requestEnvelope = {
  session_id: '550e8400-e29b-41d4-a716-446655440000',
  timestamp: '2024-01-15T10:30:00Z',
}

// Response messages do not require session_id
const responseEnvelope = {
  timestamp: '2024-01-15T10:30:00Z',
}

describe('MessageEnvelopeSchema discriminated union', () => {
  test('rejects unknown message type', () => {
    expect(() =>
      MessageEnvelopeSchema.parse({
        ...requestEnvelope,
        type: 'unknown_type',
      }),
    ).toThrow()
  })

  test('rejects mismatched fields for type', () => {
    // Task type expects { agent_id, prompt }, not { content }
    expect(() =>
      MessageEnvelopeSchema.parse({
        ...requestEnvelope,
        type: 'task',
        content: 'wrong field',
      }),
    ).toThrow()
  })

  test('rejects extra fields on envelope (strict mode propagates)', () => {
    expect(() =>
      MessageEnvelopeSchema.parse({
        ...requestEnvelope,
        type: 'task',
        agent_id: 'a',
        prompt: 'p',
        extra: 'field',
      }),
    ).toThrow()
  })

  test('enables type narrowing after parse', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...requestEnvelope,
      type: 'task',
      agent_id: 'researcher',
      prompt: 'find it',
    })

    // TypeScript should narrow type after discriminator check
    if (msg.type === 'task') {
      // This compiles only if TS correctly infers field shape
      const agentId: string = msg.agent_id
      expect(agentId).toBe('researcher')
    } else {
      throw new Error('Type narrowing failed')
    }
  })

  test('accepts checkpoint message type (response envelope - no session_id)', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'checkpoint',
      agent_id: 'coder',
      prompt: 'Write tests',
    })

    expect(msg.type).toBe('checkpoint')
    if (msg.type === 'checkpoint') {
      expect(msg.agent_id).toBe('coder')
      expect(msg.prompt).toBe('Write tests')
    }
  })

  test('accepts checkpoint message with optional fields', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'checkpoint',
      agent_id: 'coder',
      prompt: 'Write tests',
      step_index: 2,
      plan_goal: 'Implement feature',
    })

    expect(msg.type).toBe('checkpoint')
    if (msg.type === 'checkpoint') {
      expect(msg.step_index).toBe(2)
      expect(msg.plan_goal).toBe('Implement feature')
    }
  })
})

describe('Response messages (no session_id)', () => {
  test('accepts answer message without session_id', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'answer',
      agent_id: 'researcher',
      content: 'Found it',
    })

    expect(msg.type).toBe('answer')
  })

  test('accepts answer message with sources and annotations', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'answer',
      agent_id: 'researcher',
      content: 'Found the implementation',
      sources: [{ type: 'file', ref: 'src/index.ts', excerpt: 'lines 1-10' }],
      annotations: [{ type: 'note', content: 'This is well-documented' }],
    })

    expect(msg.type).toBe('answer')
    if (msg.type === 'answer') {
      expect(msg.sources).toHaveLength(1)
      expect(msg.annotations).toHaveLength(1)
    }
  })

  test('accepts plan message without session_id', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'plan',
      agent_id: 'planner',
      goal: 'Implement feature',
      steps: [{ description: 'Write code' }],
      assumptions: ['Using existing patterns'],
      files_touched: ['src/feature.ts'],
      verification: ['Run tests: bun test'],
      risks: ['May break existing functionality'],
    })

    expect(msg.type).toBe('plan')
  })

  test('accepts question message without session_id', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'question',
      agent_id: 'coder',
      question: 'Which approach?',
      blocking: true,
    })

    expect(msg.type).toBe('question')
  })

  test('accepts failure message without session_id', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...responseEnvelope,
      type: 'failure',
      code: 'AGENT_ERROR',
      message: 'Something went wrong',
    })

    expect(msg.type).toBe('failure')
  })
})

describe('Request messages (require session_id)', () => {
  test('accepts task message with session_id', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...requestEnvelope,
      type: 'task',
      agent_id: 'coder',
      prompt: 'Write code',
    })

    expect(msg.type).toBe('task')
    if (msg.type === 'task') {
      expect(msg.session_id).toBe(requestEnvelope.session_id)
    }
  })

  test('accepts interrupt message with session_id', () => {
    const msg = MessageEnvelopeSchema.parse({
      ...requestEnvelope,
      type: 'interrupt',
      reason: 'User cancelled',
    })

    expect(msg.type).toBe('interrupt')
  })

  test('rejects task message without session_id', () => {
    expect(() =>
      MessageEnvelopeSchema.parse({
        ...responseEnvelope, // Missing session_id
        type: 'task',
        agent_id: 'coder',
        prompt: 'Write code',
      }),
    ).toThrow()
  })
})
