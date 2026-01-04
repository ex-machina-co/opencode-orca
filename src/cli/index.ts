import { init } from './commands/init'
import { install } from './commands/install'
import { uninstall } from './commands/uninstall'
import { error, info } from './utils/console'
import { getVersion } from './utils/version'

const HELP = `
@ex-machina/opencode-orca - CLI for installing and configuring the Orca plugin

Usage:
  opencode-orca <command> [options]

Commands:
  install     Add the Orca plugin to your OpenCode configuration
  uninstall   Remove the Orca plugin from your OpenCode configuration
  init        Create a default .opencode/orca.json configuration file

Options:
  --help, -h      Show this help message
  --version, -v   Show version number

Examples:
  opencode-orca install       # Install the plugin
  opencode-orca init          # Create config without modifying opencode.jsonc
  opencode-orca uninstall     # Remove the plugin
`

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  // Handle flags
  if (!command || command === '--help' || command === '-h') {
    info(HELP)
    process.exit(0)
  }

  if (command === '--version' || command === '-v') {
    info(`@ex-machina/opencode-orca v${getVersion()}`)
    process.exit(0)
  }

  // Parse command-specific flags
  const flags = new Set(args.slice(1))

  try {
    switch (command) {
      case 'install':
        await install({ force: flags.has('--force') || flags.has('-f') })
        break
      case 'uninstall':
        await uninstall({
          removeConfig: flags.has('--remove-config') || flags.has('-r'),
          keepConfig: flags.has('--keep-config') || flags.has('-k'),
        })
        break
      case 'init':
        await init({ force: flags.has('--force') || flags.has('-f') })
        break
      default:
        error(`Unknown command: ${command}`)
        info(HELP)
        process.exit(1)
    }
  } catch (err) {
    if (err instanceof Error) {
      error(err.message)
    } else {
      error('An unexpected error occurred')
    }
    process.exit(1)
  }
}

main()
