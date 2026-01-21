---
status: accepted
date: 2026-01-19
decision-makers: julian
supersedes: 001-rejection-of-autonomy-levels
---

# Multi-Agent Dispatch with Role Separation and Persistent Plans

## Status History

| status   | date       | decision-makers | github                                     |
|----------|------------|-----------------|--------------------------------------------|
| proposed | 2026-01-19 | julian          | [@eXamadeus](https://github.com/eXamadeus) |
| accepted | 2026-01-19 | julian          | [@eXamadeus](https://github.com/eXamadeus) |

## Related ADRs

- [ADR-001](superseded/001-rejection-of-autonomy-levels.md): Per-agent supervision (superseded by this ADR)
- [ADR-003](./003-plan-execution-separation.md): Plan/execution separation (refines this ADR)
- [ADR-004](./004-builder-pattern-for-plans.md): Builder pattern for plans (modifies ADR-003)

## Context and Problem Statement

The initial Orca implementation used a single dispatch mechanism for all agent communication. This created role confusion (the entry agent made decisions it shouldn't), context loss (each specialist started fresh), plan volatility (plans existed only in conversation context), and unreliable HITL (human decisions flowed through LLMs which can't be trusted as gates).

## Decision Drivers

* The entry agent has access to capabilities it shouldn't use and makes decisions it shouldn't make
* Plans are lost if a session dies — no way to resume execution
* Specialists don't know what previous steps discovered, leading to redundant research
* LLMs cannot be trusted as deterministic gates for approval decisions
* Per-call approval creates fatigue; plan-level approval is more meaningful

## Considered Options

* **Single dispatch mechanism** — One tool handling all agent communication
* **Multi-tool with role separation** — Different capabilities for different roles, plugin-controlled HITL
* **Agent-mediated HITL** — Keep current approach but route approvals through a dedicated approval agent

## Decision Outcome

Chosen option: **Multi-tool with role separation**, because it enforces clear boundaries between routing, planning, and execution while ensuring HITL decisions are deterministic.

### Core Principles

1. **Role boundaries are enforced by capability, not instruction.** Agents only have access to tools appropriate for their role. The entry agent can route but not execute. The planner can research but not modify files. Specialists can execute but only within their domain.

2. **Plans are persistent and can be resumed.** Plans survive session death and can be picked up later. This enables retry, audit, and long-running workflows.

3. **Context flows forward between steps.** Each execution step receives summaries of previous steps, key findings, and accumulated relevant files. Specialists don't start from scratch.

4. **HITL decisions are deterministic, not LLM-interpreted.** The plugin presents options to the user and receives a selection. The LLM is not in the approval path.

5. **Approval happens at plan level, not tool level.** Users approve entire plans before execution begins, reducing approval fatigue.

### Role Separation

| Role            | Capabilities                                              | Responsibilities                                             |
|-----------------|-----------------------------------------------------------|--------------------------------------------------------------|
| **Entry Agent** | Route to planner, help find/resume plans                  | Forward user messages, report results                        |
| **Planner**     | Research (read-only), produce plans, ask clarifying questions | Understand intent, gather context, create execution plans    |
| **Specialists** | Execute tasks, ask questions to other specialists         | Perform work, report results, request help when stuck        |

### Plugin-Controlled HITL

Human decisions use a **two-question pattern**:

1. **Action Question** — Deterministic choice from predefined options (e.g., Approve / Request Changes / Reject)
2. **Context Question** — Optional freeform input for additional guidance

This ensures the critical decision (what action to take) is never interpreted by an LLM.

| Touchpoint         | Options                            |
|--------------------|------------------------------------|
| Plan Approval      | Approve / Request Changes / Reject |
| Deviation Handling | Retry / Replan / Stop              |

### Consequences

* Good, because clear separation of concerns (routing vs. planning vs. execution)
* Good, because plans survive session death and can be resumed
* Good, because context flows between steps, eliminating redundant research
* Good, because HITL decisions are deterministic and auditable
* Neutral, because requires intent channel for full HITL (can stub with auto-approve)
* Bad, because more complex tool surface
* Bad, because plan persistence requires storage management

### Confirmation

* Entry agent prompt should only reference routing capabilities — no file/bash access
* Plans should be persisted with state machine status
* Integration tests should verify context threading between steps
* HITL stubs should log decisions until intent channel is available

## Pros and Cons of the Options

### Single dispatch mechanism

One tool handling all agent communication.

* Good, because simple tool surface
* Bad, because entry agent has too much responsibility and access
* Bad, because plans are volatile (lost on session death)
* Bad, because no context threading between steps
* Bad, because HITL flows through LLM, which is unreliable

### Multi-tool with role separation

Different capabilities for different roles with plugin-controlled HITL.

* Good, because enforces role boundaries via tool availability
* Good, because persistent plans enable resume after failure
* Good, because lean prompts with self-serve context access
* Good, because deterministic HITL via plugin, not LLM
* Neutral, because requires new plan storage management
* Bad, because more tools to document and maintain

### Agent-mediated HITL

Keep current tools but route approvals through a dedicated approval agent.

* Good, because minimal changes to existing architecture
* Bad, because still relies on LLM for gate decisions
* Bad, because adds another agent layer without solving root problems
* Bad, because doesn't address context threading or plan persistence

## More Information

### Plans

Plans will be persisted to file for durability and resumption.

### Context Threading

Each step receives:
- Plan reference and goal
- Previous step summaries (not full outputs)
- Key findings accumulated so far
- Relevant files discovered by previous steps

Specialists can query for full plan details if needed.

### Read-Only Research

When the planner or specialists need information from another agent, they use read-only dispatch. This prevents side effects during research and planning phases.
