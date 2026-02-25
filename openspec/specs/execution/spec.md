## Purpose

The execution domain transforms approved plans into completed work by dispatching tasks to specialist agents in sequence, tracking progress, and collecting results. It separates the concern of _doing work and recording how it went_ from _deciding what to do_ (planning), ensuring users have visibility, control, and durable records of multi-step agent work.

## Requirements

### Requirement: Approved plans are executed automatically after approval

When a user approves a plan, the system SHALL automatically create an execution record and begin executing the plan's steps. The user SHALL NOT need to take a separate action to start execution after approval. The transition from approval to execution SHALL be seamless — approval is the trigger.

#### Scenario: Plan approval triggers execution

- **WHEN** a user approves a proposed plan
- **THEN** the system SHALL create an execution record for that plan
- **AND** the system SHALL begin executing the first step without further user input

#### Scenario: Only approved plans are executable

- **WHEN** the system attempts to create an execution
- **THEN** the system SHALL verify the plan is in the approved stage
- **AND** the system SHALL reject execution of plans in draft, proposal, or rejected stages

### Requirement: Tasks are executed sequentially in plan step order

The system SHALL execute tasks one at a time in the order defined by the approved plan's step sequence. Each task SHALL be dispatched to the specialist agent assigned in the corresponding plan step. The system SHALL NOT advance to the next task until the current task completes or fails.

#### Scenario: Tasks execute in order

- **WHEN** an execution is running
- **THEN** the system SHALL execute tasks in the same order as the plan's step sequence
- **AND** the system SHALL NOT start a later task while an earlier task is still running

#### Scenario: Task dispatched to assigned specialist

- **WHEN** a task is ready for execution
- **THEN** the system SHALL dispatch it to the specialist agent assigned in the corresponding plan step
- **AND** the dispatch SHALL include the step's description and any suggested approach

#### Scenario: Execution completes when all tasks succeed

- **WHEN** every task in an execution has completed successfully
- **THEN** the execution SHALL be marked as completed

### Requirement: Completed task context flows to subsequent tasks

Each task SHALL receive context about what prior tasks accomplished, enabling later steps to build on earlier results. The context SHALL include a summary of each completed task's outcome, the artifacts it produced, and any key findings. This context SHALL be assembled automatically from the execution record — not manually constructed.

#### Scenario: Second task receives first task's summary

- **WHEN** the first task in an execution completes successfully
- **AND** the second task begins
- **THEN** the second task SHALL receive a summary of what the first task accomplished and what artifacts it produced

#### Scenario: Later tasks receive all prior summaries

- **WHEN** a task at position N begins (where N > 1)
- **THEN** the task SHALL receive summaries from all N-1 previously completed tasks
- **AND** the summaries SHALL be in execution order

#### Scenario: Context is assembled from execution records

- **WHEN** the system prepares context for a task
- **THEN** the context SHALL be built from the actual outputs recorded in the execution record
- **AND** the system SHALL NOT require manual context construction

### Requirement: Task failures are presented to the user for decision

When a task fails, the system SHALL pause execution and present the failure to the user with a structured set of choices. The user SHALL decide how to proceed — the system SHALL NOT automatically retry or abort without user input. This ensures the user maintains control over how failures are handled.

#### Scenario: Failed task pauses execution for user decision

- **WHEN** a specialist agent reports a task failure
- **THEN** the system SHALL pause execution
- **AND** the system SHALL present the failure details to the user
- **AND** the system SHALL offer the user a choice of how to proceed

#### Scenario: User chooses to retry a failed task

- **WHEN** the user selects retry after a task failure
- **THEN** the system SHALL re-dispatch the task to the same specialist
- **AND** the specialist SHALL receive context about the prior failure (what went wrong and any user guidance)

#### Scenario: User chooses to stop execution

- **WHEN** the user selects stop after a task failure
- **THEN** the execution SHALL be marked as stopped
- **AND** the stop reason SHALL be recorded
- **AND** all completed task results SHALL be preserved

#### Scenario: User provides guidance for retry

- **WHEN** the user selects retry and provides additional guidance
- **THEN** the guidance SHALL be included in the context provided to the specialist on the retry attempt

### Requirement: Retried tasks receive prior failure context

When a failed task is retried, it SHALL receive records of all prior failed attempts at that task. Each failure record SHALL include what error occurred and any guidance the user provided. This enables the specialist to avoid repeating the same mistake.

#### Scenario: Retry includes failure history

- **WHEN** a task is retried after a failure
- **THEN** the specialist SHALL receive a record of each prior failed attempt
- **AND** each record SHALL include the error that occurred

#### Scenario: Multiple retries accumulate context

- **WHEN** a task has failed and been retried multiple times
- **THEN** each retry SHALL receive the full history of all prior failures
- **AND** the retry count SHALL be tracked

### Requirement: Executions survive session boundaries

