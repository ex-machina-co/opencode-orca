# Architecture

This document describes the system design and architecture decisions behind opencode-orca.

## High-Level Architecture

```
                                    USER
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                         ORCA (Thin Orchestrator)                            |
|                                                                             |
|  Tools (ONLY these - no file access, no bash):                              |
|  - orca_ask_planner: Route messages to planner                              |
|  - orca_list_plans: List existing plans                                     |
|  - orca_describe_plan: Get plan details                                     |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                              PLANNER                                        |
|                                                                             |
|  Tools: orca_ask_specialist (read-only questions)                           |
|                                                                             |
|  Outputs: answer | question | plan                                          |
|  - answer: Direct response (no execution needed)                            |
|  - question: Needs user clarification (triggers HITL)                       |
|  - plan: Structured execution plan (triggers approval HITL)                 |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                        EXECUTION LOOP (Plugin Internal)                     |
|                                                                             |
|  Triggered by: Plan approval via HITL                                       |
|  For each step: Build context -> Dispatch to specialist -> Record output    |
|  On failure: HITL with Retry / Replan / Stop options                        |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                           SPECIALISTS                                       |
|                                                                             |
|  +--------+ +--------+ +--------+ +----------+ +------------+ +----------+  |
|  | coder  | | tester | |reviewer| |researcher| |doc-writer  | |architect |  |
|  +--------+ +--------+ +--------+ +----------+ +------------+ +----------+  |
|                                                                             |
|  All specialists:                                                           |
|  - Receive tasks from execution loop (not from Orca directly)               |
|  - Can use orca_ask_specialist for read-only questions                      |
|  - Can use orca_describe_plan to self-serve plan context                    |
+-----------------------------------------------------------------------------+
```

## Agent Classes

Agents are organized into three classes based on their role and available tools.

### Orchestrator (Orca)

A thin orchestrator that routes all user messages to the planner. Orca is intentionally limited - it cannot read files, run commands, or dispatch directly to specialists.

**Tools available:**

| Tool                 | Purpose                           |
|----------------------|-----------------------------------|
| `orca_ask_planner`   | Route user messages to planner    |
| `orca_list_plans`    | List existing plans with status   |
| `orca_describe_plan` | Get details about a specific plan |

**Key behavior**: Orca is a "simple relay". It forwards everything to the planner and reports results back to the user. All decisions (plan approval, deviation handling) happen via HITL inside the plugin, not through Orca.

### Planner

Researches, plans, and answers questions. The planner is the brain of the system - it decides whether to answer directly, ask clarifying questions, or produce an execution plan.

**Tools available:**

| Tool                  | Purpose                                 |
|-----------------------|-----------------------------------------|
| `orca_ask_specialist` | Ask read-only questions to other agents |
| `orca_list_plans`     | List existing plans                     |
| `orca_describe_plan`  | Get plan details for context            |

**Outputs:**

| Type       | When Used                                   | What Happens Next                |
|------------|---------------------------------------------|----------------------------------|
| `answer`   | Simple questions, no execution needed       | Returned to user via Orca        |
| `question` | Needs user clarification before planning    | Triggers HITL, answers sent back |
| `plan`     | Complex work requiring multi-step execution | Triggers approval HITL           |

**Key behavior**: Planners research (via `orca_ask_specialist`), plan, and answer. They never execute work directly. When they produce a plan, the plugin handles approval and execution internally.

### Specialists

Execute specific types of work. Specialists receive tasks from the plugin's internal execution loop (not from Orca directly).

| Agent           | Purpose                                     | Accepts    |
|-----------------|---------------------------------------------|------------|
| coder           | Implements code changes, features, fixes    | `task`     |
| tester          | Writes and runs tests                       | `task`     |
| reviewer        | Reviews code for issues and improvements    | `task`     |
| researcher      | Investigates codebases, APIs, documentation | `question` |
| document-writer | Creates technical documentation             | `task`     |
| architect       | Advises on system design decisions          | `question` |

**Tools available to all specialists:**

