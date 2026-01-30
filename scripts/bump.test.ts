import { describe, expect, test } from 'bun:test'
import { bumpVersion } from './bump'

describe('bumpVersion', () => {
  describe('patch bumps', () => {
    test('bumps patch version', () => {
      expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
    })

    test('bumps patch from zero', () => {
      expect(bumpVersion('1.0.0', 'patch')).toBe('1.0.1')
    })

    test('handles high patch numbers', () => {
      expect(bumpVersion('1.2.99', 'patch')).toBe('1.2.100')
    })
  })

  describe('minor bumps', () => {
    test('bumps minor version and resets patch', () => {
      expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
    })

    test('bumps minor from zero', () => {
      expect(bumpVersion('1.0.0', 'minor')).toBe('1.1.0')
    })

    test('handles high minor numbers', () => {
      expect(bumpVersion('1.99.5', 'minor')).toBe('1.100.0')
    })
  })

  describe('major bumps', () => {
    test('bumps major version and resets minor and patch', () => {
      expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
    })

    test('bumps major from zero', () => {
      expect(bumpVersion('0.1.0', 'major')).toBe('1.0.0')
    })

    test('handles high major numbers', () => {
      expect(bumpVersion('99.5.3', 'major')).toBe('100.0.0')
    })
  })

  describe('error handling', () => {
    test('throws on invalid version format - too few parts', () => {
      expect(() => bumpVersion('1.2', 'patch')).toThrow('Invalid semver version: 1.2')
    })

    test('throws on invalid version format - too many parts', () => {
      expect(() => bumpVersion('1.2.3.4', 'patch')).toThrow('Invalid semver version: 1.2.3.4')
    })

    test('throws on non-numeric parts', () => {
      expect(() => bumpVersion('1.2.beta', 'patch')).toThrow('Invalid semver version: 1.2.beta')
    })

    test('throws on empty string', () => {
      expect(() => bumpVersion('', 'patch')).toThrow('Invalid semver version: ')
    })
  })
})
