# opencode-orca

OpenCode plugin for Orca + Specialists agent orchestration.

## Overview

This plugin provides a structured agent orchestration system with:

- **Type-enforced contracts** via Zod discriminated union validation
- **State machine orchestration** (IDLE/EXECUTING) with human-in-the-loop gates
- **Session continuity** between agents via session_id tracking
- **Configurable autonomy levels** (supervised, assisted, autonomous)

## Installation

The easiest way to install is using the CLI:

```bash
bunx opencode-orca install
```

This will:
1. Add `opencode-orca` to the `plugin` array in your `opencode.jsonc`
2. Create a default configuration file at `.opencode/orca.json`

### Manual Installation

Alternatively, add to your `opencode.jsonc` manually:

```json
{
  "plugin": ["opencode-orca"]
}
```

Then create `.opencode/orca.json` with:

```json
{
  "settings": {
    "autonomy": "supervised"
  },
  "agents": {}
}
```

## CLI Commands

### `opencode-orca install`

Installs the Orca plugin into your OpenCode project.

```bash
bunx opencode-orca install [options]

Options:
  --force, -f    Force reinstall even if already installed
```

### `opencode-orca uninstall`

Removes the Orca plugin from your OpenCode project.

```bash
bunx opencode-orca uninstall [options]

Options:
  --remove-config, -r    Remove .opencode/orca.json without prompting
  --keep-config, -k      Keep .opencode/orca.json without prompting
```

### `opencode-orca init`

Creates only the `.opencode/orca.json` configuration file without modifying `opencode.jsonc`. Useful for customizing the config before installing.

```bash
bunx opencode-orca init [options]

Options:
  --force, -f    Overwrite existing configuration
```

### `opencode-orca --help`

Shows help information.

### `opencode-orca --version`

Shows the installed version.

## Architecture

```
User Inputa
    │
    ▼
  Orca (Orchestrator)
    │
    ├──► Strategist (Planning)
    │
    └──► Specialists (Execution)
         ├── Coder
         ├── Tester
         ├── Reviewer
         ├── Researcher
         ├── Document Writer
         └── Architect
```

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Watch mode
bun run dev

# Type check
bun run typecheck

# Test
bun test
```

## License

MIT
