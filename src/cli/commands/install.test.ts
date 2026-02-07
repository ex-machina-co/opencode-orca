import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { install } from './install'
import { testDirectoryHelpers } from './test-utils'

const TEST_DIR = '/tmp/opencode-orca-install-test'

describe('install command', () => {
  const helpers = testDirectoryHelpers(TEST_DIR, process.cwd())

  beforeEach(helpers.beforeEach)
  afterEach(helpers.afterEach)

  test('creates opencode.jsonc if not exists', async () => {
    await install()

    expect(existsSync(join(TEST_DIR, 'opencode.jsonc'))).toBe(true)
  })

  test('adds plugin to existing opencode.jsonc', async () => {
    writeFileSync(join(TEST_DIR, 'opencode.jsonc'), JSON.stringify({ someConfig: 'value' }, null, 2))

    await install()

    const content = readFileSync(join(TEST_DIR, 'opencode.jsonc'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.plugin).toContain('@ex-machina/opencode-orca')
    expect(config.someConfig).toBe('value')
  })

  test('preserves existing plugins', async () => {
    writeFileSync(join(TEST_DIR, 'opencode.jsonc'), JSON.stringify({ plugin: ['other-plugin'] }, null, 2))

    await install()

    const content = readFileSync(join(TEST_DIR, 'opencode.jsonc'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.plugin).toContain('other-plugin')
    expect(config.plugin).toContain('@ex-machina/opencode-orca')
  })

  test('does not duplicate plugin if already installed', async () => {
    writeFileSync(join(TEST_DIR, 'opencode.jsonc'), JSON.stringify({ plugin: ['@ex-machina/opencode-orca'] }, null, 2))

    await install()

    const content = readFileSync(join(TEST_DIR, 'opencode.jsonc'), 'utf-8')
    const config = JSON.parse(content)
    const orcaCount = config.plugin.filter((p: string) => p === '@ex-machina/opencode-orca').length
    expect(orcaCount).toBe(1)
  })

  test('creates orca.jsonc if not exists', async () => {
    await install()

    expect(existsSync(join(TEST_DIR, '.opencode', 'orca.jsonc'))).toBe(true)
  })

  test('preserves comments in JSONC', async () => {
    writeFileSync(
      join(TEST_DIR, 'opencode.jsonc'),
      `{
  // This is a comment
  "someConfig": "value"
}`,
    )

    await install()

    const content = readFileSync(join(TEST_DIR, 'opencode.jsonc'), 'utf-8')
    expect(content).toContain('// This is a comment')
  })
})
