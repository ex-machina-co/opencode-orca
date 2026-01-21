---
status: accepted
date: 2026-01-20
decision-makers: julian
---

# Builder Pattern for Plan Creation

## Status History

| status   | date       | decision-makers | github                                     |
|----------|------------|-----------------|--------------------------------------------|
| proposed | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |
| accepted | 2026-01-20 | julian          | [@eXamadeus](https://github.com/eXamadeus) |

## Context and Problem Statement

[ADR-003](./superseded/003-plan-execution-separation.md) established plan/execution separation with the planner emitting complete `Plan` JSON objects as structured output. During implementation, we identified that requiring LLMs to produce complex, valid JSON structures in a single response creates unnecessary fragility and doesn't align with how planning naturally occurs (incrementally, with research informing each step).

## Decision Drivers

* LLMs are more reliable calling tools than producing complex nested JSON
* Planning is naturally incremental - steps emerge from research, not upfront
* Partial plan state should survive planner interruptions
* Validation errors should be caught early, not after entire plan is produced
* Tool-based interaction provides better observability (each step is visible)

## Considered Options

* **Single JSON output** - Planner produces complete Plan JSON (ADR-003 approach)
* **Builder pattern** - Planner uses tools to construct plans incrementally
* **Hybrid** - JSON for metadata, tools for steps only

## Decision Outcome

Chosen option: **Builder pattern**, because it aligns with natural planning workflows, improves reliability, and enables incremental validation.

### Core Principles

1. **Plans are built incrementally via tools, not emitted as structured output.** The planner calls tools to construct plans piece by piece rather than producing a complete JSON object.

2. **Draft state enables work-in-progress plans.** Plans start as drafts that can be modified until explicitly submitted for approval.

3. **Validation happens incrementally and on submission.** Each tool call validates its inputs; full plan validation occurs when transitioning from draft to proposal.

4. **The planner's final output references the plan, not its contents.** After building a plan via tools, the planner returns a simple reference (plan ID + status), not the full plan structure.

5. **Research can inform planning.** The incremental approach allows the planner to gather information (via agent questions) between adding steps.

### Plan Lifecycle

Plans now have a draft phase before proposal:

```
(start) --> draft --> proposal --+--> approved
                                 |
                                 +--> rejected
```

| State     | Description                     | Characteristics                                               |
| --------- | ------------------------------- | ------------------------------------------------------------- |
| `draft`   | Plan being built, incomplete    | Mutable; arrays may be empty; not yet validated for completeness |
| `proposal`| Complete plan awaiting approval | Immutable; fully validated; awaiting user decision            |
| `approved`| Ready for execution             | Immutable; can spawn executions                               |
| `rejected`| User rejected                   | Immutable; terminal state                                     |

### Builder Tool Categories

The planner needs tools for:

1. **Lifecycle management** - Create a new draft, submit draft as proposal
2. **Metadata** - Set/update plan metadata (assumptions, risks, verification criteria, affected files)
3. **Steps** - Add, update, remove execution steps
4. **Queries** - List plans, get plan details (read-only)

### Planner Output

The planner's structured response retains a `Plan` variant, but it's now a simple reference rather than the full plan content:

```
Answer | Plan | Failure | Interruption

Where Plan = { type: 'plan', plan_id: string, status: 'draft' | 'proposal' }
```

The plan content is built via tools and stored by the service layer. The planner's output simply references the plan by ID and indicates its current status. This keeps output validation simple while explicitly signaling "I created/modified a plan" vs "here's a direct answer."

The service layer uses the `plan_id` to look up full plan details and the `status` to determine next actions (e.g., trigger approval flow if `proposal`).

### Validation Requirements

When a draft is submitted as a proposal, it must be validated for completeness:

- Goal is defined
- At least one execution step exists
- Required metadata fields are populated (assumptions, risks, verification, files)
- All steps reference valid agent types

If validation fails, the plan remains in draft state with errors returned to the planner.

### Consequences

* Good, because LLMs are more reliable with tool calls than complex JSON output
* Good, because planning can be incremental (research -> add step -> research -> add step)
* Good, because partial drafts survive planner interruptions
* Good, because validation errors caught per-tool-call, not after entire plan
* Good, because each step is observable (tool calls are logged)
* Good, because orchestration layer is simpler (plan response is just a reference)
* Neutral, because more tools to implement
* Neutral, because more round-trips (each tool is a call)
* Bad, because planner prompt is more complex (must learn tool workflow)
* Bad, because draft state management adds complexity

## Pros and Cons of the Options

### Single JSON output (ADR-003)

Planner produces complete Plan JSON in structured output.

* Good, because atomic - plan is complete or it isn't
* Good, because simple mental model
* Bad, because LLMs can produce invalid JSON for complex structures
* Bad, because all-or-nothing validation (one field fails entire plan)
* Bad, because doesn't match natural planning workflow
* Bad, because no partial progress if planner interrupted

### Builder pattern

Planner uses tools to construct plans incrementally.

* Good, because aligns with how planning naturally works
* Good, because incremental validation catches errors early
* Good, because partial drafts can be resumed
* Good, because tool calls are observable/debuggable
* Neutral, because more tools to maintain
* Bad, because more latency (multiple round-trips)

### Hybrid (JSON metadata + tool steps)

Planner outputs metadata JSON, calls tools only for steps.

* Good, because reduces JSON complexity
* Bad, because still has JSON output fragility
* Bad, because inconsistent interaction model
* Bad, because unclear where to draw the line

## More Information

### Example Planning Workflow

```
User: "Add authentication to the API"

Planner workflow:
1. Create draft with goal
2. Research existing patterns (ask specialist)
3. Set metadata (assumptions, risks, verification, files)
4. Add step: implement middleware
5. Add step: integrate with routes  
6. Add step: write tests
7. Submit draft as proposal
8. Return answer summarizing the plan
```

The key insight is that steps 2-6 can be interleaved - the planner might research, add a step, research more, add another step, etc.

### Session Continuity

Same as ADR-003: the plan ID serves as the continuity token. Plans store a reference to their planner session for context threading when users continue conversations about existing plans.

### Related ADRs

- [ADR-002](./002-multi-agent-dispatch-architecture.md): Multi-tool dispatch architecture
- [ADR-003](./superseded/003-plan-execution-separation.md): Plan/execution separation (superseded by this ADR for plan creation method)
