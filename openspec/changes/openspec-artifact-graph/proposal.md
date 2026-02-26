## Why

Phase 1 delivered schema parsing and resolution, but agents cannot yet determine which artifacts in a change are done, ready, or blocked. Without artifact dependency tracking and completion detection, workflow tools have no way to guide agents through the correct artifact sequence.

## What Changes

- Add artifact dependency graph construction from parsed schemas, with topological sort (Kahn's algorithm) and cycle detection
- Add readiness detection: given a set of completed artifact IDs, determine which artifacts are ready to create next, which are blocked, and whether the workflow is complete
- Add filesystem-based completion detection: scan a change directory to determine which artifacts have been created, using exact file paths and glob patterns from the schema's output path definitions
- Add `fast-glob` as a direct dependency (currently transitive) for glob-based artifact detection

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `openspec`: Adding requirements for artifact dependency ordering, readiness detection, and completion state tracking

## Non-goals

- Change creation or scaffolding (Phase 3)
- Template loading or instruction generation (Phase 3)
- Any plugin tool registration (Phase 7+)

## Impact

- New files: `src/openspec/graph.ts`, `src/openspec/state.ts`, and their test files
- New direct dependency: `fast-glob`
- Builds on Phase 1's `SchemaYamlSchema` type as input to graph construction
- No changes to existing code — purely additive
