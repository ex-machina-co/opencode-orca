import { type Mock, spyOn } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'

export const testDirectoryHelpers = (testDir: string, originalCwd: string) => {
  let consoleSpies: Mock<(...args: unknown[]) => void>[] = []

  return {
    originalCwd,
    beforeEach: () => {
      rmSync(testDir, { recursive: true, force: true })
      mkdirSync(testDir, { recursive: true })
      process.chdir(testDir)

      // Suppress console output during tests
      consoleSpies = [
        spyOn(console, 'log').mockImplementation(() => {}),
        spyOn(console, 'warn').mockImplementation(() => {}),
        spyOn(console, 'error').mockImplementation(() => {}),
      ]
    },
    afterEach: () => {
      // Restore console methods
      for (const spy of consoleSpies) {
        spy.mockRestore()
      }
      consoleSpies = []

      process.chdir(originalCwd)
      rmSync(testDir, { recursive: true, force: true })
    },
  }
}
