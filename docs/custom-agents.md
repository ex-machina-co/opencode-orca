# Custom Agents

Create specialized agents tailored to your project needs.

## How Custom Agents Work

Custom agents are defined in `.opencode/orca.json` under the `agents` key. Configurations merge with defaults, allowing you to override built-in agents (same name) or add new ones (unique name).

Built-in agents: `orca`, `planner`, `coder`, `tester`, `reviewer`, `researcher`, `document-writer`, `architect`

## Configuration Fields

For overrides, all fields are optional (they merge). For new agents, include:

| Field         | Purpose                                                   |
|---------------|-----------------------------------------------------------|
| `mode`        | Set to `'subagent'` for agents dispatched by Orca         |
| `description` | Shown in UI; helps planner select the right agent         |
| `prompt`      | System prompt defining agent behavior                     |
| `accepts`     | Message types this agent accepts (`'task'`, `'question'`) |
| `specialist`  | Set to `true` to include in planner's specialist list     |

See [Configuration Reference](configuration.md) for all fields.

> **Note**: `orca` and `planner` have restricted configuration - only model, temperature, top_p, maxSteps, and color can be changed. See [Configuration Reference](configuration.md) for details.

## Agent Roles in the System

Custom agents fit into the execution flow based on their configuration:

```
User → Orca → Planner → [Plan Approval HITL] → Execution Loop → Specialists
                                                                    ↑
                                                          Your custom agent
```

**Specialists** (custom agents with `specialist: true`):
- Receive tasks from the plugin's internal execution loop
- Are assigned to plan steps by the planner
- Can use `orca_ask_specialist` for read-only questions to other agents
- Can use `orca_describe_plan` to get plan context

## Input Types (`accepts`)

The `accepts` array defines what message types an agent can receive:

| Type     | Purpose                 | Typical Use                    |
| -------- | ----------------------- | ------------------------------ |
| `task`     | Work execution requests | Agents that modify files/state |
| `question` | Information requests    | Research and analysis agents   |

For custom agents, `accepts` defaults to `['task', 'question']`. Built-in specialists may be overridden. Set based on agent purpose:
- `accepts: ['task', 'question']` — executes work (e.g., coder, tester)
- `accepts: ['question']` — answers questions only (e.g., researcher, architect)
- `accepts: ['task']` — only does work (e.g., document-writer) 

## Response Types

Agents return flat JSON messages based on their role:

| If agent accepts | Responds with    |
| ---------------- | ---------------- |
| `task`             | `success`, `failure` |
| `question`         | `answer`, `failure`  |

### Message Fields

| Type    | Fields                                     |
| ------- | ------------------------------------------ |
| `answer`  | `content`, `sources?`, `annotations?`            |
| `success` | `summary`, `artifacts?`, `verification?`, `notes?` |
| `failure` | `code`, `message`, `cause?`                      |

Error codes: `VALIDATION_ERROR`, `UNKNOWN_AGENT`, `SESSION_NOT_FOUND`, `AGENT_ERROR`, `TIMEOUT`

### Example: Answer Response

```json
{
  "type": "answer",
  "content": "Found 2 potential vulnerabilities...",
  "sources": [{ "type": "file", "ref": "src/auth.ts" }]
}
```

### Example: Success Response

```json
{
  "type": "success",
  "summary": "Completed security audit of auth module",
  "artifacts": ["docs/security-audit.md"],
  "verification": ["No critical vulnerabilities found"]
}
```

## Tools Available to Custom Agents

Specialist agents have access to these dispatch tools:

| Tool                | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `orca_ask_specialist` | Ask read-only questions to other agents      |
| `orca_describe_plan`  | Get full plan details for additional context |

**Example**: A custom `security-reviewer` agent analyzing code could use `orca_ask_specialist` to ask the `researcher` about known vulnerabilities in a dependency.

**Note**: These tools create read-only sessions - the target agent cannot modify files.

## Complete Example: Security Reviewer

```json
{
  "agents": {
    "security-reviewer": {
      "description": "Reviews code for security vulnerabilities",
      "mode": "subagent",
      "model": "claude-sonnet-4-20250514",
      "specialist": true,
      "accepts": ["question"],
      "prompt": "You are a security specialist. Analyze code for vulnerabilities including injection attacks, authentication flaws, and data exposure. Cite file locations. Use orca_ask_specialist to research CVEs or dependency issues if needed.",
      "permission": { "edit": "deny", "bash": "deny" }
    }
  }
}
```

This agent:
- `specialist: true` — appears in planner's specialist list for plan steps
- `accepts: ["question"]` — only receives information requests (read-only analysis)
- `permission` — restricted from writing files or running bash

Use it: The planner will assign this agent to security-related steps in plans.

## Complete Example: Database Migrator

```json
{
  "agents": {
    "db-migrator": {
      "description": "Creates and manages database migrations",
      "mode": "subagent",
      "model": "claude-sonnet-4-20250514",
      "specialist": true,
      "accepts": ["task"],
      "prompt": "You are a database migration specialist. Create migrations using the project's migration framework. Always create reversible migrations. Test migrations locally before marking complete."
    }
  }
}
```

This agent:
- `specialist: true` — available for database migration steps
- `accepts: ["task"]` — executes work (creates migration files)
- No permission restrictions — can write files

## Overriding Built-in Agents

Use the same name; only specify fields to change:

```json
{
  "agents": {
    "coder": {
      "model": "claude-sonnet-4-20250514",
      "maxSteps": 30
    }
  }
}
```

This changes the model and step limit while keeping the default prompt and tools.

## Testing Custom Agents

1. Verify config loads without errors (check OpenCode startup)
2. Ask Orca to create a plan involving your agent's specialty
3. Confirm your agent appears in the plan steps
4. Approve the plan and verify your agent executes correctly
5. Check responses match the expected types for what the agent `accepts`

Failed validations retry up to `validation.maxRetries` times before returning failure.

## Plan Context Awareness

When your agent executes as part of a plan, it receives context about:
- The overall plan goal
- Which step it's executing
- Summaries from previous steps
- Relevant files accumulated from the plan

Your agent can fetch additional context using `orca_describe_plan` if needed.

## See Also

- [Architecture](architecture.md) - System design and agent roles
- [Configuration Reference](configuration.md) - All configuration options
- [Supervision](supervision.md) - HITL approval and deviation handling
