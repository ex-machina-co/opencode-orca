## Purpose

Standards for how specifications are written in this project. Establishes the value-centric philosophy: specs describe customer/user/developer value, are organized by product domain, and do not reference internal implementation details.

## Requirements

### Requirement: Specifications describe customer value

All specifications SHALL describe value delivered to customers, users, or developers. The litmus test for every requirement SHALL be: "Would a customer, user, or developer care if this stopped working?" If the answer is no, the content belongs in a design document, not a specification.

#### Scenario: Execution requirement passes the litmus test

- **WHEN** a developer writes a requirement about plan execution visibility
- **THEN** the requirement SHALL describe what users can observe (e.g., "users can see which tasks have completed and which are pending")
- **AND** the requirement SHALL NOT describe internal mechanisms (e.g., "ExecutionService persists a PlanExecution record via storage.ts")

#### Scenario: Infrastructure mechanism fails the litmus test

- **WHEN** a proposed requirement describes an internal caching layer, job queue, or instrumentation mechanism
- **AND** no customer, user, or developer directly interacts with or depends on that mechanism
- **THEN** the requirement SHALL be rejected from the spec
- **AND** the content SHOULD be captured in the relevant change's design document instead

### Requirement: Specifications do not reference internal implementation details

Requirements and scenarios SHALL NOT reference internal class names, method names, module paths, or internal data structures. Specs describe observable behavior from the perspective of whoever receives the value.

#### Scenario: Requirement avoids internal references

- **WHEN** a requirement describes a system capability
- **THEN** the requirement text SHALL NOT contain internal class names (e.g., `ExecutionService`, `DispatchService`, `PlanningService`)
- **AND** the requirement text SHALL NOT contain internal method signatures (e.g., `.claimNextTask()`, `.tryParseAndValidate()`)
- **AND** scenarios SHALL describe outcomes in terms of what users, developers, or API consumers observe

#### Scenario: Implementation detail belongs in design

- **WHEN** a developer needs to document which internal classes implement a capability
- **THEN** that documentation SHALL be placed in the change's design document
- **AND** the spec SHALL describe only the externally observable behavior the implementation delivers

### Requirement: Specifications are organized by product domain

Specs SHALL be organized by the product domain that delivers customer value, not by infrastructure domain. Each spec directory SHALL use flat kebab-case naming under `openspec/specs/`.

#### Scenario: Execution persistence belongs in the execution spec

- **WHEN** a developer needs to spec persistence behavior for the execution domain
- **THEN** the requirements SHALL be placed in the `execution` spec (the product domain delivering value)
- **AND** the requirements SHALL NOT be placed in a `state-machines` or `task-persistence` spec (infrastructure concerns, not product domains)

#### Scenario: Naming convention for specs

- **WHEN** a new spec is created for a product domain
- **THEN** the directory name SHALL use kebab-case (e.g., `planning`, `execution`, `spec-governance`)

#### Scenario: One spec per domain

- **WHEN** a product domain is specified
- **THEN** the domain SHALL have exactly one spec at `openspec/specs/<domain>/spec.md`
- **AND** all capabilities within the domain SHALL be expressed as requirements within that single spec
- **AND** the domain SHALL NOT be split into multiple specs per capability (e.g., `execution-loop` and `execution-triggering` are requirements within the `execution` spec, not separate specs; `auth-login` is a requirement within the `auth` spec, not a separate spec)

### Requirement: Specifications do not reference domain names in requirements

Spec files — including Purpose sections, requirements, and scenarios — SHALL NOT use domain names (e.g., "the planning domain," "the execution domain," "the orchestration layer") as subjects, objects, or qualifiers. Specs describe what the system does for users — not which internal organizational unit does it. The subject SHALL be "the system," "the user," "the plan," "the agent," or another user-visible concept — or omitted entirely using passive voice (e.g., "User requests are transformed into structured plans"). Users do not know about domains; specs SHALL NOT assume they do.

#### Scenario: Domain name used as subject is rejected

- **WHEN** a proposed requirement uses a domain name as its subject (e.g., "the planning domain SHALL return one of three response types")
- **THEN** the requirement SHALL be rejected
- **AND** it SHALL be rewritten with a user-visible subject (e.g., "the system SHALL return one of three response types")

#### Scenario: Domain name used as consumer is rejected

- **WHEN** a proposed requirement references another domain as a consumer or recipient (e.g., "the plan SHALL be available for the execution domain to execute")
- **THEN** the requirement SHALL be rejected
- **AND** it SHALL be rewritten to describe the outcome without naming the consumer (e.g., "the plan SHALL be available for execution")

#### Scenario: Internal layer name is rejected

- **WHEN** a proposed requirement uses an internal layer name (e.g., "the orchestration layer SHALL transform internal agent responses")
- **THEN** the requirement SHALL be rejected
- **AND** it SHALL be rewritten to describe user-observable behavior (e.g., "the system SHALL present responses to the user in a consistent format")

#### Scenario: Cross-domain responsibility attribution is rejected

- **WHEN** a proposed requirement attributes responsibility to another domain (e.g., "this is coordinated by the X domain's Y capability" or "the orchestration domain is responsible for presenting failures")
- **THEN** the requirement SHALL be rejected
- **AND** it SHALL be rewritten to describe the observable behavior without attributing it to a domain

#### Scenario: User-observable outcome is acceptable

- **WHEN** a requirement describes an outcome that the user observes (e.g., "when a user approves a plan, execution begins automatically")
- **THEN** the requirement SHALL be accepted because it describes a user-observable outcome
- **AND** the requirement SHALL NOT add organizational commentary about which domain triggers the transition

### Requirement: Scenarios are testable and verifiable

Every scenario SHALL describe a concrete, verifiable outcome. Scenarios SHALL be specific enough that a developer could write an automated test or manually verify the behavior.

#### Scenario: Testable scenario

- **WHEN** a developer reads a scenario in a spec
- **THEN** the scenario SHALL describe specific observable inputs and outputs
- **AND** a developer SHALL be able to determine unambiguously whether the scenario passes or fails

#### Scenario: Vague scenario is rejected

- **WHEN** a proposed scenario uses vague language like "the system is observable" or "performance is acceptable"
- **THEN** the scenario SHALL be rejected
- **AND** it SHALL be rewritten with specific, measurable criteria (e.g., "the user is presented with retry, re-plan, or stop options when a task fails")
