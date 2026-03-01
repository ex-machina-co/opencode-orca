## Purpose

Workflow schemas, artifact sequences, and change metadata are parsed and resolved natively so that agents can query and manage OpenSpec changes through typed interfaces without shelling out to an external CLI.

## Requirements

### Requirement: Available workflow schemas are discoverable

The system SHALL provide a list of all workflow schemas available to the project, including both project-defined schemas and built-in schemas. Each entry SHALL include the schema name and its source location. Developers and agents SHALL be able to enumerate schemas without knowing their names in advance.

#### Scenario: Listing schemas finds project and built-in schemas

- **WHEN** a developer or agent requests the list of available schemas
- **THEN** the system SHALL return schemas defined in the project's `openspec/schemas/` directory
- **AND** the system SHALL return schemas bundled with the OpenSpec package
- **AND** each entry SHALL include the schema name and the directory path where it was found

#### Scenario: Project schema takes precedence over built-in

- **WHEN** a project defines a schema with the same name as a built-in schema
- **THEN** the system SHALL return only the project-defined schema for that name
- **AND** the built-in schema with the same name SHALL NOT appear in the listing

#### Scenario: No schemas available

- **WHEN** no project schemas exist and no built-in schemas are found
- **THEN** the system SHALL return an empty list

### Requirement: Workflow schemas are resolvable by name

The system SHALL locate and load a workflow schema given its name. Resolution SHALL check the project's `openspec/schemas/` directory first, then fall back to built-in schemas. A clear error SHALL be reported when the requested schema does not exist in any location.

#### Scenario: Resolving a project-defined schema

- **WHEN** a developer or agent requests a schema by name
- **AND** a schema with that name exists in the project's `openspec/schemas/` directory
- **THEN** the system SHALL load the schema from the project location

#### Scenario: Resolving a built-in schema

- **WHEN** a developer or agent requests a schema by name
- **AND** no schema with that name exists in the project directory
- **AND** a schema with that name exists in the built-in schemas
- **THEN** the system SHALL load the schema from the built-in location

#### Scenario: Schema not found

- **WHEN** a developer or agent requests a schema by name
- **AND** no schema with that name exists in either location
- **THEN** the system SHALL report a clear error identifying the missing schema name and the locations that were searched

### Requirement: Workflow schemas define an ordered artifact sequence

A loaded workflow schema SHALL describe a sequence of artifacts that define the workflow. Each artifact SHALL have a unique identifier, a list of other artifacts it depends on, a description, and an output path pattern. The system SHALL reject schemas that contain duplicate artifact identifiers or dependency cycles.

#### Scenario: Schema with valid artifact sequence

- **WHEN** a schema is loaded
- **THEN** each artifact in the schema SHALL have an identifier, output path, and description
- **AND** each artifact SHALL declare which other artifacts it depends on (possibly none)

#### Scenario: Schema with duplicate artifact identifiers is rejected

- **WHEN** a schema file contains two artifacts with the same identifier
- **THEN** the system SHALL reject the schema with an error identifying the duplicate

#### Scenario: Schema with dependency cycle is rejected

- **WHEN** a schema file contains artifacts whose dependencies form a cycle
- **THEN** the system SHALL reject the schema with an error identifying the cycle

### Requirement: Change metadata identifies which schema a change uses

Each change directory SHALL contain metadata that identifies which workflow schema the change follows. The system SHALL parse this metadata and make the schema name available for downstream tools. A clear error SHALL be reported when the metadata is missing or malformed.

#### Scenario: Reading change metadata

- **WHEN** a developer or agent reads the metadata for a change
- **THEN** the system SHALL return the schema name the change is using
- **AND** the system SHALL return the change name

#### Scenario: Missing metadata file

- **WHEN** the metadata file is absent from a change directory
- **THEN** the system SHALL report an error indicating the change directory is missing its metadata

#### Scenario: Malformed metadata

- **WHEN** the metadata file exists but does not conform to the expected structure
- **THEN** the system SHALL report a validation error describing which fields are invalid or missing
