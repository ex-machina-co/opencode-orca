# Getting Started

Get up and running with opencode-orca in under 30 seconds.

## Prerequisites

- [OpenCode](https://opencode.ai) ^1.0.0
- [Bun](https://bun.sh) runtime

## Quick Start

### 1. Install the plugin

Run this command in your project directory:

```bash
bunx @ex-machina/opencode-orca@latest install
```

This command:
- Adds `@ex-machina/opencode-orca` to the `plugin` array in your `opencode.jsonc`
- Creates a default configuration file at `.opencode/orca.json`
- Generates `orca.schema.json` for editor autocomplete

### 2. Verify installation

Check that the plugin was added to your OpenCode config:

```bash
cat opencode.jsonc
```

You should see:

```json
{
  "plugin": ["@ex-machina/opencode-orca"]
}
```

### 3. Start OpenCode

Launch OpenCode in your project:

```bash
opencode
```

### 4. Talk to Orca

In the OpenCode chat, try:

```
@orca Help me refactor the authentication module
```

Orca will route your request to the planner, which will analyze it and create an execution plan.

## What happens next

When you interact with Orca:

1. **Orca** routes your request to the planner
2. **Planner** may ask clarifying questions via HITL prompts
3. **Planner** creates a structured execution plan
4. **You review and approve** the plan (or request changes)
5. **Execution loop** runs each step with the appropriate specialist
6. **Context flows** between steps - each specialist sees what previous steps accomplished
7. **On failure**, you choose to Retry, Replan, or Stop

Plans are saved to `.opencode/plans/` so you can resume or review them later.

## Next steps

- [Architecture](./architecture.md) - Understand the system design and tools
- [Supervision](./supervision.md) - Learn about HITL approval and deviation handling
- [Custom Agents](./custom-agents.md) - Create your own specialist agents
- [Configuration](./configuration.md) - Customize models and agent behavior
