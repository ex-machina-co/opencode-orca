import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { init } from './init'
import { testDirectoryHelpers } from './test-utils'

const TEST_DIR = '/tmp/opencode-orca-init-test'

describe(() => {
  const helpers = testDirectoryHelpers(TEST_DIR, process.cwd())

  beforeEach(helpers.beforeEach)
  afterEach(helpers.afterEach)

  test('creates .opencode directory and orca.jsonc', async () => {
    await init()

    expect(existsSync(join(TEST_DIR, '.opencode'))).toBe(true)
    expect(existsSync(join(TEST_DIR, '.opencode', 'orca.jsonc'))).toBe(true)
  })

  test('creates valid JSON config', async () => {
    await init()

    const content = readFileSync(join(TEST_DIR, '.opencode', 'orca.jsonc'), 'utf-8')
    const config = JSON.parse(content)

    expect(config).toHaveProperty('settings')
    expect(config.settings).toHaveProperty('defaultSupervised')
  })

  test('does not overwrite existing config without --force', async () => {
    // Create an existing config
    mkdirSync(join(TEST_DIR, '.opencode'))
    writeFileSync(join(TEST_DIR, '.opencode', 'orca.jsonc'), '{"custom": "config"}')

    await init({ force: false })

    // Should not have overwritten
    const content = readFileSync(join(TEST_DIR, '.opencode', 'orca.jsonc'), 'utf-8')
    expect(content).toBe('{"custom": "config"}')
  })

  test('overwrites existing config with --force', async () => {
    // Create an existing config
    mkdirSync(join(TEST_DIR, '.opencode'))
    writeFileSync(join(TEST_DIR, '.opencode', 'orca.jsonc'), '{"custom": "config"}')

    await init({ force: true })

    // Should have overwritten
    const content = readFileSync(join(TEST_DIR, '.opencode', 'orca.jsonc'), 'utf-8')
    const config = JSON.parse(content)
    expect(config).toHaveProperty('settings')
    expect(config).not.toHaveProperty('custom')
  })
})
