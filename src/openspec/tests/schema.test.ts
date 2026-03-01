import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  SchemaLoadError,
  SchemaValidationError,
  listSchemas,
  loadChangeMetadata,
  loadSchema,
  parseChangeMetadata,
  parseSchema,
  resolveSchema,
} from '../schema'

const PROJECT_ROOT = path.resolve(import.meta.dir, '..', '..', '..')

const PROJECT_SCHEMA_DIR = path.join(PROJECT_ROOT, 'openspec', 'schemas', 'specify-domain')
const PROJECT_SCHEMA_FILE = path.join(PROJECT_SCHEMA_DIR, 'schema.yaml')

const BUILTIN_SCHEMA_DIR = path.join(PROJECT_ROOT, 'node_modules', '@fission-ai', 'openspec', 'schemas', 'spec-driven')
const BUILTIN_SCHEMA_FILE = path.join(BUILTIN_SCHEMA_DIR, 'schema.yaml')

const CHANGE_DIR = path.join(PROJECT_ROOT, 'openspec', 'changes', 'openspec-artifact-graph')

describe('schema engine', () => {
  describe('parseSchema', () => {
    test('parses a minimal valid schema', () => {
      const yaml = `
name: test-schema
version: 1
artifacts:
  - id: step1
    generates: step1.md
    description: First step
    template: step1.md
`
      const result = parseSchema(yaml)
      expect(result.name).toBe('test-schema')
      expect(result.version).toBe(1)
      expect(result.artifacts).toHaveLength(1)
      expect(result.artifacts[0].id).toBe('step1')
      expect(result.artifacts[0].requires).toEqual([])
    })

    test('parses schema with apply phase', () => {
      const yaml = `
name: with-apply
version: 1
artifacts:
  - id: tasks
    generates: tasks.md
    description: Tasks
    template: tasks.md
apply:
  requires: [tasks]
  tracks: tasks.md
`
      const result = parseSchema(yaml)
      expect(result.apply).toEqual({
        requires: ['tasks'],
        tracks: 'tasks.md',
      })
    })

    test('parses schema with artifact dependencies', () => {
      const yaml = `
name: with-deps
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
  - id: design
    generates: design.md
    description: Design
    template: design.md
    requires: [proposal]
`
      const result = parseSchema(yaml)
      expect(result.artifacts[1].requires).toEqual(['proposal'])
    })

    test('rejects schema missing required fields', () => {
      const yaml = `
version: 1
artifacts:
  - id: step1
    generates: step1.md
    description: First step
    template: step1.md
`
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError)
    })

    test('rejects schema with no artifacts', () => {
      const yaml = `
name: empty
version: 1
artifacts: []
`
      expect(() => parseSchema(yaml)).toThrow(SchemaValidationError)
    })

    test('rejects schema with duplicate artifact IDs', () => {
      const yaml = `
name: dupes
version: 1
artifacts:
  - id: step1
    generates: a.md
    description: First
    template: a.md
  - id: step1
    generates: b.md
    description: Duplicate
    template: b.md
`
      expect(() => parseSchema(yaml)).toThrow("Duplicate artifact ID: 'step1'")
    })

    test('rejects schema with unknown requires reference', () => {
      const yaml = `
name: bad-ref
version: 1
artifacts:
  - id: step1
    generates: step1.md
    description: First
    template: step1.md
    requires: [nonexistent]
`
      expect(() => parseSchema(yaml)).toThrow("requires unknown artifact 'nonexistent'")
    })

    test('rejects schema with dependency cycle', () => {
      const yaml = `
name: cycle
version: 1
artifacts:
  - id: a
    generates: a.md
    description: A
    template: a.md
    requires: [b]
  - id: b
    generates: b.md
    description: B
    template: b.md
    requires: [a]
`
      expect(() => parseSchema(yaml)).toThrow('Dependency cycle detected')
    })

    test('rejects schema with self-referencing dependency', () => {
      const yaml = `
name: self-ref
version: 1
artifacts:
  - id: a
    generates: a.md
    description: A
    template: a.md
    requires: [a]
`
      expect(() => parseSchema(yaml)).toThrow('Dependency cycle detected')
    })

    test('tolerates extra fields (non-strict parsing)', () => {
      const yaml = `
name: extra-fields
version: 1
description: Has extras
future_field: some-value
artifacts:
  - id: step1
    generates: step1.md
    description: First
    template: step1.md
    extra_artifact_field: ignored
`
      const result = parseSchema(yaml)
      expect(result.name).toBe('extra-fields')
      expect(result.artifacts).toHaveLength(1)
    })
  })

  describe('loadSchema (real files)', () => {
    test('loads the project-local specify-domain schema', () => {
      const schema = loadSchema(PROJECT_SCHEMA_FILE)
      expect(schema.name).toBe('specify-domain')
      expect(schema.artifacts.length).toBeGreaterThan(0)
    })

    test('loads the built-in spec-driven schema', () => {
      const schema = loadSchema(BUILTIN_SCHEMA_FILE)
      expect(schema.name).toBe('spec-driven')
      expect(schema.artifacts.length).toBeGreaterThan(0)
      expect(schema.apply).toBeDefined()
    })
  })

  describe('parseChangeMetadata', () => {
    test('parses valid change metadata', () => {
      const yaml = `
schema: spec-driven
created: 2026-02-26
`
      const result = parseChangeMetadata(yaml)
      expect(result.schema).toBe('spec-driven')
      expect(result.created).toBe('2026-02-26')
    })

    test('parses metadata without created date', () => {
      const yaml = 'schema: my-schema\n'
      const result = parseChangeMetadata(yaml)
      expect(result.schema).toBe('my-schema')
      expect(result.created).toBeUndefined()
    })

    test('rejects metadata with missing schema field', () => {
      const yaml = 'created: 2026-01-01\n'
      expect(() => parseChangeMetadata(yaml)).toThrow(SchemaValidationError)
    })

    test('rejects metadata with invalid date format', () => {
      const yaml = `
schema: test
created: January 1st
`
      expect(() => parseChangeMetadata(yaml)).toThrow('YYYY-MM-DD')
    })
  })

  describe('loadChangeMetadata (real files)', () => {
    test('loads metadata from the active change', () => {
      const metadata = loadChangeMetadata(CHANGE_DIR)
      expect(metadata.schema).toBe('spec-driven')
    })

    test('throws SchemaLoadError for missing metadata file', () => {
      expect(() => loadChangeMetadata('/tmp/nonexistent-change-dir')).toThrow(SchemaLoadError)
    })
  })

  describe('resolveSchema', () => {
    test('resolves project-local schema by name', () => {
      const { schema, schemaDir } = resolveSchema('specify-domain', PROJECT_ROOT)
      expect(schema.name).toBe('specify-domain')
      expect(schemaDir).toBe(PROJECT_SCHEMA_DIR)
    })

    test('resolves built-in schema by name', () => {
      const { schema, schemaDir } = resolveSchema('spec-driven', PROJECT_ROOT)
      expect(schema.name).toBe('spec-driven')
      expect(schemaDir).toBe(BUILTIN_SCHEMA_DIR)
    })

    test('throws SchemaLoadError for unknown schema', () => {
      expect(() => resolveSchema('nonexistent-schema', PROJECT_ROOT)).toThrow(SchemaLoadError)
    })

    test('error message includes searched locations', () => {
      try {
        resolveSchema('nonexistent-schema', PROJECT_ROOT)
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaLoadError)
        const msg = (error as SchemaLoadError).message
        expect(msg).toContain('nonexistent-schema')
        expect(msg).toContain('Searched:')
      }
    })

    test('strips .yaml extension from name', () => {
      const { schema } = resolveSchema('spec-driven.yaml', PROJECT_ROOT)
      expect(schema.name).toBe('spec-driven')
    })
  })

  describe('listSchemas', () => {
    test('returns both project and built-in schemas', () => {
      const schemas = listSchemas(PROJECT_ROOT)
      const names = schemas.map((s) => s.name)
      expect(names).toContain('specify-domain')
      expect(names).toContain('spec-driven')
    })

    test('marks source correctly', () => {
      const schemas = listSchemas(PROJECT_ROOT)
      const projectSchema = schemas.find((s) => s.name === 'specify-domain')
      const builtinSchema = schemas.find((s) => s.name === 'spec-driven')
      expect(projectSchema?.source).toBe('project')
      expect(builtinSchema?.source).toBe('package')
    })

    test('returns sorted by name', () => {
      const schemas = listSchemas(PROJECT_ROOT)
      const names = schemas.map((s) => s.name)
      expect(names).toEqual([...names].sort())
    })

    test('returns only built-in schemas when project has none', () => {
      const schemas = listSchemas('/tmp/nonexistent-project-root')
      expect(schemas.every((s) => s.source === 'package')).toBe(true)
    })

    test('each entry includes directory path', () => {
      const schemas = listSchemas(PROJECT_ROOT)
      for (const entry of schemas) {
        expect(entry.dir).toBeTruthy()
        expect(fs.existsSync(entry.dir)).toBe(true)
      }
    })

    test('project schema takes precedence over built-in with same name', () => {
      // Create a temp project root with a schema that shadows a built-in
      const tmpDir = fs.mkdtempSync('/tmp/openspec-test-')
      const shadowDir = path.join(tmpDir, 'openspec', 'schemas', 'spec-driven')
      fs.mkdirSync(shadowDir, { recursive: true })
      fs.writeFileSync(
        path.join(shadowDir, 'schema.yaml'),
        `
name: spec-driven
version: 99
artifacts:
  - id: custom
    generates: custom.md
    description: Custom shadow
    template: custom.md
`,
      )

      try {
        const schemas = listSchemas(tmpDir)
        const specDriven = schemas.filter((s) => s.name === 'spec-driven')
        expect(specDriven).toHaveLength(1)
        expect(specDriven[0].source).toBe('project')
      } finally {
        fs.rmSync(tmpDir, { recursive: true })
      }
    })
  })
})
