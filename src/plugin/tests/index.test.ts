import { describe, expect, test } from 'bun:test'
import type { PluginInput } from '@opencode-ai/plugin'
import type { Config } from '@opencode-ai/sdk'
import { DEFAULT_AGENTS } from '../agents'
import { createOrcaPlugin } from '../index'
import { ORCA_TOOL_RESTRICTIONS } from '../orca-restrictions'

// Mock the plugin input - using type assertion to avoid needing full mock
const createMockInput = (directory: string): PluginInput =>
  ({
    client: {},
    project: { id: 'test-project' },
    directory,
    worktree: directory,
    serverUrl: new URL('http://localhost:3000'),
    $: {},
  }) as unknown as PluginInput

describe('createOrcaPlugin', () => {
  describe('default agent injection', () => {
    test('injects all default agents into config', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {}
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      // Verify all default agents are injected
      expect(config.agent).toBeDefined()
      const agents = config.agent ?? {}
      for (const agentId of Object.keys(DEFAULT_AGENTS)) {
        expect(agents[agentId]).toBeDefined()
        expect(agents[agentId]?.description).toBe(DEFAULT_AGENTS[agentId].description)
      }
    })

    test('sets orca as primary agent', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {}
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      expect(agents.orca?.mode).toBe('primary')
    })

    test('sets specialists as subagents', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {}
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      const specialists = ['planner', 'coder', 'tester', 'reviewer', 'researcher', 'document-writer', 'architect']
      for (const specialist of specialists) {
        expect(agents[specialist]?.mode).toBe('subagent')
      }
    })

    test('preserves existing config.agent entries', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {
        agent: {
          'custom-agent': {
            mode: 'subagent',
            description: 'A custom agent',
            prompt: 'Custom prompt',
          },
        },
      }
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}

      // Custom agent should still exist
      expect(agents['custom-agent']).toBeDefined()
      expect(agents['custom-agent']?.description).toBe('A custom agent')

      // Orca agents should also be present
      expect(agents.orca).toBeDefined()
    })

    test('initializes config.agent if undefined', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {}
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      expect(config.agent).toBeDefined()
      expect(typeof config.agent).toBe('object')
    })
  })

  describe('graceful fallback', () => {
    test('works when user config does not exist', async () => {
      const plugin = createOrcaPlugin()
      // Use a directory that doesn't have .opencode/orca.jsonc
      const hooks = await plugin(createMockInput('/tmp/nonexistent-project'))

      const config: Partial<Config> = {}
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      // Should still inject default agents
      expect(config.agent).toBeDefined()
      const agents = config.agent ?? {}
      expect(agents.orca).toBeDefined()
    })
  })

  describe('tool hook', () => {
    test('exposes empty tool object for future orca_dispatch', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      expect(hooks.tool).toBeDefined()
      expect(typeof hooks.tool).toBe('object')
    })
  })

  describe('config precedence (opencode.jsonc vs orca)', () => {
    test('orca agent config overrides conflicting opencode.jsonc values', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {
        agent: {
          coder: {
            model: 'from-opencode',
            prompt: 'opencode prompt',
          },
        },
      }
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      // Orca's prompt should win over opencode.jsonc's prompt
      expect(agents.coder?.prompt).toBe(DEFAULT_AGENTS.coder.prompt)
      // Orca's model should win (if set) or opencode's preserved (if orca doesn't set one)
      expect(agents.coder?.description).toBe(DEFAULT_AGENTS.coder.description)
    })

    test('non-conflicting opencode.jsonc fields are preserved through merge', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {
        agent: {
          coder: {
            model: 'from-opencode',
            prompt: 'opencode prompt',
            customField: 'should-survive',
          },
        },
      }
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      // Custom field from opencode.jsonc should survive the merge
      expect((agents.coder as Record<string, unknown>)?.customField).toBe('should-survive')
      // Orca's own fields still take precedence
      expect(agents.coder?.prompt).toBe(DEFAULT_AGENTS.coder.prompt)
    })

    test('deep merges nested objects (tools) across config sources', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {
        agent: {
          coder: {
            tools: { webfetch: true, 'custom-tool': true },
          },
        },
      }
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      const coderTools = agents.coder?.tools ?? {}
      // opencode.jsonc tool entries should be preserved
      expect(coderTools.webfetch).toBe(true)
      expect(coderTools['custom-tool']).toBe(true)
    })

    test('agents only in opencode.jsonc are preserved untouched', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {
        agent: {
          'my-opencode-agent': {
            mode: 'subagent',
            description: 'Defined only in opencode.jsonc',
            prompt: 'opencode only prompt',
            model: 'some-model',
          },
        },
      }
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      expect(agents['my-opencode-agent']).toBeDefined()
      expect(agents['my-opencode-agent']?.description).toBe('Defined only in opencode.jsonc')
      expect(agents['my-opencode-agent']?.prompt).toBe('opencode only prompt')
      expect(agents['my-opencode-agent']?.model).toBe('some-model')
    })

    test('orca enforces critical fields even when opencode.jsonc sets them', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {
        agent: {
          orca: {
            mode: 'subagent',
            description: 'Overridden description',
          },
        },
      }
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const agents = config.agent ?? {}
      // Orca's mode should be enforced as primary
      expect(agents.orca?.mode).toBe('primary')
    })
  })

  describe('orca agent tool restrictions', () => {
    test('applies wildcard deny with orca-invoke allow', async () => {
      const plugin = createOrcaPlugin()
      const hooks = await plugin(createMockInput('/tmp/test-project'))

      const config: Partial<Config> = {}
      if (hooks.config) {
        await hooks.config(config as Config)
      }

      const orcaTools = config.agent?.orca?.tools ?? {}

      // Should have exact tool restrictions: wildcard deny + orca-invoke allow
      expect(orcaTools).toEqual(ORCA_TOOL_RESTRICTIONS)
      expect(orcaTools['*']).toBe(false)
      expect(orcaTools['orca-invoke']).toBe(true)
    })
  })
})
