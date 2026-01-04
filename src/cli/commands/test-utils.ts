import { mkdirSync, rmSync } from 'node:fs'

export const testDirectoryHelpers = (testDir: string, originalCwd: string) => ({
  originalCwd,
  beforeEach: () => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    process.chdir(testDir)
  },
  afterEach: () => {
    process.chdir(originalCwd)
    rmSync(testDir, { recursive: true, force: true })
  },
})
