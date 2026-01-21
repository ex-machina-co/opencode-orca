---
status: superseded
date: 2026-01-04
decision-makers: julian
superseded-by: 002-multi-agent-dispatch-architecture
---

# Per-Agent Supervision Instead of Autonomy Levels

## Status History

| status                                                                   | date       | decision-makers      | github                                     |
|--------------------------------------------------------------------------|------------|----------------------|--------------------------------------------|
| accepted                                                                 | 2026-01-04 | julian               | [@eXamadeus](https://github.com/eXamadeus) |
| superseded by [ADR-002](../002-multi-agent-dispatch-architecture.md)     | 2026-01-19 | julian               | [@eXamadeus](https://github.com/eXamadeus) |

## Related ADRs

- [ADR-002](../002-multi-agent-dispatch-architecture.md): Multi-agent dispatch (supersedes this ADR)

## Context and Problem Statement

The original design proposed three autonomy levels (supervised, assisted, autonomous) combined with action classification (routine, significant, dangerous) to create a 9-cell decision matrix for tool dispatch approval. During implementation, fundamental problems emerged that made this approach unworkable.

## Decision Drivers

* Action classification via pattern matching is unreliable — the same verb can be routine or dangerous depending on context
* The 3x3 matrix creates cognitive overhead and edge cases that produce wrong decisions
* Per-call approval creates fatigue — a multi-step plan would require many approval prompts
* The distinction between "assisted" and "autonomous" is unclear in practice

## Considered Options

* **Autonomy levels with action classification** — 3 levels x 3 classifications = 9 behaviors
* **Per-agent boolean supervision** — Simple supervised: true/false per agent

## Decision Outcome

Chosen option: **Per-agent boolean supervision**, because it eliminates classification ambiguity, reduces cognitive overhead, and moves approval to the plan level where it's more meaningful.

### Core Principles

1. **Supervision is per-agent, not per-action.** Each agent is either supervised or unsupervised. No action classification.

2. **Approval happens at plan level, not tool level.** Users approve entire plans before execution, not individual tool calls.

3. **Behavior is configuration-driven, not heuristic-driven.** Whether an agent requires supervision is explicit configuration, not inferred from action content.

4. **Binary choices are easier to reason about.** Supervised vs unsupervised is clearer than a 3x3 matrix.

### Consequences

* Good, because simpler mental model (boolean per agent)
* Good, because plan-level approval reduces fatigue
* Good, because deterministic behavior (no pattern-based classification)
* Good, because config-driven, not heuristic-driven
* Bad, because less granular control (can't approve "reads" but block "writes" for same agent)
* Bad, because requires trust calibration per agent rather than per action

### Confirmation

* PR #26 was closed (2026-01-04) — implementation fully rejected rather than refactored
* Issue #12 criteria replaced with simpler per-agent supervision model

## Pros and Cons of the Options

### Autonomy levels with action classification

* Good, because fine-grained control over individual actions
* Bad, because pattern-based classification is fundamentally unreliable
* Bad, because 9-cell matrix is hard to reason about
* Bad, because per-call approval trains users to click "yes" without reading

### Per-agent boolean supervision

* Good, because binary choice is easy to understand
* Good, because approval happens once per plan, not per tool call
* Good, because behavior is deterministic and predictable
* Neutral, because requires upfront decision about which agents need supervision
* Bad, because can't differentiate between read vs write operations for same agent

## More Information

True HITL (checkpoint UI) requires the ability for MCP servers to send prompts to the user and receive responses. Until then, stub the UI with auto-approve + logging.

*Source: [GitHub Issue #6 Comment](https://github.com/ex-machina-co/opencode-orca/issues/6#issuecomment-3706879816)*
