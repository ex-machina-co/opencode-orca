# opencode-orca Documentation

OpenCode plugin for multi-agent orchestration with plan-based execution and human-in-the-loop supervision.

## What is opencode-orca?

A plugin that adds intelligent agent orchestration to OpenCode with:

- **Plan-based execution** - Planner creates structured plans, users approve before execution
- **HITL supervision** - Human-in-the-loop approval for plans and deviation handling
- **Built-in specialists** - Coder, Tester, Reviewer, Researcher, Document Writer, Architect
- **Custom agents** - Define project-specific agents via `orca.json`
- **Context threading** - Step outputs flow to subsequent steps automatically

## Documentation

| Guide                                | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| [Getting Started](getting-started.md) | Installation, first run, basic usage        |
| [Architecture](architecture.md)       | System design, tools, plan lifecycle        |
| [Supervision](supervision.md)         | HITL approval, deviation handling           |
| [Custom Agents](custom-agents.md)     | Defining and configuring custom specialists |
| [Configuration](configuration.md)     | `orca.json` schema and options reference      |
| [Troubleshooting](troubleshooting.md) | Common issues and solutions                 |

## Quick Navigation

**I want to...**

- **Install the plugin** → [Getting Started](getting-started.md)
- **Understand how it works** → [Architecture](architecture.md)
- **Configure plan approval** → [Supervision](supervision.md)
- **Add a custom agent** → [Custom Agents](custom-agents.md)
- **Configure agent behavior** → [Configuration](configuration.md)
- **Fix an error** → [Troubleshooting](troubleshooting.md)

## Quick Install

```bash
bunx @ex-machina/opencode-orca@latest install
```

See [Getting Started](getting-started.md) for details.
