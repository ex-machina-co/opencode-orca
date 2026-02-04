import { describe, expect, test } from 'bun:test'
import type { PermissionAction, PermissionRule, PermissionRuleset } from '@opencode-ai/sdk/v2'
import { READ_ONLY_PERMISSIONS } from '../permissions'

describe('READ_ONLY_PERMISSIONS integration', () => {
  describe('structure validation', () => {
    test('is a valid PermissionRuleset (array of PermissionRule)', () => {
      expect(Array.isArray(READ_ONLY_PERMISSIONS)).toBe(true)
      expect(READ_ONLY_PERMISSIONS.length).toBeGreaterThan(0)

      for (const rule of READ_ONLY_PERMISSIONS) {
        expect(rule).toHaveProperty('permission')
        expect(rule).toHaveProperty('pattern')
        expect(rule).toHaveProperty('action')
        expect(typeof rule.permission).toBe('string')
        expect(typeof rule.pattern).toBe('string')
        expect(['allow', 'deny', 'ask']).toContain(rule.action)
      }
    })

    test('satisfies SDK PermissionRuleset type at compile time', () => {
      const _ruleset: PermissionRuleset = READ_ONLY_PERMISSIONS
      const _firstRule: PermissionRule = READ_ONLY_PERMISSIONS[0]
      const _action: PermissionAction = READ_ONLY_PERMISSIONS[0].action

      expect(_ruleset).toBeDefined()
      expect(_firstRule).toBeDefined()
      expect(_action).toBeDefined()
    })
  })

  describe('read-only enforcement rules', () => {
    const findRule = (permission: string, pattern?: string) =>
      READ_ONLY_PERMISSIONS.find((r) => r.permission === permission && (pattern === undefined || r.pattern === pattern))

    const findAllRules = (permission: string) => READ_ONLY_PERMISSIONS.filter((r) => r.permission === permission)

    test('denies edit operations', () => {
      const editRule = findRule('edit', '*')
      expect(editRule).toBeDefined()
      expect(editRule?.action).toBe('deny')
    })

    test('allows read operations', () => {
      const readRule = findRule('read', '*')
      expect(readRule).toBeDefined()
      expect(readRule?.action).toBe('allow')
    })

    test('allows glob operations', () => {
      const globRule = findRule('glob', '*')
      expect(globRule).toBeDefined()
      expect(globRule?.action).toBe('allow')
    })

    test('allows grep operations', () => {
      const grepRule = findRule('grep', '*')
      expect(grepRule).toBeDefined()
      expect(grepRule?.action).toBe('allow')
    })

    test('allows list operations', () => {
      const listRule = findRule('list', '*')
      expect(listRule).toBeDefined()
      expect(listRule?.action).toBe('allow')
    })

    test('denies task dispatch (prevents recursive agent dispatch)', () => {
      const taskRule = findRule('task', '*')
      expect(taskRule).toBeDefined()
      expect(taskRule?.action).toBe('deny')
    })

    describe('bash command rules', () => {
      test('allows safe read commands', () => {
        const bashRules = findAllRules('bash')
        const allowedPatterns = bashRules.filter((r) => r.action === 'allow').map((r) => r.pattern)

        expect(allowedPatterns).toContain('ls*')
        expect(allowedPatterns).toContain('cat*')
        expect(allowedPatterns).toContain('git status*')
        expect(allowedPatterns).toContain('git log*')
        expect(allowedPatterns).toContain('git diff*')
        expect(allowedPatterns).toContain('git show*')
      })

      test('asks for any other bash commands', () => {
        const bashRules = findAllRules('bash')
        const catchAllRule = bashRules.find((r) => r.pattern === '*')

        expect(catchAllRule).toBeDefined()
        expect(catchAllRule?.action).toBe('ask')
      })
    })
  })

  describe('rule ordering (first-match-wins)', () => {
    test('edit deny rule appears before any potential allow rules', () => {
      const editDenyIndex = READ_ONLY_PERMISSIONS.findIndex((r) => r.permission === 'edit' && r.action === 'deny')

      expect(editDenyIndex).toBeGreaterThanOrEqual(0)

      const laterEditAllowExists = READ_ONLY_PERMISSIONS.slice(editDenyIndex + 1).some(
        (r) => r.permission === 'edit' && r.action === 'allow',
      )

      expect(laterEditAllowExists).toBe(false)
    })

    test('specific bash allow patterns appear before catch-all ask', () => {
      const bashRules = READ_ONLY_PERMISSIONS.filter((r) => r.permission === 'bash')
      const catchAllIndex = bashRules.findIndex((r) => r.pattern === '*')

      expect(catchAllIndex).toBeGreaterThan(0)

      const allowRulesBeforeCatchAll = bashRules.slice(0, catchAllIndex)
      expect(allowRulesBeforeCatchAll.length).toBeGreaterThan(0)
      expect(allowRulesBeforeCatchAll.every((r) => r.action === 'allow')).toBe(true)
    })
  })

  describe('completeness check', () => {
    test('covers all critical write operations with deny', () => {
      const denyRules = READ_ONLY_PERMISSIONS.filter((r) => r.action === 'deny')
      const deniedPermissions = denyRules.map((r) => r.permission)

      expect(deniedPermissions).toContain('edit')
      expect(deniedPermissions).toContain('task')
    })

    test('covers all critical read operations with allow', () => {
      const allowRules = READ_ONLY_PERMISSIONS.filter((r) => r.action === 'allow')
      const allowedPermissions = allowRules.map((r) => r.permission)

      expect(allowedPermissions).toContain('read')
      expect(allowedPermissions).toContain('glob')
      expect(allowedPermissions).toContain('grep')
      expect(allowedPermissions).toContain('list')
      expect(allowedPermissions).toContain('bash')
    })
  })
})
