---
status: proposed
date: 2026-01-20
decision-makers: eXamadeus, julian
---

# Plan/Execution Separation with Service-Layer Orchestration

## Context and Problem Statement

ADR-002 proposed a unified plan lifecycle with 6 states (`drafting → pending_approval → approved → in_progress → completed/failed`) and 4 tools for agent communication. During implementation, we discovered that conflating "what to do" (plan definition) with "how it went" (execution state) created semantic confusion and prevented plan reuse after failures.

Additionally, the original tool naming (`orca_ask_planner`, `orca_ask_specialist`) didn't align well with the emerging service architecture and mixed concerns between routing, questioning, and task execution.

## Decision Drivers

* Plans should be reusable — a failed execution shouldn't contaminate the plan definition
* Invalid states should be unrepresentable — e.g., a `drafting` plan shouldn't have task results
* Tool names should align with service-layer concepts
* Execution orchestration should be service-controlled, not LLM-emitted
* Clear distinction between "emit" (agent calls tool) and "invoke" (plugin calls service)

## Considered Options

* **Unified plan entity** — Single file with 6+ states tracking both definition and runtime
* **Plan/Execution separation** — Static plans + dynamic execution records
* **Event-sourced execution** — Append-only log of execution events

## Decision Outcome

Chosen option: **Plan/Execution separation**, because it cleanly separates immutable definitions from mutable runtime state, enables plan reuse, and makes invalid states unrepresentable through discriminated unions.

### Architecture Overview

```
                                    USER
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCA AGENT                                          │
│                                                                             │
│  Tools (emits):                                                             │
│  - orca_invoke        → Send user message to planner                        │
│  - orca_plans_list    → List existing plans                                 │
│  - orca_plans_get     → Get plan details                                    │
│                                                                             │
│  Responsibilities:                                                          │
│  - Route ALL user messages to planner via orca_invoke                       │
│  - Help user find/resume existing plans                                     │
│  - Report results back to user                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLANNER                                        │
│                                                                             │
│  Tools (emits):                                                             │
│  - orca_ask_agent     → Read-only question to specialist                    │
│  - orca_ask_user      → HITL question to user                               │
│  - orca_plans_list    → List existing plans                                 │
│  - orca_plans_get     → Get plan details                                    │
│                                                                             │
│  Structured Output:                                                         │
│  - Plan               → Validated and persisted by plugin                   │
│                                                                             │
│  Responsibilities:                                                          │
│  - Research via orca_ask_agent                                              │
│  - Clarify requirements via orca_ask_user                                   │
│  - Produce structured plans                                                 │
│  - Revise plans when execution fails                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLUGIN SERVICE LAYER                                     │
│                                                                             │
│  PlanningService:                                                           │
│  - createProposal()   → Persist new plan                                    │
│  - approve()          → Transition plan to approved                         │
│  - reject()           → Transition plan to rejected                         │
│  - listPlans()        → Return plan summaries                               │
│  - getPlan()          → Return full plan                                    │
│                                                                             │
│  ExecutionService:                                                          │
│  - create()           → Create execution for approved plan                  │
│  - start()            → Begin execution                                     │
│  - claimNextTask()    → Get next pending/failed task                        │
│  - completeTask()     → Mark task completed with output                     │
│  - failTask()         → Mark task failed with error                         │
│  - complete()         → Mark execution completed                            │
│  - fail()             → Mark execution failed                               │
│  - stop()             → Mark execution stopped by user                      │
│                                                                             │
│  DispatchService:                                                           │
│  - dispatch(Task)     → Send task to specialist                             │
│  - dispatch(AgentQuestion) → Send question to specialist                    │
│                                                                             │
│  HITLService:                                                               │
│  - askUser()          → Present question to user, await response            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPECIALISTS                                       │
│                                                                             │
│  Tools (emits):                                                             │
│  - orca_ask_agent     → Read-only question to another specialist            │
│  - orca_ask_user      → HITL question to user                               │
│  - orca_plans_get     → Get plan details for context                        │
│                                                                             │
│  Structured Output:                                                         │
│  - TaskResult         → Success/Failure/Interruption                        │
│                                                                             │
│  Agents: coder, tester, reviewer, researcher, document-writer, architect    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tool Definitions

| Tool | Who Emits | Service Layer | Purpose |
|------|-----------|---------------|---------|
| `orca_invoke` | Orca | `DispatchService` → Planner | Send user message to planner |
| `orca_ask_user` | Planner, Specialists | `HITLService.askUser()` | HITL question to user |
| `orca_ask_agent` | Planner, Specialists | `DispatchService.dispatch(AgentQuestion)` | Read-only question to agent |
| `orca_plans_list` | Orca, Planner | `PlanningService.listPlans()` | List existing plans |
| `orca_plans_get` | Orca, Planner, Specialists | `PlanningService.getPlan()` | Get plan details |

**Note**: There is no `orca_exec_*` tool. Execution is entirely service-layer orchestrated:
1. Planner emits a Plan (structured output)
2. Plugin persists via `PlanningService.createProposal()`
3. Plugin triggers approval via `HITLService.askUser()`
4. On approval, plugin calls `ExecutionService.create()` and `start()`
5. Plugin loops: `claimNextTask()` → `DispatchService.dispatch(Task)` → `completeTask()`/`failTask()`

### State Machines

**Plan Lifecycle** (3 states):
```
proposal ──┬──► approved
           │
           └──► rejected
