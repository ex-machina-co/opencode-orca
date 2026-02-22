---
name: agent-design
description: Principles and patterns for writing agent definitions
---

# Agent Design

How to write and maintain agent definitions in `.opencode/agents/`.

## The Description Is the Router

The `description` field in agent frontmatter is the single most
important line. It determines when the agent gets invoked by the
parent agent's routing logic.

Write descriptions that match natural-language requests a user would
actually say:

| Bad                                               | Good                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Zenhub-based product management. Uses Zenhub MCP. | Handles project status ("where are we?"), board reviews, issue writing, and work tracking via Zenhub.               |
| Executes git and gh CLI write operations.         | Performs git and GitHub write operations (commits, pushes, PRs, branch management). Read ops use github-read skill. |

**Description checklist:**
- [ ] Includes natural-language phrases users would say
- [ ] States what the agent *handles*, not just what tools it uses
- [ ] Distinguishes this agent's scope from other agents

## Decentralized Ownership

Agents own their own routing. If you need to update a central config
(like AGENTS.md) every time you add or change an agent, the design
is wrong.

- Routing rules belong in the agent's `description` field
- Agent-specific behavior belongs in the agent's body
- AGENTS.md holds project-wide norms (coding style, testing) that
  apply to ALL agents equally

**The test:** "Would I need to update AGENTS.md if I add/remove this
agent?" If yes, the information is in the wrong place.

## Structure

```markdown
---
description: <routing-friendly description>
mode: subagent
color: "<hex>"
permission:
  bash:
    "*": deny
    # Explicit allows...
tools:
  <tool-pattern>: true
---

# <Agent Name>

<1-2 sentences: what this agent does and why it exists>

## Scope

### Owns
- <responsibility 1>
- <responsibility 2>

### Outside Scope
- <thing to route elsewhere> (route to @other-agent)

## Skills

Load these skills when performing specific workflows:
- `skill-name` — when doing X

## Common Workflows

### <Workflow Name>
<Steps>
```

## Key Principles

**Least privilege**: Deny everything by default, explicitly allow
what's needed. Use wildcard denies (`"*": deny`) then specific allows.

**Clear scope boundaries**: Every agent should have "Owns" and
"Outside Scope" sections. When something is outside scope, say where
it should go.

**Skill references**: If the agent should follow specific practices,
reference the skill by name so it can be loaded when needed.

**Self-contained**: An agent definition should contain everything
needed to understand what it does, when it activates, and how it
behaves -- without reading other files.

## Troubleshooting

**Routing fails (wrong agent handles a request):**
Fix the agent's description -- add the natural-language phrases that
should have matched. Don't add routing rules elsewhere.

**Agent produces poor output for a specific task:**
Check if a skill exists for the practice it got wrong. If yes, add a
skill reference to the agent. If no, create a skill, then reference it.
