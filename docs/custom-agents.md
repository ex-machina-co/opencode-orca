# Custom Agents

Create specialized agents tailored to your project needs.

## How Custom Agents Work

Custom agents are defined in `.opencode/orca.json` under the `agents` key. Configurations merge with defaults, allowing you to override built-in agents (same name) or add new ones (unique name).

Built-in agents: `orca`, `planner`, `coder`, `tester`, `reviewer`, `researcher`, `document-writer`, `architect`

## Configuration Fields

For overrides, all fields are optional (they merge). For new agents, include:

| Field         | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `mode`          | Set to `'subagent'` for agents dispatched by Orca      |
| `description`   | Shown in UI; helps Orca select the right agent       |
| `prompt`        | System prompt defining agent behavior                |
| `accepts`       | Message types this agent accepts (`'task'`, `'question'`) |
| `specialist`    | Set to `true` to include in Orca's specialist list     |

See [Configuration Reference](configuration.md) for all fields.

> **Note**: `orca` and `planner` are protected agents and cannot be overridden.

## Protocol Requirements

Agents receive messages via `DispatchPayload` and respond with flat JSON messages (no wrapper):

```typescript
// What agents receive
DispatchPayload: { agent_id, session_id?, message }

// What agents return (flat structure)
{ "type": "answer", "content": "..." }
```

## Input Types (`accepts`)

The `accepts` array defines what message types an agent can receive:

| Type       | Purpose                              | Default for specialists |
| ---------- | ------------------------------------ | ----------------------- |
| `task`       | Work execution requests              | Yes                     |
| `question`   | Information requests                 | Yes                     |

Specialists default to `accepts: ['task', 'question']`. Override to restrict:
- `accepts: ['task']` — only work requests (e.g., coder)
- `accepts: ['question']` — only information requests (e.g., researcher)

## Response Types

Response types are derived automatically from `accepts`:

| If agent accepts | Can respond with                       |
| ---------------- | -------------------------------------- |
| `task`             | `success`, `failure`, `checkpoint`         |
| `question`         | `answer`, `failure`                        |
| (any specialist) | `interrupt` (always available)           |

### Message Fields

| Type         | Fields                                             |
| ------------ | -------------------------------------------------- |
| `answer`       | `content`, `sources?`, `annotations?`                  |
| `success`      | `summary`, `artifacts?`, `verification?`, `notes?`       |
| `failure`      | `code`, `message`, `cause?`                            |
| `checkpoint`   | `prompt`, `step_index?`, `plan_goal?`                  |
| `interrupt`    | `reason`                                             |

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

## Complete Example: Security Reviewer

```json
{
  "agents": {
    "security-reviewer": {
      "description": "Reviews code for security vulnerabilities",
      "mode": "subagent",
      "model": "claude-sonnet-4-20250514",
      "specialist": true,
      "supervised": true,
      "accepts": ["question"],
      "prompt": "You are a security specialist. Analyze code for vulnerabilities including injection attacks, authentication flaws, and data exposure. Cite file locations. Ask questions if scope is unclear.",
      "permission": { "edit": "deny", "bash": "deny" }
    }
  }
}
```

This agent:
- `specialist: true` — appears in Orca's specialist list
- `accepts: ["question"]` — only receives information requests (read-only analysis)
- `supervised: true` — requires approval before dispatch

Use it: `@orca Review the auth module for security issues`

## Overriding Built-in Agents

Use the same name; only specify fields to change:

```json
{
  "agents": {
    "coder": {
      "supervised": true,
      "model": "claude-sonnet-4-20250514",
      "maxSteps": 30
    }
  }
}
```

This adds supervision to coder while keeping its default prompt and tools.

## Testing Custom Agents

1. Verify config loads without errors (check OpenCode startup)
2. Dispatch to your agent via `@orca` with a relevant task or question
3. Confirm responses match the expected types for what the agent `accepts`
4. Check supervision gates appear if `supervised: true`

Failed validations retry up to `validation.maxRetries` times before returning failure.

## See Also

- [Configuration Reference](configuration.md) - All configuration options
- [Supervision](supervision.md) - Approval checkpoints
