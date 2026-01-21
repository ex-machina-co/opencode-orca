# ADR Guidelines

## Abstraction Level

ADRs document **architectural decisions**, not implementation details.

**Do include:**
- Principles and patterns
- State machines and lifecycles (conceptual)
- Role responsibilities and boundaries
- Decision drivers and trade-offs

**Do not include:**
- Function or method names
- TypeScript types or code snippets
- File paths or storage structures
- Tool names or API specifics
- Configuration examples

If implementation details are necessary for clarity, keep them minimal and abstract. Prefer "the service layer orchestrates execution" over "ExecutionService.claimNextTask() returns the next pending task".

## Structure

Each ADR should follow this structure:

1. **Frontmatter** - YAML metadata (status, date, decision-makers, relationships)
2. **Title** - Clear, descriptive heading
3. **Status History** - Table tracking status changes with links
4. **Related ADRs** - Links to related decisions (near the top for visibility)
5. **Context and Problem Statement** - What problem are we solving?
6. **Decision Drivers** - Bullet list of constraints and requirements
7. **Considered Options** - Brief list of alternatives
8. **Decision Outcome** - Which option and why
9. **Core Principles** - Numbered list of key architectural principles
10. **Consequences** - Good/Neutral/Bad impacts
11. **Pros and Cons of Options** - Detailed comparison
12. **More Information** - Additional context and examples

## Status Values

| Status       | Meaning                                              |
|--------------|------------------------------------------------------|
| `proposed`   | Under discussion, not yet decided                    |
| `accepted`   | Decision made and in effect                          |
| `superseded` | Fully replaced by another ADR (moved to superseded/) |

Note: When an ADR is **modified** (not superseded), it keeps `status: accepted`. The modification is tracked via the `modified-by` frontmatter field and a status history entry.

## Frontmatter Fields

| Field             | Required | Description                                          |
|-------------------|----------|------------------------------------------------------|
| `status`          | Yes      | Current status: `proposed`, `accepted`, `superseded` |
| `date`            | Yes      | Date of initial proposal (YYYY-MM-DD)                |
| `decision-makers` | Yes      | Who made/approved the decision                       |
| `supersedes`      | No       | ADR filename this decision fully replaces            |
| `superseded-by`   | No       | ADR filename that fully replaced this decision       |
| `modifies`        | No       | ADR filename this decision partially changes         |
| `modified-by`     | No       | ADR filename that partially changed this decision    |

## Relationships

ADRs can have relationships with other ADRs. These are tracked in both frontmatter and visible callouts.

### Supersedes (full replacement)

When an ADR completely replaces another, update both ADRs and move the old one to `superseded/`.

**The new ADR (002):**

```markdown
---
status: accepted
date: 2026-01-19
decision-makers: julian
supersedes: 001-old-decision
---

# New Decision Title

## Status History

| status   | date       | decision-makers | github |
|----------|------------|-----------------|--------|
| proposed | 2026-01-19 | julian          | @user  |
| accepted | 2026-01-19 | julian          | @user  |

## Related ADRs

- [ADR-001](superseded/001-old-decision.md): Old approach (superseded by this ADR)

## Context and Problem Statement
...
```

**The old ADR (001)** — move to `superseded/`:

```markdown
---
status: superseded
date: 2026-01-04
decision-makers: julian
superseded-by: 002-new-decision
---

# Old Decision Title

## Status History

| status                                             | date       | decision-makers | github |
|----------------------------------------------------|------------|-----------------|--------|
| accepted                                           | 2026-01-04 | julian          | @user  |
| superseded by [ADR-002](../002-new-decision.md)    | 2026-01-19 | julian          | @user  |

## Related ADRs

- [ADR-002](../002-new-decision.md): New approach (supersedes this ADR)

## Context and Problem Statement
...
```

### Modifies (partial replacement)

When an ADR changes part of another but core principles remain, update both ADRs. The modified ADR stays in place.

**The modifying ADR (004):**

```markdown
---
status: accepted
date: 2026-01-20
decision-makers: julian
modifies: 003-original-decision
---

# Modifying Decision Title

## Status History

| status   | date       | decision-makers | github |
|----------|------------|-----------------|--------|
| proposed | 2026-01-20 | julian          | @user  |
| accepted | 2026-01-20 | julian          | @user  |

## Related ADRs

- [ADR-003](./003-original-decision.md): Original approach (modified by this ADR)

## Context and Problem Statement
...
```

**The modified ADR (003)** — stays in place with `status: accepted`:

```markdown
---
status: accepted
date: 2026-01-20
decision-makers: julian
modified-by: 004-modifying-decision
---

# Original Decision Title

## Status History

| status                                              | date       | decision-makers | github |
|-----------------------------------------------------|------------|-----------------|--------|
| proposed                                            | 2026-01-20 | julian          | @user  |
| accepted                                            | 2026-01-20 | julian          | @user  |
| modified by [ADR-004](./004-modifying-decision.md)  | 2026-01-20 | julian          | @user  |

## Related ADRs

- [ADR-004](./004-modifying-decision.md): Modifying approach (modifies this ADR)

## Context and Problem Statement
...
```

## File Organization

```
adrs/
├── AGENTS.md                    # This file
├── adr-template.md              # Template for new ADRs
├── 002-current-decision.md      # Active ADRs
├── 003-another-decision.md
├── 004-modifying-decision.md
└── superseded/
    └── 001-old-decision.md      # Fully superseded ADRs
```

## Related ADRs Section

Place the "Related ADRs" section after the status history. This keeps status information first while making relationships visible near the top.

```markdown
# Decision Title

## Status History

| status   | date       | decision-makers | github |
|----------|------------|-----------------|--------|
| proposed | 2026-01-20 | julian          | @user  |
| accepted | 2026-01-20 | julian          | @user  |

## Related ADRs

- [ADR-001](superseded/001-old-decision.md): Brief description (superseded by this ADR)
- [ADR-003](./003-other-decision.md): Brief description (modified by ADR-004)

## Context and Problem Statement
...
```
