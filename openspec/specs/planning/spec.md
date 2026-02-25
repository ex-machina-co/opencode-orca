## Purpose

User requests are transformed into structured, reviewable multi-step execution plans. This provides meaningful human control over multi-agent work by separating the decision of _what to do_ from _doing it_, ensuring users can review, approve, or reject plans before any work begins.

## Requirements

### Requirement: Request triage decides plan vs. direct answer

Every user request SHALL be triaged to determine whether it warrants a structured plan or a direct answer. The triage decision SHALL be made for every request with no bypass path. Simple questions, information lookups, and single-specialist tasks SHALL receive direct answers without plan ceremony. Requests requiring multiple execution steps, coordination across specialists, or work that benefits from explicit risk and assumption documentation SHALL trigger plan creation.

#### Scenario: Simple question receives direct answer

- **WHEN** a user asks a factual question or requests information that a single specialist can answer in one step
- **THEN** the system SHALL return a direct answer without creating a plan

#### Scenario: Multi-step coordination triggers plan creation

- **WHEN** a user requests work that requires coordinating multiple specialists or involves multiple dependent steps
- **THEN** the system SHALL create a structured plan rather than answering directly

#### Scenario: Every request is triaged

- **WHEN** any user request enters the system
- **THEN** the request SHALL pass through the triage decision
- **AND** no request SHALL bypass triage and go directly to execution

### Requirement: Triage returns one of three response types

The system SHALL return exactly one of three response types for every user request: a direct answer containing the response text, a plan reference containing the plan identity and current stage, or a failure indication.

#### Scenario: Direct answer response

- **WHEN** triage determines a request does not warrant a plan
- **THEN** the system SHALL return a direct answer response containing the answer text

#### Scenario: Plan reference response

- **WHEN** triage determines a request warrants a plan and the plan is created or submitted
- **THEN** the system SHALL return a plan reference response containing the plan identity and current lifecycle stage

#### Scenario: Failure response

- **WHEN** the system cannot process a request (due to error or inability)
- **THEN** the system SHALL return a failure indication rather than silently dropping the request

### Requirement: Plans capture goal, steps, assumptions, risks, and verification

A plan SHALL contain a goal (what is being achieved), an ordered sequence of steps (what work to do and in what order), assumptions (what the planner believes to be true), risks (what could go wrong), and verification criteria (how to confirm the plan succeeded). Each step SHALL contain a description of what it accomplishes and an assignment to a specialist agent.

#### Scenario: Complete plan contains all required sections

- **WHEN** a plan is submitted for user review
- **THEN** the plan SHALL contain a non-empty goal, at least one step, at least one assumption, at least one risk, and at least one verification criterion

#### Scenario: Steps include specialist assignments

- **WHEN** a plan step is created
- **THEN** the step SHALL specify which specialist agent is assigned to execute it
- **AND** the step SHALL include a description of what the step accomplishes

### Requirement: Plans are built incrementally through a builder workflow

Plans SHALL be constructed incrementally through discrete operations: creating a draft, adding steps, setting assumptions, setting risks, setting verification criteria, and submitting the plan. The planner SHALL be able to interleave research queries and user questions between build operations, allowing the plan to evolve as more context is gathered.

#### Scenario: Planner builds a plan step by step

- **WHEN** the planner begins constructing a plan
- **THEN** the planner SHALL create a draft first
- **AND** the planner SHALL add steps, assumptions, risks, and verification criteria through individual operations
- **AND** the planner MAY research the codebase or ask the user questions between operations

#### Scenario: Steps can be reordered during construction

- **WHEN** the planner is building a draft plan
- **THEN** the planner SHALL be able to add steps at specific positions, update existing steps, and remove steps before submission

### Requirement: Draft validation prevents incomplete plans from reaching users

A draft plan SHALL NOT be submittable as a proposal unless it meets minimum completeness criteria: at least one step, at least one assumption, at least one risk, and at least one verification criterion. If a draft fails validation, it SHALL remain in draft stage and the planner SHALL receive the validation errors.

#### Scenario: Incomplete draft is rejected at submission

