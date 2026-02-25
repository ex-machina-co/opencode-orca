---
name: product-management
description: Issue writing, board hygiene, and product management practices for Zenhub-based workflows
---

# Product Management Practices

Guidelines for writing issues, maintaining board health, and managing
product work in Zenhub.

## Writing Issues

### Structure

Every issue should follow this structure:

| Section                 | Purpose                                              | Required |
| ----------------------- | ---------------------------------------------------- | -------- |
| **Goal**                | 1-2 sentences: what and why                          | Yes      |
| **User Stories**        | Behavior from user/developer perspective             | Yes      |
| **Acceptance Criteria** | Observable outcomes (not implementation steps)       | Yes      |
| **Technical Notes**     | Implementation hints, code pointers, related context | No       |

### User Stories Over Implementation Tasks

Write issues as user stories, not implementation instructions. Stories
survive technical shifts; "Write this function" becomes stale the moment
the architecture changes.

**Bad:**
- "Wire PlanningService.approve() to HITLService.askQuestion()"
- "Add structured output instructions to specialist agent prompts"
- "Register tools in plugin tool: block per ADR-003"

**Good:**
- "As a user, I want to approve, reject, or request changes to a plan
  before it executes"
- "As a user, I don't want execution to fail because the system couldn't
  understand a specialist's response"
- "As a user, I want each agent to only have access to capabilities
  relevant to its role"

### Titles

Titles should describe the *outcome*, not the implementation:

| Bad                                           | Good                                                   |
| --------------------------------------------- | ------------------------------------------------------ |
| Wire Tools to Agents                          | Connect agent capabilities to the orchestration system |
| Rewrite Orca agent prompt for dispatch system | Update entry agent prompt for plan-based workflow      |
| Add structured output instructions            | Specialists report results in a consistent format      |

### Acceptance Criteria

Criteria should be testable observations, not code tasks:

| Bad                                            | Good                                       |
| ---------------------------------------------- | ------------------------------------------ |
| Call planningService.approve() on user confirm | Approved plans hand off to execution       |
| Mock question.ask() in test harness            | Tests run in CI and cover critical paths   |
| Inject JSON schema into agent prompts          | Parsing succeeds without excessive retries |

### Technical Notes

Implementation details belong in a separate **Technical Notes** section
at the bottom of the issue. This includes:

- File paths and function references
- Existing infrastructure that can be reused
- ADR references
- Architecture constraints

This separation means the story stays meaningful even if the
implementation approach changes.

## Board Hygiene

### When to Close Issues

- **Duplicates**: If two issues describe the same work, close the vaguer
  one and reference the specific one
- **Covered by norms**: If something is a project principle (e.g., in
  AGENTS.md), it shouldn't be a standalone issue -- issues are for work
  to be done, not principles to follow
- **Absorbed**: When one issue's scope is fully covered by another,
  close it with a note pointing to the absorbing issue

### When to Merge Issues

Merge when two issues describe the same work from different angles.
Update the surviving issue's scope to cover both, and close the other
with a reference.

### When to Re-scope

Re-scope when work has naturally shifted between issues. Common pattern:
narrow one issue's scope and expand another's to match where the work
actually landed.

### Blocking Relationships

Blocking relationships are **historical dependency records**:

- They record "X had to be done before Y"
- They are **set and never removed**, even when the blocking issue is
  completed
- A completed blocker is not a problem -- it shows the dependency was
  satisfied
- Don't confuse "blocked by a closed issue" with "something is wrong"

### Metadata Hygiene

- Every issue should have an **issue type** set
- Backlog issues in the critical path should have **estimates**
- Estimates don't need to be precise -- they signal relative effort

## Epic Management

### The Epic Body Is the Canonical Status Document

The epic body should contain:

- **Why this matters** -- the user-facing motivation
- **Dependency graph** -- keep the mermaid diagram current
- **Status summary** -- which sub-issues are done, in progress, backlog
- **What users get** -- the outcomes, not the implementation

### Keeping Epics Current

When sub-issues are completed:
- Update the dependency diagram styling (done/in-progress/backlog)
- Update the status summary table
- Remove references to absorbed/closed issues

When issues are merged or re-scoped:
- Update the diagram to reflect the new structure
- Update the critical path if it changed

## Assessing Board Health

When reviewing the board, check for:

1. **Zombie issues**: Work that's been merged/shipped but not closed
2. **Stale scopes**: Issues whose descriptions no longer match reality
3. **Missing issue types/estimates**: Especially on backlog items
4. **Duplicate or overlapping issues**: Candidates for merging
5. **Norm-based issues**: Things that should be habits, not tracked work
6. **Technical vs. user-facing language**: Issues written as
   implementation tasks instead of user stories
7. **Epic accuracy**: Dependency diagrams and status summaries that
   are out of date