```

**Execution Lifecycle** (5 states):
```
pending ──► running ──┬──► completed
                      │
                      ├──► failed
                      │
                      └──► stopped
```

**Task Lifecycle** (4 states):
```
pending ──► running ──┬──► completed
    ▲                 │
    │                 ▼
    └─────────── failed (retry)
```

### Storage Structure

```
.orca/
└── plans/
    └── {plan_id}.json           # Plan definition (immutable after approval)
    └── {plan_id}/
        └── executions/
            └── {exec_id}.json   # Execution state (mutable during execution)
```

### Consequences

* Good, because plans can have multiple executions (retry entire plan without replanning)
* Good, because task-level granularity enables partial completion and targeted retry
* Good, because discriminated unions make invalid states unrepresentable
* Good, because tool names align with service concepts
* Good, because execution orchestration is deterministic (service-controlled, not LLM-emitted)
* Neutral, because more complex storage structure (plan + execution files)
* Bad, because requires joining plan + execution for full view

### Confirmation

Implementation status:

| Component | Status |
|-----------|--------|
| `PlanningService` | ✅ Complete |
| `ExecutionService` | ✅ Complete |
| `DispatchService` | 🚧 Parsing placeholder |
| `HITLService` | ✅ Complete |
| `orca_invoke` tool | ❌ Not implemented |
| `orca_ask_user` tool | ❌ Not implemented |
| `orca_ask_agent` tool | ❌ Not implemented |
| `orca_plans_list` tool | ❌ Not implemented |
| `orca_plans_get` tool | ❌ Not implemented |
| Orchestration loop | ❌ Not implemented |

## Pros and Cons of the Options

### Unified plan entity

Single file tracking both definition and runtime state.

* Good, because simpler storage (one file per plan)
* Bad, because conflates "what to do" with "how it went"
* Bad, because failed execution contaminates plan definition
* Bad, because 6+ states create complex state machine
* Bad, because can't retry plan without replanning

### Plan/Execution separation

Static plans + dynamic execution records.

* Good, because plan is immutable after approval
* Good, because execution state is isolated
* Good, because one plan can have multiple executions
* Good, because simpler state machines (3 + 5 states vs 6+ combined)
* Neutral, because requires two files for full picture
* Bad, because more storage management

### Event-sourced execution

Append-only log of execution events.

* Good, because full history preserved
* Good, because enables replay/debugging
* Bad, because complex to query current state
* Bad, because overkill for current requirements
* Bad, because storage grows unbounded

## More Information

### Dispatch Types

The `DispatchService` handles three dispatch types:

```typescript
type Task = {
  type: 'task'
  agent: AgentId
  description: string
  command?: string
}

type AgentQuestion = {
  type: 'agent_question'
  agent: AgentId
  question: string
  session_id?: string  // Continue existing conversation
}

type UserQuestion = {
  type: 'user_question'
  questions: HITLQuestion[]
}
```

`UserQuestion` is routed to `HITLService`, not `DispatchService`.

### Context Threading

Each task receives a `TaskContext` with:
- Plan reference (`plan_id`, `plan_goal`, `step_index`, `total_steps`)
- Previous task summaries (not full outputs — keeps context lean)
- Accumulated `relevant_files`
- `previous_attempts` for retry scenarios (includes error + user guidance)

Specialists can emit `orca_plans_get` to fetch full plan details if needed.

### Terminology

- **Emit**: Agent calls a tool (e.g., planner emits `orca_ask_agent`)
- **Invoke**: Plugin calls a service method (e.g., plugin invokes `ExecutionService.claimNextTask()`)
- **Dispatch**: Send a message to an agent and parse the response

### Related ADRs

- [ADR-001](./001-rejection-of-autonomy-levels.md): Rejected autonomy levels for per-agent supervision (superseded by ADR-002)
- [ADR-002](./002-multi-agent-dispatch-architecture.md): Original multi-tool proposal (partially implemented, refined by this ADR)
