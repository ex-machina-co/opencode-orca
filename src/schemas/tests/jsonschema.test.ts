import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { extractFieldDocs, formatFieldDocsAsMarkdownList } from '../jsonschema'
import { PlanFieldsSchema } from '../payloads'

describe('extractFieldDocs', () => {
  test('extracts field names and descriptions from PlanFieldsSchema', () => {
    const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id'] })

    expect(docs).toHaveLength(6)
    expect(docs[0]).toEqual({
      name: 'goal',
      label: 'Goal',
      description: 'Clear statement of what we are achieving',
      optional: false,
    })
    expect(docs.find((d) => d.name === 'verification')).toEqual({
      name: 'verification',
      label: 'Verification',
      description: 'How to confirm success - commands, tests, or checks to run',
      optional: false,
    })
  })

  test('excludes specified fields', () => {
    const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id', 'goal', 'steps'] })

    expect(docs.find((d) => d.name === 'agent_id')).toBeUndefined()
    expect(docs.find((d) => d.name === 'goal')).toBeUndefined()
    expect(docs.find((d) => d.name === 'steps')).toBeUndefined()
    expect(docs.find((d) => d.name === 'verification')).toBeDefined()
  })

  test('converts snake_case to Title Case labels', () => {
    const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id'] })

    expect(docs.find((d) => d.name === 'files_touched')?.label).toBe('Files Touched')
  })

  test('handles schemas with optional fields', () => {
    // Create a test schema with optional field
    // Note: In Zod 4, .describe() should come BEFORE .optional() to put description on inner schema
    const TestSchema = z.strictObject({
      required_field: z.string().describe('Required'),
      optional_field: z.string().describe('Optional').optional(),
    })

    const docs = extractFieldDocs(TestSchema)

    expect(docs.find((d) => d.name === 'required_field')?.optional).toBe(false)
    expect(docs.find((d) => d.name === 'optional_field')?.optional).toBe(true)
    expect(docs.find((d) => d.name === 'optional_field')?.description).toBe('Optional')
  })

  test('provides fallback description for fields without .describe()', () => {
    const TestSchema = z.strictObject({
      no_description: z.string(),
    })

    const docs = extractFieldDocs(TestSchema)
    const formatted = formatFieldDocsAsMarkdownList(docs)

    expect(formatted).toContain('**No Description**: The no description')
  })
})

describe('formatFieldDocsAsMarkdownList', () => {
  test('generates numbered markdown list', () => {
    const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id'] })
    const formatted = formatFieldDocsAsMarkdownList(docs)

    expect(formatted).toContain('1. **Goal**:')
    expect(formatted).toContain('2. **Steps**:')
    expect(formatted).toContain('6. **Risks**:')
  })

  test('includes descriptions in output', () => {
    const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id'] })
    const formatted = formatFieldDocsAsMarkdownList(docs)

    expect(formatted).toContain('Clear statement of what we are achieving')
    expect(formatted).toContain('What could go wrong and how to recover/rollback')
  })
})
