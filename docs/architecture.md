# Architecture

This document describes the system design and architecture decisions behind opencode-orca.

## High-Level Architecture

```
                              +-------------------+
                              |    User Input     |
                              +--------+----------+
                                       |
                                       v
                    +------------------+------------------+
                    |           Orca (Orchestrator)       |
                    |           mode: 'primary'           |
                    +------------------+------------------+
                                       |
            +-----------+-+------------+---------+-+--------------+
            |           | |            |         | |              |
            v           v |            v         | v              v
     +------+----+ +----+-----+ +-----+----+ +------+-----+ +-----+------+
     |  Planner  | |  Coder   | |  Tester  | | Researcher | |  Reviewer  |
     |  (plans)  | | (code)   | | (tests)  | |  (search)  | | (quality)  |
     +-----------+ +----------+ +----------+ +------------+ +------------+
                          |                      |
                          v                      v
                   +------+------+        +------+-------+
                   | Doc Writer  |        |  Architect   |
                   |   (docs)    |        |  (design)    |
                   +-------------+        +--------------+
```

## Agent Classes

Agents are organized into three classes based on their role in the communication flow.

### Orchestrator (Orca)

The primary agent that receives all user messages and coordinates work.

| Sends                   | Receives                                        |
|-------------------------|-------------------------------------------------|
| `question` (to Planner) | `plan`, `answer`                                |
| `task` (to Specialists) | `success`, `failure`, `checkpoint`, `interrupt` |

**Key behavior**: Orca sends different message types to different agent classes:
- To Planner: `question` ("How should we do X?")
- To Specialists: `task` ("Do X")

### Planner

Plans complex multi-step tasks. Outputs structured plans with goals, steps, assumptions, and risks.

| Receives   | Responds with               |
|------------|-----------------------------|
| `question` | `plan`, `answer`, `failure` |

**Key behavior**: Planners plan, they don't execute or dispatch. They receive questions from Orca and respond with plans or answers.

### Specialists

Execute specific types of work. Each specialist has a focused domain and declares which message types it `accepts`:

| Agent           | Purpose                                     | Accepts                |
|-----------------|---------------------------------------------|------------------------|
| coder           | Implements code changes, features, fixes    | `['task']`             |
| tester          | Writes and runs tests                       | `['task', 'question']` |
| reviewer        | Reviews code for issues and improvements    | `['task', 'question']` |
| researcher      | Investigates codebases, APIs, documentation | `['question']`         |
| document-writer | Creates technical documentation             | `['task']`             |
| architect       | Advises on system design decisions          | `['question']`         |

Response types are derived from what the agent accepts:
- `accepts: ['task']` → responds with `success`, `failure`, `checkpoint`, `interrupt`
- `accepts: ['question']` → responds with `answer`, `failure`, `interrupt`
- `accepts: ['task', 'question']` → can respond with any of the above

**Key behavior**: Specialists respond with `success` for completed work or `answer` for information requests. Any specialist can emit `interrupt` to halt execution.

### Communication Flow

```
                    User
                      │
                      ▼
              ┌──────────────┐
              │     Orca     │
              └──────┬───────┘
         question    │    task
              ┌──────┴──────┐
              ▼             ▼
        ┌─────────┐   ┌───────────┐
        │ Planner │   │Specialists│
        └────┬────┘   └─────┬─────┘
             │              │
        plan/answer    success/failure
                       checkpoint
                       interrupt
```

### Checkpoint Capability

**Checkpoints are about RISK, not work type.** Any agent performing operations with risk (not just write operations) can emit checkpoints:

- Writing/modifying files
- Executing shell commands
- Sending data to external services (even read-only, e.g., PII exposure risk)
- Making irreversible changes

Supervised agents require explicit user approval before proceeding past checkpoints.

## Message Protocol

All inter-agent communication uses typed messages validated by Zod discriminated unions. Messages use a **flattened structure** where fields go directly on the message with a `type` discriminant (no `payload` wrapper).

### Message Types

