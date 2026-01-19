# Configuration Reference

Configure opencode-orca via `.opencode/orca.json` in your project root.

## File Structure

```json
{
  "$schema": "./orca.schema.json",
  "orca": { ... },
  "planner": { ... },
  "agents": { ... },
  "settings": { ... }
}
```

All keys are optional. The file itself is optional. The plugin auto-generates `orca.schema.json` for editor autocomplete.

## Top-Level Keys

| Key      | Purpose                                        |
| -------- | ---------------------------------------------- |
| `$schema`  | Path to JSON schema for editor support         |
| `orca`     | Restricted overrides for the orca orchestrator |
| `planner`  | Restricted overrides for the planner agent     |
| `agents`   | Specialist agent configs (override or add new) |
| `settings` | Global plugin settings                         |

## Orca & Planner Configuration

The `orca` and `planner` agents have restricted configuration - only these fields can be overridden:

| Option      | Type         | Description                        |
| ----------- | ------------ | ---------------------------------- |
| `model`       | string       | Model identifier                   |
| `temperature` | number (0-2) | Sampling temperature               |
| `top_p`       | number (0-1) | Nucleus sampling parameter         |
| `maxSteps`    | number       | Maximum steps before agent stops   |
| `color`       | string       | Hex color for UI display (`#RRGGBB`) |

**Example:**
```json
{
  "orca": {
    "model": "claude-sonnet-4-20250514",
    "maxSteps": 20
  },
  "planner": {
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.7
  }
}
```

> **Note**: You cannot override prompts, tools, or permissions for orca/planner - these are managed by the plugin to ensure correct orchestration behavior.

## Settings

Global plugin settings under the `settings` key.

| Option                   | Type          | Default | Description                                      |
| ------------------------ | ------------- | ------- | ------------------------------------------------ |
| `defaultModel`             | string        |         | Default model for agents without explicit config |
| `updateNotifier`           | boolean       | `true`    | Show notifications about plugin updates          |
| `validation.maxRetries`    | number (0-10) | `3`       | Max retries when agent response fails validation |
| `validation.wrapPlainText` | boolean       | `true`    | Wrap plain text responses in result messages     |

## Agent Configuration

Override built-in specialists or define custom ones under the `agents` key.

| Option      | Type                               | Description                                         |
| ----------- | ---------------------------------- | --------------------------------------------------- |
| `model`       | string                             | Model identifier (e.g., `claude-sonnet-4-20250514`) |
| `temperature` | number (0-2)                       | Sampling temperature                                |
| `top_p`       | number (0-1)                       | Nucleus sampling parameter                          |
| `prompt`      | string                             | System prompt (overrides built-in prompt)           |
| `tools`       | `Record<string, boolean>`          | Enable/disable specific tools                       |
| `disable`     | boolean                            | Disable this agent entirely                         |
| `description` | string                             | Agent description shown in UI and to planner        |
| `mode`        | `'subagent' \| 'primary' \| 'all'` | Agent visibility mode                               |
| `color`       | string                             | Hex color for UI display (`#RRGGBB`)                |
| `maxSteps`    | number                             | Maximum steps before agent stops                    |
| `permission`  | PermissionConfig                   | Permission overrides (see below)                    |
| `accepts`     | `('task' \| 'question')[]`         | Message types this agent accepts                    |
| `specialist`  | boolean                            | Include in planner's specialist list                |

### Accepts (Input Types)

The `accepts` array defines what message types can be dispatched TO an agent:

| Value      | Purpose                 | Typical Use                    |
| ---------- | ----------------------- | ------------------------------ |
| `'task'`     | Work execution requests | Agents that modify files/state |
| `'question'` | Information requests    | Research and analysis agents   |

Default: `[]` (must be explicitly set for custom agents). Response types are derived automatically:
- `accepts: ['task']` → responds with `success` or `failure`
- `accepts: ['question']` → responds with `answer` or `failure`

### Permission Config

Fine-grained permission control per agent.

| Permission         | Type                            | Description              |
| ------------------ | ------------------------------- | ------------------------ |
| `edit`               | `'ask' \| 'allow' \| 'deny'`    | File editing permission  |
| `bash`               | enum or `Record<pattern, enum>` | Shell command permission |
| `webfetch`           | `'ask' \| 'allow' \| 'deny'`    | Web fetch permission     |
| `doom_loop`          | `'ask' \| 'allow' \| 'deny'`    | Allow repeated failures  |
| `external_directory` | `'ask' \| 'allow' \| 'deny'`    | Access outside project   |

For `bash`, you can specify per-command patterns:

```json
{
  "bash": {
    "git *": "allow",
    "rm *": "deny",
    "*": "ask"
  }
}
```

## Plan Storage

Plans are automatically stored in `.opencode/plans/` as JSON files. Each plan has:
- A unique `plan_id` (e.g., `pln_abc123def456`)
- Status tracking (drafting, approved, in_progress, completed, failed, etc.)
- Execution state including step results and context

Plan files are managed by the plugin and should not be edited manually.

## Examples

### Override a Built-in Specialist

Change the coder agent's model and step limit:

```json
{
  "agents": {
    "coder": {
      "model": "claude-sonnet-4-20250514",
      "maxSteps": 50
    }
  }
}
```

### Add a Custom Specialist

Define a project-specific agent:

```json
{
  "agents": {
    "api-designer": {
      "description": "Designs REST API endpoints following project conventions",
      "model": "claude-sonnet-4-20250514",
      "mode": "subagent",
      "specialist": true,
      "prompt": "You are an API design specialist. Design RESTful endpoints following best practices. Use orca_ask_specialist to research existing patterns in the codebase.",
      "accepts": ["question"],
      "permission": {
        "edit": "deny",
        "bash": "deny"
      }
    }
  }
}
```

### Create a Read-Only Research Agent

```json
{
  "agents": {
    "security-auditor": {
      "description": "Audits code for security vulnerabilities",
      "mode": "subagent",
      "specialist": true,
      "accepts": ["question"],
      "prompt": "You are a security specialist. Analyze code for vulnerabilities. You cannot modify files - report findings only.",
      "permission": {
        "edit": "deny",
        "bash": {
          "grep *": "allow",
          "find *": "allow",
          "*": "deny"
        }
      }
    }
  }
}
```

### Full Configuration Example

```json
{
  "$schema": "./orca.schema.json",
  "orca": {
    "maxSteps": 15
  },
  "planner": {
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.7
  },
  "agents": {
    "coder": {
      "maxSteps": 50
    },
    "db-migrator": {
      "description": "Creates database migrations",
      "mode": "subagent",
      "specialist": true,
      "accepts": ["task"],
      "prompt": "You are a database migration specialist..."
    }
  },
  "settings": {
    "defaultModel": "claude-sonnet-4-20250514",
    "validation": {
      "maxRetries": 2
    }
  }
}
```

## Validation

The plugin validates `orca.json` on load using Zod schemas. Invalid configs produce clear error messages with paths and expected types. Fix all validation errors before the plugin will load.

The generated `orca.schema.json` file provides editor autocomplete and inline validation in VS Code and other editors that support JSON Schema.

## See Also

- [Custom Agents](custom-agents.md) - Detailed guide on creating agents
- [Supervision](supervision.md) - HITL approval and deviation handling
- [Architecture](architecture.md) - System design and plan lifecycle
