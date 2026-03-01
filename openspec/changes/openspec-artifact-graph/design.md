## Context

Phase 1 delivered schema parsing, validation, and resolution. Schemas define artifacts with dependency relationships (`requires` fields), but nothing yet interprets those relationships to determine build order, readiness, or completion. The upstream `@fission-ai/openspec` package implements this as an `ArtifactGraph` class with Kahn's algorithm and a `detectCompleted` function using `fast-glob`. We are porting ~140 lines of graph logic and ~40 lines of state detection.

## Goals / Non-Goals

**Goals:**

- Construct a dependency graph from a parsed `SchemaYaml` and expose topological sort, readiness, completion, and blocked queries
- Detect which artifacts in a change directory are complete by checking file existence (exact paths and glob patterns)
- Maintain deterministic output ordering for stable agent behavior
- Keep graph logic pure (no I/O) and state detection as the only I/O boundary

**Non-Goals:**

- Instruction loading or template rendering (Phase 3)
- Change directory scaffolding (Phase 3)
- Plugin tool registration (Phase 7+)
- User-level schema resolution tier (not needed for plugin context)

## Decisions

### Decision 1: Functions over class

**Choice:** Export standalone functions (`buildArtifactMap`, `getBuildOrder`, `getNextArtifacts`, `isComplete`, `getBlocked`) rather than a class with a private constructor.

**Why:** The upstream uses `ArtifactGraph` as a class with static factory methods, but the class just wraps a `Map<string, Artifact>` and delegates to the already-validated schema. Standalone functions taking a `SchemaYaml` (or the artifact map) are simpler, more composable, and consistent with Phase 1's functional style. There's no mutable state to encapsulate.

**Alternative considered:** Port the class directly. Rejected because it adds ceremony (static factories, getters) without benefit — the schema is already validated by `parseSchema()`, so the graph construction can't fail.

### Decision 2: Kahn's algorithm with alphabetical tie-breaking

**Choice:** Port Kahn's algorithm from upstream with the same deterministic tie-breaking: sort roots alphabetically, sort each batch of newly-ready nodes alphabetically.

**Why:** Deterministic ordering matters for agents — the same schema MUST always produce the same build order. Alphabetical tie-breaking is simple and matches upstream behavior, so existing schemas will produce identical orderings.

**Alternative considered:** Respect declaration order from the YAML. Rejected because YAML object key order is not guaranteed across parsers, while alphabetical sort is universally stable.

### Decision 3: Synchronous glob detection with fast-glob

**Choice:** Use `fast-glob`'s synchronous API (`fg.sync`) for glob-based artifact detection, matching upstream behavior.

**Why:** State detection is called once per status check, touching at most ~10 artifacts per schema. The synchronous API is simpler and avoids async propagation through the graph query functions. Performance is irrelevant at this scale.

**Alternative considered:** Async glob with `fg.async`. Rejected because it would force `detectCompleted` to be async, which propagates to all callers for no measurable benefit.

### Decision 4: Glob detection heuristic

**Choice:** An artifact's `generates` field is treated as a glob if it contains `*`, `?`, or `[`. Simple paths use `existsSync`. Globs use `fast-glob` and the artifact is considered complete if at least one file matches.

**Why:** This matches upstream behavior exactly. The "at least one match" heuristic is correct for `specs/**/*.md` — the artifact is done once any spec file exists under the directory. Schema authors control the glob pattern.

### Decision 5: Separate modules for graph and state

**Choice:** `graph.ts` contains pure graph logic (no I/O). `state.ts` contains `detectCompleted` (filesystem I/O). Both are exported separately.

**Why:** The graph module is trivially testable with synthetic schemas and no filesystem setup. State detection needs temp directories. Keeping them separate maintains this clean testing boundary.

## Risks / Trade-offs

**[Alphabetical tie-breaking may not match user intent]** If a schema author expects declaration-order traversal, alphabetical sorting could surprise them. Mitigation: this matches upstream behavior, so existing schemas already work this way. Document the behavior.

**[Synchronous glob blocks the event loop]** For schemas with many glob-pattern artifacts, `fg.sync` blocks. Mitigation: real schemas have 4-6 artifacts. If this becomes a problem, switching to async is a backwards-compatible change.

**[`fast-glob` becomes a direct dependency]** Currently transitive via `@fission-ai/openspec`. Mitigation: `fast-glob` is widely used (85M weekly downloads), zero-dependency, and we'd need it regardless when we drop the CLI dependency.
