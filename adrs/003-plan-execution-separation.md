---
status: proposed
date: 2026-01-20
decision-makers: julian
---

# Plan/Execution Separation with Service-Layer Orchestration

## Status History

| status   | date       | decision-makers | github                                     |
|----------|------------|-----------------|--------------------------------------------|
| proposed | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |
| accepted | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |

## Context and Problem Statement

[ADR-002](./002-multi-agent-dispatch-architecture.md) proposed a unified plan lifecycle with 6 states (`drafting → pending_approval → approved → in_progress → completed/failed`) and 4 tools for agent communication. During implementation, we discovered that conflating "what to do" (plan definition) with "how it went" (execution state) created semantic confusion and prevented plan reuse after failures.

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
│                         ORCA AGENT (Relay)                                  │
│                                                                             │
│  Tools (emits):                                                             │
│  - orca_invoke        → Send message to orchestration system                │
│                                                                             │
│  Responsibilities:                                                          │
│  - Forward ALL user messages via orca_invoke                                │
│  - Report results back to user                                              │
│  - Nothing else — Orca has no domain knowledge                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLUGIN SERVICE LAYER (Router)                            │
│                                                                             │
│  OrcaService.invoke():                                                      │
│  - Routes ALL messages to Planner (single entry point)                      │
│  - Planner has context to handle any query type                             │
│  - Future: could add fast-paths for simple queries                          │
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
│  - Answer simple queries directly (e.g., "list my plans")                   │
│  - Research via orca_ask_agent                                              │
│  - Clarify requirements via orca_ask_user                                   │
│  - Produce structured plans for complex work                                │
│  - Revise plans when execution fails                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLUGIN SERVICE LAYER (Orchestration)                     │
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
│  - dispatchTask()     → Send task to specialist                             │
│  - dispatchQuestion() → Send question to specialist                         │
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

| Tool             | Who Emits            | Handler                                   | Purpose                        |
| ---------------- | -------------------- | ----------------------------------------- | ------------------------------ |
| `orca_invoke`    | Orca                 | `OrcaService.invoke()`                    | Send message to orchestration  |
| `orca_ask_user`  | Planner, Specialists | `HITLService.askUser()`                   | HITL question to user          |
| `orca_ask_agent` | Planner, Specialists | `DispatchService.dispatchQuestion()`      | Read-only question to agent    |
| `orca_plans_list`| Planner              | `PlanningService.listPlans()`             | List existing plans            |
| `orca_plans_get` | Planner, Specialists | `PlanningService.getPlan()`               | Get plan details               |

**Key design decision**: Orca is a relay agent with only `orca_invoke`. The service layer routes to the planner, and the planner handles all query types (including "list my plans", "show plan X", etc.) because it has the tools and context to do so.

**Note**: There is no `orca_exec_*` tool. Execution is entirely service-layer orchestrated:
1. Planner emits a Plan (structured output)
2. Plugin persists via `PlanningService.createProposal()`
3. Plugin triggers approval via `HITLService.askUser()`
4. On approval, plugin calls `ExecutionService.create()` and `start()`
5. Plugin loops: `claimNextTask()` → `DispatchService.dispatchTask()` → `completeTask()`/`failTask()`

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
* Good, because Orca's single tool removes "which tool?" decisions from the LLM
* Good, because execution orchestration is deterministic (service-controlled, not LLM-emitted)
* Good, because routing logic lives in the service layer where it can evolve without changing tools
* Neutral, because more complex storage structure (plan + execution files)
* Neutral, because planner handles all query types (centralizes responsibility but planner has the context)
* Bad, because requires joining plan + execution for full view

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

### Why Orca is a Relay Agent

The simplest possible Orca agent has one tool: `orca_invoke`. This relay design:

1. **Removes tool selection from the LLM** — Orca doesn't decide "should I list plans or invoke the planner?" It just forwards everything.

2. **Centralizes routing in the service layer** — `OrcaService.invoke()` routes to the planner, which has the context and tools to handle any query type.

3. **Makes the planner the intent router** — The planner can answer "list my plans" directly (via `orca_plans_list`), or decide a request needs a full plan. This is appropriate because the planner already has LLM reasoning to understand intent.

4. **Enables future flexibility** — The service layer could add fast-paths (e.g., pattern matching for "resume execution X") without changing Orca's tool surface.

**Trade-off**: All queries route through the planner, which adds latency for simple requests. This is acceptable because:
- Consistency matters more than microseconds
- If the orchestration system is degraded, partial functionality is misleading
- The planner can answer simple queries without producing a plan

### Terminology

- **Emit**: Agent calls a tool (e.g., planner emits `orca_ask_agent`)
- **Invoke**: Plugin calls a service method (e.g., plugin invokes `ExecutionService.claimNextTask()`)
- **Dispatch**: Send a message to an agent and parse the response

### Related ADRs

- [ADR-001](superseded/001-rejection-of-autonomy-levels.md): Rejected autonomy levels for per-agent supervision (superseded by ADR-002)
- [ADR-002](./002-multi-agent-dispatch-architecture.md): Original multi-tool proposal (partially implemented, refined by this ADR)
