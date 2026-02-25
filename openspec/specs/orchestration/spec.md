## Purpose

The flow of work is coordinated between users and AI agents through message routing, human-in-the-loop approval gates, agent dispatch, plan lifecycle transitions, execution sequencing, response transformation, capability enforcement, and session management. This ensures that users maintain meaningful control over multi-agent work while providing agents with the context they need to operate effectively.

## Requirements

### Requirement: All user messages enter and exit through a single orchestration path

Every user message SHALL enter the system through a single orchestration entry point and every response SHALL exit through that same path. There SHALL NOT be alternative paths that bypass orchestration's routing. The entry point SHALL forward the user's message to the appropriate agent (currently the planner) without interpreting, modifying, or making routing decisions about the message content. The entry point SHALL transform the agent's response into a predictable output format before returning it to the user.

#### Scenario: User message is forwarded without interpretation

- **WHEN** a user sends a message to the system
- **THEN** the message SHALL be forwarded to the planner through the single orchestration entry point
- **AND** the message content SHALL NOT be modified, summarized, or interpreted during forwarding

#### Scenario: No bypass path exists

- **WHEN** any component attempts to send a user message directly to a specialist or to the planner through an alternative path
- **THEN** the system SHALL reject the request
- **AND** all messages SHALL flow through the single orchestration entry point

#### Scenario: Response exits through the same path

- **WHEN** the planner produces a response (answer, plan reference, or failure)
- **THEN** the response SHALL be transformed into a predictable output format by orchestration
- **AND** the transformed response SHALL be returned through the same entry point that received the message

### Requirement: Responses are transformed into a predictable output format