| Tool                  | Purpose                                      |
|-----------------------|----------------------------------------------|
| `orca_ask_specialist` | Ask read-only questions to other agents      |
| `orca_describe_plan`  | Get full plan details for additional context |

**Key behavior**: Specialists execute their assigned step and return `success` or `failure`. They can ask questions to other agents (e.g., coder asks researcher about an API) via `orca_ask_specialist`, which creates a read-only session.

### Communication Flow

```
                         User
                           │
                           ▼
                    ┌─────────────┐
                    │    Orca     │  ← Only routes to planner
                    └──────┬──────┘
                           │ orca_ask_planner
                           ▼
                    ┌─────────────┐
                    │   Planner   │  ← Researches, plans, answers
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          answer       question       plan
              │            │            │
              │            │            ▼
              │            │     ┌────────────┐
              │            │     │ Approval   │  ← HITL
              │            │     │   HITL     │
              │            │     └──────┬─────┘
              │            │            │
              │            ▼            ▼
              │     ┌────────────┐  ┌──────────────┐
              │     │ User HITL  │  │  Execution   │  ← Plugin internal
              │     │  answers   │  │    Loop      │
              │     └──────┬─────┘  └───────┬──────┘
              │            │                │
              │            ▼                ▼
              │      back to planner   Specialists
              │                             │
              └─────────────────────────────┘
                           │
                           ▼
                      Back to User
```

## Tools

Four tools provide the dispatch capabilities for inter-agent communication.

### `orca_ask_planner`

**Purpose**: Route user messages to the planner. This is Orca's primary tool.

**Who can use it**: Orca only

**Input**:

```typescript
{
  message: string        // User's message/request
  plan_id?: string       // Continue working on existing plan
}
```

**Output**: One of:
- `answer` - Planner responded directly (includes `plan_id` for continuation)
- `completed` - Plan executed successfully (includes step results)
- `stopped` - User stopped execution via HITL
- `rejected` - User rejected the plan via HITL
- `failure` - Something went wrong

**Key behavior**: All HITL (planner questions, plan approval, deviation handling) happens internally. Orca just receives the final result.

### `orca_list_plans`

**Purpose**: Discover existing plans for resume/status checks.

**Who can use it**: Everyone (Orca, Planner, Specialists)

**Input**: None

**Output**: Array of plan summaries with `plan_id`, `goal`, `status`, `step_progress`

### `orca_describe_plan`

**Purpose**: Get full details about a specific plan.

**Who can use it**: Everyone (Orca, Planner, Specialists)

**Input**: `{ plan_id: string }`

**Output**: Full plan details including steps, assumptions, risks, verification criteria, and execution state.

**Key behavior**: Enables agents to self-serve context. A specialist executing step 3 can look up the plan's assumptions if needed.

### `orca_ask_specialist`

**Purpose**: Ask read-only questions to non-supervised agents. Supports multi-turn conversations.

**Who can use it**: Planner and Specialists (NOT Orca)

**Input**:
```typescript
{
  agent_id: string       // Target agent
  session_id?: string    // Continue existing conversation
  question: string       // The question to ask
}
```

**Output**: Answer content with `session_id` for potential continuation.

**Key behavior**: Creates a read-only session - the target agent cannot write files or execute dangerous commands. This allows safe research mid-task.

## Plan Lifecycle

Every interaction creates or continues a plan. Plans are persisted to `.opencode/plans/{plan_id}.json`.

### Plan States

```
drafting → pending_approval → approved → in_progress → completed
                ↓                              ↓
         changes_requested                  failed
                ↓
           (back to drafting)

pending_approval → rejected (terminal)
```

| State             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `drafting`          | Planner is working, may ask clarifying questions |
| `pending_approval`  | Plan ready, waiting for user approval via HITL   |
| `changes_requested` | User requested changes, back to planner          |
| `approved`          | User approved, ready for execution               |
| `in_progress`       | Execution loop is running steps                  |
| `completed`         | All steps finished successfully                  |
| `failed`            | A step failed and user chose to stop             |
| `rejected`          | User rejected the plan entirely                  |

