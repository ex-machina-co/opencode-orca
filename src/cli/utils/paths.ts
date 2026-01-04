/**
 * Path utilities for locating config files
 */

import { resolve } from 'node:path'

/**
 * Get the path to the OpenCode configuration file
 */
export function getOpenCodeConfigPath(cwd: string = process.cwd()): string {
  return resolve(cwd, 'opencode.jsonc')
}

/**
 * Get the path to the .opencode directory
 */
export function getOpenCodeDirPath(cwd: string = process.cwd()): string {
  return resolve(cwd, '.opencode')
}

/**
 * Get the path to the Orca configuration file
 */
export function getOrcaConfigPath(cwd: string = process.cwd()): string {
  return resolve(cwd, '.opencode', 'orca.json')
}
