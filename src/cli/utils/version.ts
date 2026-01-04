/**
 * Version utility
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

let cachedVersion: string | null = null

/**
 * Get the package version from package.json
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion
  }

  try {
    // When running from dist, we need to go up to find package.json
    // Try multiple possible locations
    const possiblePaths = [
      // Running from source (development)
      resolve(process.cwd(), 'package.json'),
      // Running from dist (installed)
      resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'),
      resolve(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
    ]

    for (const pkgPath of possiblePaths) {
      try {
        const content = readFileSync(pkgPath, 'utf-8')
        const pkg = JSON.parse(content)
        if (pkg.name === '@ex-machina/opencode-orca' && pkg.version) {
          cachedVersion = pkg.version
          return cachedVersion as string
        }
      } catch {
        // Try next path
      }
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}