### Draft Plans

Even before a plan is fully formed, a **draft plan** is created to serve as the continuity token. This means:
- User asks "Refactor the auth system"
- Planner creates draft plan, needs clarification
- Planner asks "OAuth or session-based?" via HITL
- User answers, planner continues with same plan context
- Eventually plan is finalized and goes through approval

Draft plans are lightweight and can be pruned if never finalized.

## Context Threading

Step outputs flow to subsequent steps, eliminating redundant research.

### What Flows Forward

| Field        | Description                                |
| ------------ | ------------------------------------------ |
| `summary`      | Brief summary of what was accomplished     |
| `artifacts`    | Files created/modified                     |
| `key_findings` | Important discoveries (for research steps) |

### Step Prompt Structure

Each specialist receives:
1. **Plan reference** - `plan_id` and `goal` (can fetch more via `orca_describe_plan`)
2. **Step description** - What this step should accomplish
3. **Previous step summaries** - What prior steps accomplished
4. **Relevant files** - Accumulated from plan + previous step artifacts

This keeps prompts lean while providing necessary context. Agents can self-serve additional detail via `orca_describe_plan`.

## Message Protocol

All inter-agent communication uses typed messages validated by Zod schemas.

### Planner Response Types

| Type     | Purpose                     | Triggers                   |
| -------- | --------------------------- | -------------------------- |
| `answer`   | Direct information response | Return to Orca             |
| `question` | Needs user clarification    | HITL, then back to planner |
| `plan`     | Structured execution plan   | Approval HITL              |

### Specialist Response Types

| Type    | Purpose                     |
| ------- | --------------------------- |
| `success` | Work completed successfully |
| `failure` | Error during execution      |

### HITL Question Schema

All HITL questions use a consistent schema:

```typescript
{
  header: string           // Tab label (max 30 chars)
  question: string         // Full question text
  options: Array<{
    label: string
    description?: string
  }>
  multiple?: boolean       // Allow multiple selections
  custom?: boolean         // Allow freeform input
}
```

The **emitter** (agent or plugin) is responsible for providing all fields. The HITL system passes through without transformation.

## Design Decisions

### 1. Orca is a Dumb Pipe

Orca has only 3 tools and cannot read files or run commands. This keeps it focused on routing and prevents it from making execution decisions.

### 2. Everything is a Plan

Every planner interaction creates or continues a plan. Even simple Q&A gets a `plan_id` for potential continuation. This provides a consistent continuity model.

### 3. All HITL is Internal to Plugin

Plan approval, deviation handling, and planner questions all use `question.ask()` inside the plugin. LLMs cannot be trusted as gates - deterministic plugin logic handles all decisions.

### 4. Two-Question HITL Pattern

For plugin-controlled decisions (approval, deviations), we use two questions:
1. **Action** (`custom: false`) - Deterministic choice from predefined options
2. **Context** (`custom: true`) - Optional freeform guidance

This keeps logic deterministic while allowing user flexibility.

### 5. Emitter Owns the Format

Any agent or plugin emitting HITL questions provides all display details (header, question, options). The HITL system is a pass-through.

### 6. Execution is Plugin-Internal

When a user approves a plan via HITL, the plugin executes it internally. Orca just receives the final result. This prevents Orca from needing to manage execution state.

### 7. Context Threading Over Session History

Rather than relying on session history, we explicitly thread step outputs (summaries, artifacts, key findings) to subsequent steps. This keeps context lean and relevant.

### 8. Session-Level Permissions

`orca_ask_specialist` creates read-only sessions. The target agent cannot write files - bash defaults to `ask`, writes are denied. This enables safe mid-task research.

### 9. Plans are the Continuity Artifact

Plans (not sessions) are the primary continuity mechanism. The `plan_id` allows resuming work across sessions. Planner session IDs are stored in the plan file for context continuity on revisions.

### 10. Retry Count Limits

Failed steps can be retried up to 10 times. After that, the Retry option is removed - user must Replan or Stop. This prevents infinite loops.