The system SHALL present responses to the user in a consistent set of output types regardless of which agent produced them. The output types SHALL be: a direct answer, a notification that a draft plan was created, a notification that a plan was submitted for review (including the plan's content), or a failure indication. Plan references SHALL be resolved to include the full plan content (goal, step count, details) so the user does not need to query for plan details separately.

#### Scenario: Direct answer is passed through

- **WHEN** the planner returns a direct answer
- **THEN** orchestration SHALL transform it into an answer output containing the response content and the session identity

#### Scenario: Plan reference is enriched with content

- **WHEN** the planner returns a plan reference with stage "proposal"
- **THEN** orchestration SHALL resolve the plan from storage
- **AND** SHALL return a plan-submitted output containing the plan identity, goal, step count, and full plan details

#### Scenario: Failure is reported with error information

- **WHEN** the planner returns a failure or an error occurs during processing
- **THEN** orchestration SHALL return a failure output containing an error code and human-readable message

### Requirement: Human decisions are collected through deterministic structured choices

When a decision requires human judgment, the system SHALL present the user with structured choices and collect their selection through a deterministic mechanism. The user's selection SHALL be used as a literal value — it SHALL NOT be reinterpreted, summarized, paraphrased, or processed through an LLM. Questions SHALL support a header, body text, and a set of predefined options. Questions MAY support single-select, multi-select, and optional freeform input.

#### Scenario: User selects from predefined options

- **WHEN** the system presents a structured question with predefined options
- **AND** the user selects one of the options
- **THEN** the selected option SHALL be returned as a literal value to the requesting component
- **AND** the selection SHALL NOT be reinterpreted or summarized

#### Scenario: User provides freeform input when enabled

- **WHEN** a question allows custom answers
- **AND** the user provides freeform text
- **THEN** the freeform text SHALL be returned as-is to the requesting component

#### Scenario: User rejects a question

- **WHEN** the system presents a structured question
- **AND** the user dismisses or rejects the question without answering
- **THEN** the system SHALL report a rejection result to the requesting component

### Requirement: HITL questions resolve or time out within a bounded period

Every pending HITL question SHALL resolve within a bounded time period. If the user does not respond within the timeout, the question SHALL resolve as a timeout result rather than hanging indefinitely. The system SHALL handle timeout results by failing the operation that requested the decision, with an appropriate error indication.

#### Scenario: Question times out without response

- **WHEN** a HITL question is presented to the user
- **AND** the user does not respond within the timeout period
- **THEN** the question SHALL resolve as a timeout result
- **AND** the operation that requested the decision SHALL receive a timeout indication

#### Scenario: Question resolved before timeout

- **WHEN** a HITL question is presented to the user
- **AND** the user responds before the timeout period
- **THEN** the question SHALL resolve immediately with the user's response
- **AND** the timeout SHALL be cancelled

### Requirement: Plan approval transitions plans and triggers execution

When a user approves a proposed plan through the HITL mechanism, orchestration SHALL transition the plan from proposal to approved stage and SHALL automatically create an execution record and begin executing the first task. The user SHALL NOT need to take a separate action to start execution after approval. When a user rejects a proposed plan, orchestration SHALL transition the plan to rejected stage. When a user requests changes, orchestration SHALL keep the plan in proposal stage and provide the user's feedback to the planner for revision.

#### Scenario: User approves a plan

- **WHEN** the user selects "Approve" for a proposed plan
- **THEN** orchestration SHALL transition the plan to approved stage
- **AND** SHALL create an execution record for the approved plan
- **AND** SHALL begin executing the first task without further user input

#### Scenario: User rejects a plan

- **WHEN** the user selects "Reject" for a proposed plan
- **THEN** orchestration SHALL transition the plan to rejected stage
- **AND** the user MAY provide a rejection reason that is stored with the plan

#### Scenario: User requests changes to a plan

- **WHEN** the user selects "Request Changes" for a proposed plan and provides feedback
- **THEN** the plan SHALL remain in proposal stage
- **AND** the feedback SHALL be provided to the planner for revision

### Requirement: Agent work is dispatched with structured response expectations

When orchestration dispatches work to an agent (task, question, or user message), the dispatch SHALL target the correct agent, create or reuse an appropriate session, and expect a structured response that validates against a predefined schema. If the agent's response does not validate, orchestration SHALL send a correction prompt describing the validation errors and give the agent a bounded number of retry attempts to produce a valid response. If all retry attempts are exhausted, orchestration SHALL report a failure rather than passing invalid data to consumers.

#### Scenario: Dispatch sends work to the correct agent

- **WHEN** a task is dispatched for execution
- **THEN** the task SHALL be sent to the specialist agent assigned in the corresponding plan step

#### Scenario: Valid response is accepted

- **WHEN** an agent produces a response that validates against the expected schema
- **THEN** orchestration SHALL accept the response and pass it to the requesting component

#### Scenario: Invalid response triggers correction retry

- **WHEN** an agent produces a response that fails schema validation
- **THEN** orchestration SHALL send a correction prompt describing the specific validation errors
- **AND** the agent SHALL have an opportunity to produce a corrected response

#### Scenario: All retries exhausted produces failure

- **WHEN** an agent fails to produce a valid response after all retry attempts
- **THEN** orchestration SHALL report a failure to the requesting component
- **AND** SHALL NOT pass the invalid response to consumers

### Requirement: Research dispatches operate under read-only constraints

When the planner requests information from a specialist agent during plan construction, the dispatch SHALL enforce read-only constraints on the specialist. The specialist SHALL be able to read files and search code but SHALL NOT be able to modify files, create resources, or execute destructive operations. These constraints SHALL be enforced through capability restrictions, not through instructional prompts.

#### Scenario: Research specialist can read but not write

- **WHEN** a specialist is dispatched for a research query during planning
- **THEN** the specialist SHALL be able to read files, search code, and gather information
- **AND** the specialist SHALL NOT be able to edit files, create files, or run destructive commands

#### Scenario: Constraints are enforced by capability restriction

- **WHEN** a research specialist attempts to use a tool that would modify the codebase
- **THEN** the system SHALL deny the tool use regardless of the specialist's prompt instructions

#### Scenario: Research sessions support follow-up questions

- **WHEN** the planner asks a follow-up question to the same specialist
- **THEN** the specialist SHALL have access to the context from previous questions in the same research conversation

### Requirement: Tasks execute sequentially with context flowing forward

During plan execution, orchestration SHALL dispatch tasks one at a time in the order defined by the approved plan's step sequence. Each task SHALL receive context about what prior tasks accomplished, including summaries of completed task outcomes and any artifacts they produced. This context SHALL be assembled automatically from the execution record. Orchestration SHALL NOT advance to the next task until the current task completes or fails.

#### Scenario: Tasks execute in plan step order

- **WHEN** an execution is running
- **THEN** orchestration SHALL dispatch tasks in the same order as the plan's step sequence
- **AND** SHALL NOT start a later task while an earlier task is still running

#### Scenario: Later tasks receive prior task context

- **WHEN** a task at position N begins (where N > 1)
- **THEN** the task SHALL receive summaries from all N-1 previously completed tasks
- **AND** the summaries SHALL be in execution order

#### Scenario: Context is assembled from execution records

- **WHEN** orchestration prepares context for a task
- **THEN** the context SHALL be built from the actual outputs recorded in the execution record
- **AND** SHALL NOT require manual context construction

### Requirement: Task failures are surfaced to the user for retry or stop decisions

When a specialist agent reports a task failure during execution, orchestration SHALL pause execution and present the failure to the user through the HITL mechanism with structured choices. The user SHALL decide whether to retry the failed task or stop the execution. If the user chooses to retry, orchestration SHALL re-dispatch the task to the same specialist with context about the prior failure. If the user chooses to stop, orchestration SHALL mark the execution as stopped and preserve all completed task results.

#### Scenario: Task failure pauses execution for user decision

- **WHEN** a specialist reports a task failure
- **THEN** orchestration SHALL pause execution
- **AND** SHALL present the failure details to the user
- **AND** SHALL offer the user a choice of Retry or Stop

#### Scenario: User chooses to retry

- **WHEN** the user selects Retry after a task failure
- **THEN** orchestration SHALL re-dispatch the task to the same specialist
- **AND** the specialist SHALL receive context about the prior failure

#### Scenario: User provides guidance for retry

- **WHEN** the user selects Retry and provides additional guidance
- **THEN** the guidance SHALL be included in the context provided to the specialist on the retry attempt

#### Scenario: User chooses to stop

- **WHEN** the user selects Stop after a task failure
- **THEN** the execution SHALL be marked as stopped
- **AND** the stop reason SHALL be recorded
- **AND** all completed task results SHALL be preserved

### Requirement: Agent capabilities are enforced by role-based tool permissions

Each agent's available tools SHALL be determined by its assigned role, not by instructions in its prompt. Orchestration SHALL compute and apply a permission configuration for each agent that grants access only to tools appropriate for that role. An agent SHALL NOT be able to use a tool that its role does not permit, regardless of what it is instructed to do. The entry agent SHALL be restricted to the single orchestration entry tool. Specialists SHALL NOT have access to planning tools. The planner SHALL NOT have access to execution-only tools.

#### Scenario: Entry agent is restricted to one tool

- **WHEN** the entry agent processes a user message
- **THEN** the entry agent SHALL only have access to the single orchestration entry tool
- **AND** SHALL NOT be able to read files, run commands, or perform any other action

#### Scenario: Specialist cannot use planning tools

- **WHEN** a specialist agent is executing a task
- **THEN** the specialist SHALL NOT have access to tools that create, modify, or submit plans

#### Scenario: Permission violations are denied regardless of prompt

- **WHEN** an agent attempts to use a tool not permitted by its role
- **THEN** the tool use SHALL be denied
- **AND** the denial SHALL occur regardless of any instructions in the agent's prompt

### Requirement: Dispatches operate in scoped child sessions

Agent dispatches SHALL create child sessions scoped to the parent conversation, ensuring agent work does not pollute the user's conversation context. Fresh dispatches (task execution) SHALL create new child sessions. Dispatches that require continuity (research follow-ups, task retries) SHALL reuse existing sessions when a session identity is provided. The planner SHALL operate in a persistent session that can be reused across multiple user messages within the same conversation.

#### Scenario: Task dispatch creates a new session

- **WHEN** a task is dispatched to a specialist for execution
- **THEN** the dispatch SHALL create a new child session under the parent conversation

#### Scenario: Research follow-up reuses session

- **WHEN** the planner asks a follow-up question to a specialist with a session identity
- **THEN** the dispatch SHALL reuse the existing session to maintain conversation context

#### Scenario: Planner session persists across messages

- **WHEN** a user sends multiple messages within the same conversation
- **THEN** the planner SHALL operate in the same persistent session
- **AND** SHALL have access to context from previous messages in that conversation
