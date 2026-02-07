/**
 * uninstall command - Remove Orca plugin from OpenCode configuration
 */

import { existsSync, unlinkSync } from 'node:fs'
import * as readline from 'node:readline'
import { error, info, success, warn } from '../utils/console'
import { type OpenCodeConfig, readJsonc, writeJsonc } from '../utils/jsonc'
import { getOpenCodeConfigPath, getOrcaConfigPath } from '../utils/paths'

const PLUGIN_NAME = '@ex-machina/opencode-orca'

export interface UninstallOptions {
  removeConfig?: boolean
  keepConfig?: boolean
}

/**
 * Prompt user for confirmation
 */
async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Uninstall the Orca plugin
 *
 * - Removes 'opencode-orca' from the plugin array in opencode.jsonc
 * - Optionally removes .opencode/orca.jsonc
 */
export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  const configPath = getOpenCodeConfigPath()
  const orcaConfigPath = getOrcaConfigPath()

  // Check if opencode.jsonc exists
  if (!existsSync(configPath)) {
    warn(`${configPath} not found. Nothing to uninstall.`)
    return
  }

  // Read existing config
  const config = readJsonc<OpenCodeConfig>(configPath)
  if (!config) {
    throw new Error(`Failed to read ${configPath}`)
  }

  // Check if plugin is installed
  const plugins = config.plugin ?? []
  const pluginIndex = plugins.indexOf(PLUGIN_NAME)

  if (pluginIndex === -1) {
    warn(`${PLUGIN_NAME} is not installed.`)
  } else {
    // Remove plugin from array
    config.plugin = plugins.filter((p) => p !== PLUGIN_NAME)

    // Write updated config
    writeJsonc(configPath, config)
    success(`Removed ${PLUGIN_NAME} from ${configPath}`)
  }

  // Handle orca.jsonc removal
  if (existsSync(orcaConfigPath)) {
    let shouldRemove = options.removeConfig

    if (!shouldRemove && !options.keepConfig) {
      // Prompt user
      shouldRemove = await confirm(`Remove ${orcaConfigPath}?`)
    }

    if (shouldRemove) {
      unlinkSync(orcaConfigPath)
      success(`Removed ${orcaConfigPath}`)
    } else {
      info(`Kept ${orcaConfigPath}`)
    }
  }

  info('')
  success('Uninstall complete!')
}
