---
status: proposed
date: 2026-01-19
decision-makers: eXamadeus
---

# Multi-Tool Dispatch with Role Separation and Persistent Plans

## Context and Problem Statement

The current Orca implementation uses a single `orca_dispatch` tool for all agent communication. This creates role confusion (Orca makes decisions it shouldn't), context loss (each specialist starts fresh), plan volatility (plans exist only in conversation context), and unreliable HITL (human decisions flow through LLMs which can't be trusted as gates).

## Decision Drivers

* Orca has access to tools it shouldn't use (file access, bash) and makes decisions it shouldn't make
* Plans are lost if a session dies — no way to resume execution
* Specialists don't know what previous steps discovered, leading to redundant research
* LLMs cannot be trusted as deterministic gates for approval decisions
* Per-call approval creates fatigue; plan-level approval is more meaningful

## Considered Options

* **Single dispatch tool** — Current approach with `orca_dispatch` handling everything
* **Multi-tool with role separation** — Different tools for different roles, plugin-controlled HITL
* **Agent-mediated HITL** — Keep current tools but route approvals through a dedicated approval agent

## Decision Outcome

Chosen option: **Multi-tool with role separation**, because it enforces clear boundaries between routing, planning, and execution while ensuring HITL decisions are deterministic.

### Tool Assignment by Role

| Role            | Tools Available                                                                    | Responsibilities                                             |
|-----------------|------------------------------------------------------------------------------------|--------------------------------------------------------------|
| **Orca**        | `orca_ask_planner`, `orca_list_plans`, `orca_describe_plan`                        | Route user messages to planner, help find/resume plans       |
| **Planner**     | `orca_ask_specialist` (read-only), `orca_list_plans`, `orca_describe_plan`         | Research, produce plans, answer questions, revise on failure |
| **Specialists** | `orca_ask_specialist` (read-only), `orca_list_plans`, `orca_describe_plan`         | Execute tasks, ask questions to non-supervised agents        |

Note: `orca_list_plans` and `orca_describe_plan` are allowed for the Orca agent for convenience. We may revoke these later if they result in erroneous routing.

### Plugin-Controlled HITL

All human decisions use `question.ask()` with the **two-question pattern**:

1. **Action Question** (`custom: false`) — Deterministic choice from predefined options
2. **Context Question** (`custom: true`) — Optional freeform input for additional guidance

| Touchpoint         | Options                            |
|--------------------|------------------------------------|
| Plan Approval      | Approve / Request Changes / Reject |
| Deviation Handling | Retry / Replan / Stop              |

### Consequences

* Good, because clear separation of concerns (routing vs. planning vs. execution)
* Good, because plans survive session death and can be resumed
* Good, because context flows between steps, eliminating redundant research
* Good, because HITL decisions are deterministic and auditable
* Neutral, because requires OpenCode Intent Channel for full HITL (can stub with auto-approve)
* Bad, because more complex tool surface (4 tools instead of 1)
* Bad, because plan files require storage management (draft pruning)

### Confirmation

* Orca agent prompt should only reference its three tools — no file/bash access
* Plan files should be created in `.opencode/plans/` with state machine status
* Integration tests should verify context threading between steps
* HITL stubs should log decisions until Intent Channel is available

## Pros and Cons of the Options

### Single dispatch tool

Current approach where `orca_dispatch` handles all agent communication.

* Good, because simple tool surface (one tool)
* Bad, because Orca has too much responsibility and access
* Bad, because plans are volatile (lost on session death)
* Bad, because no context threading between steps
* Bad, because HITL flows through LLM, which is unreliable

### Multi-tool with role separation

Different tools for different roles with plugin-controlled HITL.

* Good, because enforces role boundaries via tool availability
* Good, because persistent plans enable resume after failure
* Good, because lean prompts with self-serve context access
* Good, because deterministic HITL via plugin, not LLM
* Neutral, because requires new plan file management
* Bad, because more tools to document and maintain

### Agent-mediated HITL

Keep current tools but route approvals through a dedicated approval agent.

* Good, because minimal changes to existing architecture
* Bad, because still relies on LLM for gate decisions
* Bad, because adds another agent layer without solving root problems
* Bad, because doesn't address context threading or plan persistence

## More Information

### Plan File Schema

Plans stored at `.opencode/plans/{plan_id}.json` with lifecycle:
```
drafting → pending_approval → approved → in_progress → completed
                 ↓                              ↓
          changes_requested                  failed
```

### Context Threading

Each step receives: plan reference, previous step summaries, key findings, accumulated relevant files. Agents can call `orca_describe_plan` for full details.

### Read-Only Permissions

`orca_ask_specialist` creates sessions with restricted permissions:
- Deny: `edit`, `write`, `patch`, `multiedit`, `task`, dispatch tools
- Allow: `read`, `glob`, `grep`, `list`, `webfetch`, `websearch`, `codesearch`

*Source: [dispatch-refactor-v2.md](/tmp/dispatch-refactor-v2.md)*

### Related ADRs

- [ADR-001](./001-rejection-of-autonomy-levels.md): Rejected autonomy levels for per-agent supervision (superseded by this ADR)
- [ADR-003](./003-plan-execution-separation.md): Refines this proposal with plan/execution separation and updated tool naming
