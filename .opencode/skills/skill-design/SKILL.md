---
name: skill-design
description: Principles and patterns for writing skill definitions
---

# Skill Design

How to write and maintain skills in `.opencode/skills/<name>/SKILL.md`.

## Skills Are Reference Docs, Not Actors

A skill is loaded into context to provide knowledge. It doesn't make
decisions, route work, or execute workflows.

| Skill (reference)                     | Not a skill                                |
| ------------------------------------- | ------------------------------------------ |
| How to write user stories             | Query Zenhub and report status (agent job) |
| Git worktree commands and conventions | Commit, push, create PR (command job)      |
| GitHub CLI read operations            | Decide what to work on next (agent job)    |

## One Concern Per Skill

If a skill is trying to be two things, split it. Each skill should
have a single clear answer to "what does this teach?"

**Signs a skill should be split:**
- The title uses "and" between unrelated topics
- Different agents would load it for different reasons
- Sections are independent -- removing one wouldn't affect the others

## Structure

```markdown
---
name: <kebab-case-name>
description: <what this skill teaches>
---

# <Skill Title>

<1 sentence: what this skill covers>

## <Topic>

### <Subtopic>
<Content>
```

## Key Principles

**Concise over comprehensive**: Skills get loaded into context. Every
extra paragraph costs tokens. Include what's needed for correct
behavior, cut the rest.

**Examples over rules**: A good/bad comparison table teaches faster
than a paragraph of explanation.

**No implementation details unless the skill IS about implementation**:
A "product management" skill shouldn't reference class names. A "git
worktree" skill should reference specific commands. Match the
abstraction level to the concern.

**Discoverable**: The `description` field should make it obvious when
to load the skill. Agents and humans both use it to decide relevance.

## Maintenance

**When to create a new skill:**
You notice agents repeatedly getting something wrong, and the
correction is knowledge-based (practices, conventions, patterns) not
capability-based (that's an agent or tool gap).

**When to update a skill:**
The team learns something new about the practice. Capture it
immediately -- skills are the system's long-term memory for how to
do things well.

**When to split a skill:**
You realize you're loading a skill but only using half of it. Split
along the usage boundary.
