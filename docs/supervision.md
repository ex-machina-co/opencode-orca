# Supervision

Supervision provides human-in-the-loop (HITL) control over agent execution. This safety mechanism ensures users maintain control over planning decisions, execution approval, and failure recovery.

## Supervision Model

Orca uses a **plan-based supervision model** where human approval gates are built into the workflow:

1. **Plan Approval** - Users approve plans before execution begins
2. **Deviation Handling** - Users decide how to handle failures (retry, replan, stop)
3. **Planner Questions** - Users answer clarifying questions during planning

All HITL interactions happen inside the plugin via `question.ask()`. LLMs cannot bypass these gates - deterministic plugin logic enforces all decisions.

```
                    User Request
                          │
                          ▼
                    ┌───────────┐
                    │  Planner  │
                    └─────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
     answer           question           plan
         │                │                │
         │                ▼                ▼
         │         ┌───────────┐    ┌───────────┐
         │         │   HITL    │    │   HITL    │
         │         │ Questions │    │ Approval  │
         │         └─────┬─────┘    └─────┬─────┘
         │               │                │
         │               ▼                ▼
         │         back to planner   Execute Plan
         │                                │
         │                                ▼
         │                         ┌───────────┐
         │                         │ On Failure│
         │                         │   HITL    │──► Retry / Replan / Stop
         │                         └───────────┘
         │                                │
         └────────────────────────────────┘
                          │
                          ▼
                    Back to User
```

## HITL Touchpoints

### 1. Planner Questions

When the planner needs clarification before creating a plan, it emits questions that trigger HITL.

**Example**: Planner asks about authentication approach:

```
┌─────────────────────────────────────────────────────────┐
│ Auth Type │ Database │ Priority │ Confirm               │
├─────────────────────────────────────────────────────────┤
│ What authentication approach do you want?               │
│                                                         │
│ 1. OAuth      - Third-party providers (Google, GitHub)  │
│ 2. Session    - Traditional cookie-based sessions       │
│ 3. JWT        - Stateless JSON Web Tokens               │
│ 4. Type your own answer                                 │
└─────────────────────────────────────────────────────────┘
```

**Key behaviors**:
- Planner can batch multiple questions in a single HITL call
- User sees tabs for each question, answers all at once
- `custom: true` always - user can type an answer not in the options
- Answers are sent back to planner to continue planning

### 2. Plan Approval

When the planner produces a complete plan, users must approve before execution begins.

**Example**: Approval prompt:

```
┌─────────────────────────────────────────────────────────┐
│ Decision │ Feedback │ Confirm                           │
├─────────────────────────────────────────────────────────┤
│ Review the plan:                                        │
│                                                         │
│ Goal: Add user authentication to the API                │
│ Steps: 4                                                │
│   1. [researcher] Investigate existing auth patterns    │
│   2. [coder] Implement auth middleware                  │
│   3. [coder] Add login/logout endpoints                 │
│   4. [tester] Write auth integration tests              │
│                                                         │
│ Files affected: src/middleware/*, src/routes/auth.ts    │
│ Risks: Breaking change to existing sessions             │
│                                                         │
│ What would you like to do?                              │
│                                                         │
│ 1. Approve          - Execute this plan                 │
│ 2. Request Changes  - Send back to planner for revision │
│ 3. Reject           - Cancel this plan entirely         │
└─────────────────────────────────────────────────────────┘
```

**Options**:

| Option          | What Happens                                      |
|-----------------|---------------------------------------------------|
| Approve         | Plan executes, user can provide optional feedback |
| Request Changes | Feedback sent to planner, revises and resubmits   |
| Reject          | Plan cancelled, returned to conversation          |

### 3. Deviation Handling

When a step fails during execution, users choose how to proceed.

**Example**: Failure prompt:

```
┌─────────────────────────────────────────────────────────┐
│ Action │ Context │ Confirm                              │
├─────────────────────────────────────────────────────────┤
│ Step 2 failed: "Implement auth middleware"              │
│                                                         │
│ Error: Cannot find module '@auth/core'                  │
│ Retry attempts: 1/10                                    │
│                                                         │
│ What would you like to do?                              │
│                                                         │
│ 1. Retry   - Try this step again                        │
│ 2. Replan  - Go back to planner to revise the approach  │
│ 3. Stop    - Stop execution and return to conversation  │
└─────────────────────────────────────────────────────────┘
```

**Options**:

| Option | What Happens                                      |
|--------|---------------------------------------------------|
| Retry  | Re-run step with failure context + user guidance  |
| Replan | Send failure details to planner, get revised plan |
| Stop   | Mark plan as failed, return to conversation       |

**Retry limits**: After 10 retry attempts on the same step, the Retry option is removed. User must Replan or Stop.

## Two-Question Pattern

Plugin-controlled HITL (approval, deviations) uses a consistent two-question pattern:

1. **Action** (`custom: false`) - Deterministic choice from predefined options
2. **Context** (`custom: true`) - Optional freeform guidance

```
┌─────────────────────────────────────────────────────────┐
│ Action │ Context │ Confirm                              │
└─────────────────────────────────────────────────────────┘
     │         │
     │         └──► "Try using the v2 API instead"
     │              (optional freeform input)
     │
     └──► Retry / Replan / Stop
          (must pick one)
```

**Why this pattern?**
- **Determinism**: Plugin logic switches on action without parsing freeform text
- **Flexibility**: Users can still provide nuanced guidance via context
- **Consistency**: Same UX across all plugin-controlled HITL touchpoints

## HITL Question Schema

All HITL questions follow the same schema:

```typescript
{
  header: string           // Tab label (max 30 chars)
  question: string         // Full question text
  options: Array<{
    label: string
    description?: string
  }>
  multiple?: boolean       // Allow multiple selections (default: false)
  custom?: boolean         // Allow freeform input (default: true)
}
```

The **emitter** (agent or plugin) provides all fields. The HITL system passes through without transformation.

## Read-Only Sessions

When agents use `orca_ask_agent` to ask questions mid-task, the target agent runs in a **read-only session**. The `DispatchService.dispatchQuestion()` method applies `READ_ONLY_PERMISSIONS` (defined in `src/orca/dispatch/permissions.ts`) to enforce restrictions at runtime.

**Tool permissions:**

| Permission | Action | Notes |
|------------|--------|-------|
| `edit` | deny | File modifications blocked |
| `task` | deny | Prevents dispatch recursion |
| `read`, `glob`, `grep`, `list` | allow | All read operations permitted |
| `bash` (safe commands) | allow | `ls*`, `cat*`, `git status*`, `git log*`, `git diff*`, `git show*` |
| `bash` (other) | ask | User approval required |

This allows safe research without risk of side effects.

## Future: Automated Supervision

The current HITL model is the first step toward broader supervision capabilities. Future enhancements may include:

- **Watchdog agents** - Automated review of agent actions before execution
- **Policy-based approval** - Rules that auto-approve or auto-deny based on patterns
- **Risk scoring** - Automatic assessment of operation risk levels
- **Audit trails** - Comprehensive logging of all supervised operations

These will build on the plan-based model, adding automated gates alongside human ones.

## See Also

- [Architecture](architecture.md) - System design and agent classes
- [Configuration](configuration.md) - Full configuration reference
- [Custom Agents](custom-agents.md) - Creating custom agents
