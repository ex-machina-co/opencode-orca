---
name: command-design
description: Principles and patterns for writing slash command definitions
---

# Command Design

How to write and maintain commands in `.opencode/commands/<name>.md`.

## Commands Are User-Triggered Workflows

A command defines a repeatable process kicked off by a slash command.
It should be self-contained: everything needed to execute the workflow
is in the command file.

| Command (workflow)              | Not a command                              |
| ------------------------------- | ------------------------------------------ |
| /ship -- verify, commit, PR     | Answering "what should I work on?" (agent) |
| /work -- pick issue, set up env | How to write good commit messages (skill)  |
| /prune -- clean merged worktrees | Deciding priority order (agent)           |

## Structure

```markdown
---
description: <what this command does>
---

## /<command-name> Command

<1 sentence summary>

### Input
- <parameter>: $ARGUMENTS

### Phase 1: <Step Name>
<Instructions>

### Phase 2: <Step Name>
<Instructions>

### Phase N: Report
<Output summary>
```

## Key Principles

**Phase-based flow**: Break workflows into numbered phases with clear
boundaries. Each phase has a single responsibility. This makes
commands easy to follow, debug, and modify.

**Decision trees over prose**: Use tables and if/then structures for
branching logic. Commands often have multiple paths -- make them
explicit, not buried in paragraphs.

**Delegate to agents**: Commands compose agents, they don't duplicate
agent logic. If an agent knows how to create PRs, the command
delegates to it rather than reimplementing PR creation.

**Explicit stop points**: Define exactly when to STOP and ask the
user. Especially at:
- Uncertainty (can't determine intent)
- Confirmation (destructive or irreversible actions)
- Ambiguity (multiple valid paths)

**Report at the end**: Every command ends with a summary of what
happened. The user should know what changed without re-inspecting.

## Maintenance

**Commands are the most brittle extension point** because they
hard-code workflows that compose agents and tools. When an agent's
interface changes, commands that delegate to it may break.

When updating a command:
- Check which phases delegate to agents
- Verify the agent's scope still covers what the command expects
- Update delegation instructions if agent behavior changed

When an agent changes:
- Search commands for references to that agent
- Verify delegations still make sense