Execution records SHALL be persisted durably so they survive session endings, crashes, and restarts. Every state change (execution start, task completion, task failure, execution completion) SHALL be persisted before the operation is considered complete. An execution started in one session SHALL be recoverable in a subsequent session.

#### Scenario: Execution state survives session restart

- **WHEN** an execution is in progress and the session ends (normally or abnormally)
- **THEN** the execution record SHALL be retrievable in a new session with its latest state
- **AND** completed task results SHALL be preserved

#### Scenario: State changes are durable

- **WHEN** a task completes or fails during execution
- **THEN** the state change SHALL be persisted before the system proceeds to the next operation
- **AND** a subsequent read SHALL reflect the change even if the session ends immediately after

### Requirement: Execution identity is stable and chronologically sortable

Each execution SHALL receive a unique identity at creation time that SHALL NOT change for the lifetime of the execution. Execution identities SHALL encode creation time so that executions can be sorted chronologically without maintaining a separate index. Multiple executions MAY exist for the same plan (e.g., after a failed execution is followed by a new attempt).

#### Scenario: Execution identity is permanent

- **WHEN** an execution is created
- **THEN** it SHALL receive a unique identity
- **AND** that identity SHALL remain the same through all state transitions and across all sessions

#### Scenario: Executions are sortable by creation time

- **WHEN** a user or agent lists executions for a plan
- **THEN** the executions SHALL be sortable by creation time using only their identities

#### Scenario: Multiple executions per plan

- **WHEN** a plan's execution fails or is stopped
- **THEN** a new execution MAY be created for the same approved plan
- **AND** the new execution SHALL have its own unique identity

### Requirement: Executions are queryable by all agents

All agent types (entry, planner, specialist) SHALL be able to list executions for a plan and retrieve full execution details by identity. The execution list SHALL show each execution's identity, stage, creation time, and task completion progress. Execution details SHALL include the full state of every task.

#### Scenario: Agent lists executions for a plan

- **WHEN** any agent requests a list of executions for a plan
- **THEN** the agent SHALL receive a summary of each execution including identity, stage, creation time, and task progress
- **AND** the list SHALL be sorted most-recent-first

#### Scenario: Agent retrieves execution details

- **WHEN** any agent requests details of a specific execution
- **THEN** the agent SHALL receive the full execution record including the state and output of every task

#### Scenario: Specialist views its own execution context

- **WHEN** a specialist agent is working on a task
- **THEN** the specialist SHALL be able to retrieve the execution details to understand overall progress and prior task results

### Requirement: Execution lifecycle follows a defined state machine

Executions SHALL progress through defined stages: pending (created but not started), running (actively executing tasks), completed (all tasks succeeded), failed (a task failed and the user did not retry), and stopped (user chose to halt). Transitions SHALL be forward-only — no execution SHALL move to a prior stage. Only running executions MAY transition to completed, failed, or stopped.

#### Scenario: Legal execution transitions

- **WHEN** an execution is created
- **THEN** it SHALL begin in the pending stage
- **AND** it SHALL transition to running when execution begins

#### Scenario: Running execution completes

- **WHEN** all tasks in a running execution have completed
- **THEN** the execution SHALL transition to the completed stage

#### Scenario: Running execution fails

- **WHEN** the user decides not to retry a failed task
- **THEN** the execution SHALL transition to the failed stage
- **AND** the failure details (error and which step failed) SHALL be recorded

#### Scenario: Running execution is stopped

- **WHEN** the user decides to stop execution
- **THEN** the execution SHALL transition to the stopped stage
- **AND** the stop reason SHALL be recorded

#### Scenario: No backward transitions

- **WHEN** an execution has transitioned to a later stage
- **THEN** it SHALL NOT transition back to an earlier stage

### Requirement: Task lifecycle follows a defined state machine

Tasks within an execution SHALL progress through defined states: pending (not yet started), running (dispatched to a specialist), completed (specialist reported success), and failed (specialist reported failure or an error occurred). A failed task MAY return to running via retry (with an incremented retry count). A completed task SHALL NOT revert to any earlier state.

#### Scenario: Legal task transitions

- **WHEN** a task is created as part of an execution
- **THEN** it SHALL begin in the pending state
- **AND** it SHALL transition to running when claimed for execution

#### Scenario: Running task completes

- **WHEN** a specialist reports task success
- **THEN** the task SHALL transition to the completed state
- **AND** the task output (summary, artifacts, verification results) SHALL be recorded

#### Scenario: Running task fails

- **WHEN** a specialist reports task failure or the dispatch encounters an error
- **THEN** the task SHALL transition to the failed state
- **AND** the error details SHALL be recorded

#### Scenario: Failed task is retried

- **WHEN** a failed task is retried
- **THEN** it SHALL transition back to running
- **AND** the retry count SHALL be incremented

#### Scenario: Completed tasks are immutable

- **WHEN** a task has been completed
- **THEN** it SHALL NOT transition back to pending, running, or failed