- **WHEN** a planner attempts to submit a draft that is missing required sections (e.g., no steps, no assumptions)
- **THEN** the submission SHALL fail
- **AND** the plan SHALL remain in draft stage
- **AND** the planner SHALL receive specific validation errors indicating what is missing

#### Scenario: Complete draft is accepted for submission

- **WHEN** a planner submits a draft with at least one step, one assumption, one risk, and one verification criterion
- **THEN** the plan SHALL transition to proposal stage

### Requirement: Plan lifecycle follows a defined state machine

Plans SHALL progress through four stages: draft, proposal, approved, and rejected. The only legal transitions SHALL be: draft to proposal (via submission), proposal to approved (via user approval), and proposal to rejected (via user rejection). No stage SHALL be skipped and no transition SHALL move backwards. Drafts SHALL be mutable. Plans in proposal stage or beyond SHALL NOT have their content mutated except through an explicit revise operation on proposals (which replaces all content while remaining in proposal stage). Approved and rejected plans SHALL be fully immutable.

#### Scenario: Legal stage transitions

- **WHEN** a plan is in draft stage
- **THEN** it MAY transition to proposal via submission
- **AND** it SHALL NOT transition directly to approved or rejected

#### Scenario: Proposal immutability

- **WHEN** a plan reaches proposal stage
- **THEN** its content SHALL NOT be modified except through the revise operation
- **AND** the revise operation SHALL replace all content while keeping the plan in proposal stage

#### Scenario: Approved and rejected plans are immutable

- **WHEN** a plan is approved or rejected
- **THEN** its content SHALL NOT be modified by any operation

#### Scenario: No backward transitions

- **WHEN** a plan has transitioned to a later stage
- **THEN** it SHALL NOT transition back to an earlier stage

### Requirement: Specialist assignments reference valid agents

Every plan step SHALL be assigned to a registered specialist agent. Step assignments SHALL NOT reference non-specialist agents (such as the planner itself) or unregistered agent identities. The system SHALL validate that step assignments reference agents from the known specialist list before a plan MAY be approved.

#### Scenario: Step assigned to valid specialist

- **WHEN** a plan step is assigned to an agent that appears in the registered specialist list
- **THEN** the assignment SHALL be accepted

#### Scenario: Step assigned to non-specialist is rejected

- **WHEN** a plan step is assigned to an agent that is not in the registered specialist list (e.g., the planner itself or a non-existent agent)
- **THEN** the system SHALL reject the assignment before the plan reaches approved stage

### Requirement: Users review and decide on proposed plans

When a plan reaches proposal stage, the system SHALL present the plan to the user for review and collect a structured decision. The user SHALL be offered exactly three choices: approve (proceed to execution), request changes (provide feedback for revision), or reject (terminate the plan with an optional reason). The decision SHALL be collected through a deterministic choice mechanism — not interpreted from freeform conversation.

#### Scenario: Plan submitted for approval

- **WHEN** a plan transitions from draft to proposal
- **THEN** the system SHALL present the plan's goal, steps, assumptions, risks, and verification criteria to the user
- **AND** the system SHALL offer the user a choice of Approve, Request Changes, or Reject

#### Scenario: User approves a plan

- **WHEN** the user selects Approve
- **THEN** the plan SHALL transition to approved stage
- **AND** the plan SHALL be available for execution

#### Scenario: User requests changes

- **WHEN** the user selects Request Changes and provides feedback
- **THEN** the plan SHALL remain in proposal stage
- **AND** the feedback SHALL be provided to the planner for revision

#### Scenario: User rejects a plan

- **WHEN** the user selects Reject
- **THEN** the plan SHALL transition to rejected stage
- **AND** the user MAY provide a rejection reason that is stored with the plan

### Requirement: Approved plans provide a stable contract for execution

An approved plan SHALL serve as a stable, immutable contract containing: a plan identity that SHALL NOT change after creation, a goal, an ordered sequence of steps where each step includes a description and a specialist assignment, plan-level assumptions and risks, and plan-level verification criteria. The step sequence SHALL define the execution order. Any approved plan SHALL be retrievable by its identity.

#### Scenario: Approved plan is retrievable for execution

