/**
 * install command - Add Orca plugin to OpenCode configuration
 */

import { existsSync } from 'node:fs'
import { error, info, success, warn } from '../utils/console'
import { type OpenCodeConfig, readJsonc, writeJsonc } from '../utils/jsonc'
import { getOpenCodeConfigPath, getOrcaConfigPath } from '../utils/paths'
import { init } from './init'

const PLUGIN_NAME = 'opencode-orca'

export interface InstallOptions {
  force?: boolean
}

/**
 * Install the Orca plugin
 *
 * - Adds 'opencode-orca' to the plugin array in opencode.jsonc
 * - Creates .opencode/orca.json if it doesn't exist
 */
export async function install(options: InstallOptions = {}): Promise<void> {
  const configPath = getOpenCodeConfigPath()
  const orcaConfigPath = getOrcaConfigPath()

  // Read existing config or start with an empty object
  let config: OpenCodeConfig
  if (existsSync(configPath)) {
    const existing = readJsonc<OpenCodeConfig>(configPath)
    if (!existing) {
      throw new Error(`Failed to read ${configPath}`)
    }
    config = existing
  } else {
    info(`Creating ${configPath}...`)
    config = {}
  }

  // Check if the plugin is already installed
  const plugins = config.plugin ?? []
  if (plugins.includes(PLUGIN_NAME)) {
    if (!options.force) {
      warn(`${PLUGIN_NAME} is already installed.`)
      return
    }
    info('Plugin already installed, continuing with --force...')
  }

  // Add the plugin to array if not present
  if (!plugins.includes(PLUGIN_NAME)) {
    config.plugin = [...plugins, PLUGIN_NAME]
  }

  // Write updated config
  writeJsonc(configPath, config)
  success(`Added ${PLUGIN_NAME} to ${configPath}`)

  // Initialize orca.json if it doesn't exist
  if (!existsSync(orcaConfigPath)) {
    info('')
    info('Initializing Orca configuration...')
    await init({ force: false })
  }

  // Success message with next steps
  info('')
  success('Installation complete!')
  info('')
  info('Next steps:')
  info('  1. Review your configuration in .opencode/orca.json')
  info('  2. Start OpenCode to use the Orca plugin')
}
