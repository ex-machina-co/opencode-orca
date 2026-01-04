import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJson, readJsonc, writeJson, writeJsonc } from './jsonc'

const TEST_DIR = '/tmp/opencode-orca-jsonc-test'

describe('jsonc utilities', () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe('readJsonc', () => {
    test('returns null for non-existent file', () => {
      const result = readJsonc(join(TEST_DIR, 'nonexistent.jsonc'))
      expect(result).toBeNull()
    })

    test('parses valid JSON', () => {
      const filePath = join(TEST_DIR, 'test.jsonc')
      writeFileSync(filePath, '{"key": "value"}')
      const result = readJsonc(filePath)
      expect(result).toEqual({ key: 'value' })
    })

    test('parses JSONC with comments', () => {
      const filePath = join(TEST_DIR, 'test.jsonc')
      writeFileSync(
        filePath,
        `{
  // This is a comment
  "key": "value",
  /* Multi-line
     comment */
  "another": 123
}`,
      )
      const result = readJsonc<{ key: string; another: number }>(filePath)
      expect(result?.key).toBe('value')
      expect(result?.another).toBe(123)
    })

    test('throws on invalid JSON', () => {
      const filePath = join(TEST_DIR, 'invalid.jsonc')
      writeFileSync(filePath, 'not valid json')
      expect(() => readJsonc(filePath)).toThrow()
    })
  })

  describe('writeJsonc', () => {
    test('writes valid JSON', () => {
      const filePath = join(TEST_DIR, 'output.jsonc')
      writeJsonc(filePath, { key: 'value' })
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('"key": "value"')
    })

    test('preserves comments from parsed JSONC', () => {
      const filePath = join(TEST_DIR, 'test.jsonc')
      const original = `{
  // This is a comment
  "key": "value"
}`
      writeFileSync(filePath, original)

      // Read and modify
      const data = readJsonc<{ key: string; newKey?: string }>(filePath)
      if (data) {
        data.newKey = 'newValue'
        writeJsonc(filePath, data)
      }

      // Check that comment is preserved
      const result = readFileSync(filePath, 'utf-8')
      expect(result).toContain('// This is a comment')
      expect(result).toContain('"newKey": "newValue"')
    })
  })

  describe('readJson', () => {
    test('returns null for non-existent file', () => {
      const result = readJson(join(TEST_DIR, 'nonexistent.json'))
      expect(result).toBeNull()
    })

    test('parses valid JSON', () => {
      const filePath = join(TEST_DIR, 'test.json')
      writeFileSync(filePath, '{"key": "value"}')
      const result = readJson(filePath)
      expect(result).toEqual({ key: 'value' })
    })
  })

  describe('writeJson', () => {
    test('writes valid JSON', () => {
      const filePath = join(TEST_DIR, 'output.json')
      writeJson(filePath, { key: 'value' })
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('"key": "value"')
    })
  })
})
