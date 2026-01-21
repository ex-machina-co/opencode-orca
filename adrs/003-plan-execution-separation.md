---
status: accepted
date: 2026-01-20
decision-makers: julian
modified-by: 004-builder-pattern-for-plans
---

# Plan/Execution Separation with Service-Layer Orchestration

## Status History

| status                                                               | date       | decision-makers | github                                     |
|----------------------------------------------------------------------|------------|-----------------|--------------------------------------------|
| proposed                                                             | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |
| accepted                                                             | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |
| modified by [ADR-004](./004-builder-pattern-for-plans.md)            | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |

## Related ADRs

- [ADR-002](./002-multi-agent-dispatch-architecture.md): Multi-tool dispatch (refined by this ADR)
- [ADR-004](./004-builder-pattern-for-plans.md): Builder pattern for plans (modifies this ADR)

## Context and Problem Statement

Following the guidance of [ADR-002](./002-multi-agent-dispatch-architecture.md) we designed a plan lifecycle with 6+ states tracking both definition and runtime. During implementation, we discovered that conflating "what to do" (plan definition) with "how it went" (execution state) created semantic confusion and prevented plan reuse after failures.

## Decision Drivers

* Plans should be reusable — a failed execution shouldn't contaminate the plan definition
* Invalid states should be unrepresentable — e.g., a plan in "drafting" shouldn't have task results
* Execution orchestration should be service-controlled, not LLM-emitted
* Clear distinction between agent-initiated actions and plugin-initiated actions

## Considered Options

* **Unified plan entity** — Single record with 6+ states tracking both definition and runtime
* **Plan/Execution separation** — Static plans + dynamic execution records
* **Event-sourced execution** — Append-only log of execution events

## Decision Outcome

Chosen option: **Plan/Execution separation**, because it cleanly separates immutable definitions from mutable runtime state, enables plan reuse, and makes invalid states unrepresentable through discriminated unions.

### Core Principles

1. **Plans and executions are separate concerns.** A plan defines "what to do." An execution tracks "how it went." These are distinct persistence entities.

2. **Plans are immutable after approval.** Once approved, the plan definition doesn't change. Failed executions don't contaminate the plan.

3. **One plan can have multiple executions.** If an execution fails, you can retry the same plan without replanning.

4. **The entry agent is a relay.** It forwards messages to the orchestration system. It doesn't decide what to do or route between capabilities — it just passes messages through.

5. **Execution is service-layer orchestrated, not LLM-driven.** The plugin controls execution flow: claiming tasks, dispatching to specialists, recording results. The LLM doesn't emit execution commands.

6. **Make invalid states unrepresentable.** Use discriminated unions so that, for example, a "drafting" plan cannot have execution results attached.

### State Machines

> [!NOTE]
> The plan lifecycle below was extended by [ADR-004](./004-builder-pattern-for-plans.md) to include a `draft` state before `proposal`, enabling incremental plan construction.

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

Minimal states for each concern. The plan state machine is simple (3 states). Execution complexity is isolated in its own state machine (5 states). Task-level granularity enables partial completion and targeted retry.

### Consequences

* Good, because plans can have multiple executions (retry entire plan without replanning)
* Good, because task-level granularity enables partial completion and targeted retry
* Good, because discriminated unions make invalid states unrepresentable
* Good, because the entry agent's single responsibility removes routing decisions from the LLM
* Good, because execution orchestration is deterministic (service-controlled)
* Good, because routing logic lives in the service layer where it can evolve without changing agent capabilities
* Neutral, because more complex storage structure (plan + execution records)
* Bad, because requires joining plan + execution for full view

## Pros and Cons of the Options

### Unified plan entity

Single record tracking both definition and runtime state.

* Good, because simpler storage (one record per plan)
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
* Neutral, because requires two records for full picture
* Bad, because more storage management

### Event-sourced execution

Append-only log of execution events.

* Good, because full history preserved
* Good, because enables replay/debugging
* Bad, because complex to query current state
* Bad, because overkill for current requirements
* Bad, because storage grows unbounded

## More Information

### Relay Pattern

The entry agent has one job: forward messages to the orchestration system. This relay design:

1. **Removes routing decisions from the LLM** — The entry agent doesn't decide "should I list plans or invoke the planner?" It just forwards everything.

2. **Centralizes routing in the service layer** — The service layer routes to the planner, which has the context to handle any query type.

3. **Enables future flexibility** — The service layer can add fast-paths without changing the entry agent's capabilities.

**Trade-off**: All queries route through the planner, adding latency for simple requests. This is acceptable because consistency matters more than microseconds, and the planner can answer simple queries without producing a plan.

### Context Threading

Each task receives:
- Plan reference (ID, goal, step position)
- Previous task summaries (not full outputs — keeps context lean)
- Accumulated relevant files
- Previous attempts for retry scenarios (includes error + user guidance)
