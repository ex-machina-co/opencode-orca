## Purpose

Standards for how specifications are written in this project. Establishes the value-centric philosophy: specs describe customer/user/developer value, are organized by product domain, and do not reference internal implementation details.

## Requirements

### Requirement: Specifications describe customer value

All specifications SHALL describe value delivered to customers, users, or developers. The litmus test for every requirement SHALL be: "Would a customer, user, or developer care if this stopped working?" If the answer is no, the content belongs in a design document, not a specification.

#### Scenario: Observability requirement passes the litmus test

- **WHEN** a developer writes a requirement about AI assistant tracing
- **THEN** the requirement SHALL describe what developers can observe and debug (e.g., "conversations are traceable in production")
- **AND** the requirement SHALL NOT describe internal mechanisms (e.g., "OTel spans wrap call_responses with these attributes")

#### Scenario: Infrastructure mechanism fails the litmus test

- **WHEN** a proposed requirement describes an internal caching layer, job queue, or instrumentation mechanism
- **AND** no customer, user, or developer directly interacts with or depends on that mechanism
- **THEN** the requirement SHALL be rejected from the spec
- **AND** the content SHOULD be captured in the relevant change's design document instead

### Requirement: Specifications do not reference internal implementation details

Requirements and scenarios SHALL NOT reference internal class names, method names, module paths, or internal data structures. Specs describe observable behavior from the perspective of whoever receives the value.

#### Scenario: Requirement avoids internal references

- **WHEN** a requirement describes a system capability
- **THEN** the requirement text SHALL NOT contain internal class names (e.g., `GenAi::Tracing`, `AiAssistant::Commands::CreateThreadNameCommand`)
- **AND** the requirement text SHALL NOT contain internal method signatures (e.g., `.call_responses`, `.in_thread`)
- **AND** scenarios SHALL describe outcomes in terms of what users, developers, or API consumers observe

#### Scenario: Implementation detail belongs in design

- **WHEN** a developer needs to document which internal classes implement a capability
- **THEN** that documentation SHALL be placed in the change's design document
- **AND** the spec SHALL describe only the externally observable behavior the implementation delivers

### Requirement: Specifications are organized by product domain

Specs SHALL be organized by the product domain that delivers customer value, not by infrastructure domain. Each spec directory SHALL use flat kebab-case naming under `openspec/specs/`.

#### Scenario: AI assistant observability belongs in the ai-assistant spec

- **WHEN** a developer needs to spec observability for the AI assistant
- **THEN** the requirements SHALL be placed in the `ai-assistant` spec (the product domain delivering value)
- **AND** the requirements SHALL NOT be placed in a `gen-ai` or `gen-ai-tracing` spec (the infrastructure domain providing mechanisms)

#### Scenario: Naming convention for specs

- **WHEN** a new spec is created for a product domain
- **THEN** the directory name SHALL use kebab-case (e.g., `ai-assistant`, `case-insights`, `filings`)
- **AND** if a domain requires multiple specs, the name SHALL use `<domain>-<capability>` format (e.g., `ai-assistant-tools`, `ai-assistant-threads`)

### Requirement: Scenarios are testable and verifiable

Every scenario SHALL describe a concrete, verifiable outcome. Scenarios SHALL be specific enough that a developer could write an automated test or manually verify the behavior.

#### Scenario: Testable scenario

- **WHEN** a developer reads a scenario in a spec
- **THEN** the scenario SHALL describe specific observable inputs and outputs
- **AND** a developer SHALL be able to determine unambiguously whether the scenario passes or fails

#### Scenario: Vague scenario is rejected

- **WHEN** a proposed scenario uses vague language like "the system is observable" or "performance is acceptable"
- **THEN** the scenario SHALL be rejected
- **AND** it SHALL be rewritten with specific, measurable criteria (e.g., "traces appear in Langfuse within 30 seconds")