- **WHEN** an approved plan is executed
- **THEN** it SHALL be able to retrieve the plan by identity
- **AND** the plan's content SHALL be identical to when it was approved

#### Scenario: Step order defines execution order

- **WHEN** the system reads the steps of an approved plan for execution
- **THEN** the steps SHALL be in the order the planner intended them to be executed

### Requirement: Plans survive session boundaries

Plans SHALL be persisted durably so they survive session endings, crashes, and restarts. Every mutation to a plan (creation, content changes, stage transitions) SHALL be persisted before the operation is considered complete. A plan persisted in one session SHALL be retrievable in any subsequent session.

#### Scenario: Plan survives session restart

- **WHEN** a plan is created or modified in one session
- **AND** the session ends (normally or abnormally)
- **THEN** the plan SHALL be retrievable with its latest state in a new session

#### Scenario: Mutations are durable

- **WHEN** a plan is modified (step added, stage transitioned, etc.)
- **THEN** the change SHALL be persisted before the operation returns success
- **AND** a subsequent read SHALL reflect the change even if the session ends immediately after

### Requirement: Plan identity is stable and chronologically sortable

Each plan SHALL receive a unique identity at creation time that SHALL NOT change for the lifetime of the plan. Plan identities SHALL encode creation time so that plans can be sorted chronologically without maintaining a separate index.

#### Scenario: Plan identity is permanent

- **WHEN** a plan is created
- **THEN** the plan SHALL receive a unique identity
- **AND** that identity SHALL remain the same through all stage transitions and across all sessions

#### Scenario: Plans are sortable by creation time

- **WHEN** a user or agent lists plans
- **THEN** the plans SHALL be sortable by creation time using only their identities

### Requirement: Plans are queryable by all agents

All agent types (entry, planner, specialist) SHALL be able to list existing plans and retrieve full plan details by identity. The plan list SHALL show each plan's identity, goal, current stage, creation time, step count, and execution count. The list SHALL be sorted with most recently created plans first.

#### Scenario: Agent lists plans

- **WHEN** any agent requests a list of plans
- **THEN** the agent SHALL receive a summary of each plan including identity, goal, stage, creation time, step count, and execution count
- **AND** the list SHALL be sorted most-recent-first

#### Scenario: Specialist retrieves its plan during execution

- **WHEN** a specialist agent is executing a task from a plan
- **THEN** the specialist SHALL be able to retrieve the full plan details by identity to understand the broader context

### Requirement: Research during planning operates under read-only constraints

The planner SHALL be able to query specialist agents for information during plan construction. These research queries SHALL operate under read-only constraints — specialists responding to research queries SHALL be able to read files and search code but SHALL NOT be able to modify files, create resources, or execute destructive operations. Research conversations SHALL support session continuity so the planner can ask follow-up questions that build on previous answers.

#### Scenario: Planner researches codebase during planning

- **WHEN** the planner needs information about the codebase to inform plan construction
- **THEN** the planner SHALL be able to send a question to a specialist agent
- **AND** the specialist SHALL respond with information gathered under read-only constraints

#### Scenario: Multi-turn research conversation

- **WHEN** the planner asks a follow-up question to the same specialist
- **THEN** the specialist SHALL have access to the context from previous questions in the same research conversation

#### Scenario: Research cannot modify the codebase

- **WHEN** a specialist responds to a research query during planning
- **THEN** the specialist SHALL NOT have permission to edit files, create files, or run destructive commands

### Requirement: Planner asks users clarifying questions during planning

The planner SHALL be able to ask users structured questions during plan construction to clarify requirements, resolve ambiguity, or gather preferences. Questions SHALL support a header, body text, and optional preset choices (single-select or multi-select with optional custom-answer support).

#### Scenario: Planner asks a clarifying question

- **WHEN** the planner encounters ambiguity or needs user input during planning
- **THEN** the planner SHALL present a structured question to the user
- **AND** the user's response SHALL be available to inform subsequent planning decisions

#### Scenario: Question with preset choices

- **WHEN** the planner presents a question with a defined set of options
- **THEN** the user SHALL be able to select from the preset choices
- **AND** if custom answers are enabled, the user SHALL also be able to provide a freeform response
