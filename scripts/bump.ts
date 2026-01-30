#!/usr/bin/env bun
/**
 * Bumps the version in package.json, commits, and pushes.
 *
 * Usage:
 *   bun bump              # patch: 1.2.3 => 1.2.4
 *   bun bump --minor      # minor: 1.2.3 => 1.3.0
 *   bun bump --major      # major: 1.2.3 => 2.0.0
 *   bun bump --dry-run    # show what would happen
 */

import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PACKAGE_JSON = path.join(ROOT, 'package.json')

const args = process.argv.slice(2)
const dry = args.includes('--dry-run')
const minor = args.includes('--minor')
const major = args.includes('--major')

if (minor && major) {
  console.error('Cannot use both --minor and --major')
  process.exit(1)
}

const log = (msg: string) => console.log(dry ? `[DRY RUN] ${msg}` : msg)

export type BumpType = 'patch' | 'minor' | 'major'

export function bumpVersion(version: string, type: BumpType): string {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid semver version: ${version}`)
  }
  const [maj, min, patch] = parts

  switch (type) {
    case 'major':
      return `${maj + 1}.0.0`
    case 'minor':
      return `${maj}.${min + 1}.0`
    case 'patch':
      return `${maj}.${min}.${patch + 1}`
  }
}

const pkg = await Bun.file(PACKAGE_JSON).json()
const current = pkg.version as string
const bumpType: BumpType = major ? 'major' : minor ? 'minor' : 'patch'
const bumped = bumpVersion(current, bumpType)

log(`Bump ${bumpType}: ${current} => ${bumped}`)

if (!dry) {
  pkg.version = bumped
  await Bun.write(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`)

  const commit = Bun.spawnSync(['git', 'commit', '-am', `chore: bump to ${bumped}`], { cwd: ROOT })
  if (commit.exitCode !== 0) {
    console.error('Commit failed:', commit.stderr.toString())
    process.exit(1)
  }

  const push = Bun.spawnSync(['git', 'push'], { cwd: ROOT })
  if (push.exitCode !== 0) {
    console.error('Push failed:', push.stderr.toString())
    process.exit(1)
  }
}

log('Done!')