**Request types** (sent to agents via `DispatchPayload`):

| Type       | Sender | Recipient            | Purpose                   |
|------------|--------|----------------------|---------------------------|
| `question` | Orca   | Planner, Specialists | Request information       |
| `task`     | Orca   | Specialists          | Assign work for execution |

**Response types** (returned by agents in `DispatchResponse`):

| Type         | Sender      | Recipient | Purpose                         |
|--------------|-------------|-----------|---------------------------------|
| `answer`     | Planner     | Orca      | Information response            |
| `plan`       | Planner     | Orca      | Execution plan proposal         |
| `success`    | Specialists | Caller    | Work completed successfully     |
| `failure`    | Specialists | Caller    | Reports error with task         |
| `checkpoint` | Specialists | Caller    | Requires user approval          |
| `interrupt`  | Specialists | Caller    | Halt execution, needs attention |

### Two Communication Patterns

The protocol distinguishes between **information retrieval** and **work execution**:

```
Question/Answer (information):
  Orca/Planner --question--> Agent --answer--> Caller

Task/Success (execution):
  Orca --task--> Specialist --success/failure--> Orca
```

This separation ensures:
- Planners never execute work (they ask questions, they don't dispatch tasks)
- The response type reflects what was requested (information vs. completion)
- Clear semantics for each message type

### Dispatch Envelope

Inter-agent communication uses an envelope structure. The `agent_id` and `session_id` live on the envelope, NOT on individual messages:

```typescript
// What is sent to agents
type DispatchPayload = {
  agent_id: string,        // Target agent
  session_id?: string,     // For resuming conversations
  message: Message         // The actual message (task, question, etc.)
}

// What is returned by agents  
type DispatchResponse = {
  session_id?: string,     // For continuing conversation
  message: Message         // The actual message (answer, plan, etc.)
}
```

## Session Continuity

Sessions maintain context across agent handoffs via the dispatch envelope:

- **session_id**: On `DispatchPayload`/`DispatchResponse`, identifies the conversation
- **plan_context**: Tracks plan execution state (goal, step_index, approved_remaining)

```
User Request -> Orca creates session -> Dispatches with session_id
             -> Agent responds with same session_id -> Orca continues
```

## State Machine

```
          +--------+                    +------------+
          |  IDLE  |  <-- checkpoint    | EXECUTING  |
          |        |      approval -->  |            |
          +---+----+                    +-----+------+
              |                               |
              | user message                  | task/question dispatch
              v                               v
         [Route to Orca]              [Agent processing]
```

- **IDLE**: Waiting for user input or checkpoint approval
- **EXECUTING**: Processing request through agent pipeline
- Checkpoint pauses execution until user approves
- Completion returns to IDLE state

## Design Decisions

### Zod Discriminated Unions for Validation

Type-safe message handling with runtime validation:
- Compile-time type inference from schemas
- Runtime validation catches malformed messages early
- Single source of truth for message structure
- Discriminant field enables exhaustive switch handling

### Question/Answer vs Task/Success

Two distinct communication patterns serve different purposes:

| Pattern     | Request    | Response            | Purpose            |
|-------------|------------|---------------------|--------------------|
| Information | `question` | `answer`            | Research, analysis |
| Execution   | `task`     | `success`/`failure` | Work completion    |

This ensures semantic clarity: questions get answers, tasks get results.

### Checkpoint Protocol for Supervision

Human-in-the-loop safety for risky operations:
- Any agent can emit checkpoints (not just execution agents)
- Risk includes read operations (e.g., PII exposure to untrusted services)
- Users can approve individual steps or "approve all remaining"
- Checkpoints pause execution until explicit approval

### Session-Based Context Passing

Maintains conversation state across agent handoffs:
- Agents see relevant history from parent session
- Parent-child linking preserves execution trace
- Enables coherent multi-step task completion

### Response Validation with Retry

Ensures agents respond in correct format:
- Validates all agent responses against expected schemas
- On validation failure, re-prompts agent with correction guidance
- Configurable retry count prevents infinite loops
