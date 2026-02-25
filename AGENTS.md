# IMPORTANT RULES FOR AGENTS

## Project

**Name:** @ex-machina/opencode-orca

An OpenCode plugin for AI agent orchestration. It provides a multi-agent system called "Orca" that orchestrates specialist AI agents (coder, tester, reviewer, researcher, document writer, architect) through a planning-then-execution workflow. Users interact with an entry agent ("Orca"), which routes messages to a Planner agent that either answers directly or builds execution plans. Approved plans are then executed by specialist agents.

Built as a plugin for OpenCode (https://opencode.ai), using the @opencode-ai/plugin and @opencode-ai/sdk packages, with Zod for schema validation and TypeScript throughout.

## Best Practices and Context
- Remove deprecated code instead of keeping aliases.
- This is a PLUGIN, not a library. We don't need to maintain backwards API compatibility.
- Do not use barrel exports unless there is a reason.
- Comments should be for exceptional or confusing things...not normal code. Be sparing with them.
  - Seriously, comments are liars. We should avoid them whenever possible, ONLY using them in EXCEPTIONAL circumstances.
- Never execute a plan without user approval, assume you're always read only unless given explicit permission.
  - Remember to always ask for permission, too.

## Architecture

- ADRs are located in `adrs/` and contain all the architecture decisions for the project
- Whenever thinking about architecture, please consult the ADRs first

## Specifications

- Specifications are located in `openspec/specs/` and describe the expected behavior of each product domain
- Whenever implementing or modifying behavior, consult the relevant spec first
- Specs describe customer/user/developer value, not internal implementation — see `openspec/specs/spec-governance/spec.md` for the full governance rules

## TypeScript Best Practices

- Use `unknown` instead of `any`.
- Prefer `const` over `let`.
- Avoid casting (it's almost never necessary).
- Use Zod schemas for any types that may need to be validated at runtime, or produce schema information.
- When using Zod, define the schema as the source of truth and infer the type from it (always use PascalCase for schemas).
- Always export types with the same name as Zod schemas.
  - Example:
    ```typescript
    export const ExampleForAgents = z.object({ foo: z.string() });
    export type ExampleForAgents = z.infer<typeof Example>;
    ```
  - When importing a Zod schema with the same name as an imported type DO NOT break apart the type import from the schema import, import the schema and the type will be available too
- Prefer inferred types when possible, unless there's a specific reason to use a type annotation.
- Prefer string literal union types over enums (unless using Zod enums, which are fine)
- **Make invalid states unrepresentable**: Use discriminated unions instead of objects with many optional fields. Each variant should contain exactly the fields meaningful for that state - no more, no less. This eliminates impossible states at the type level.
  - Bad: `{ status: string, error?: string, output?: string, startedAt?: string }` (allows `error` with `status: 'pending'`)
  - Good: Discriminated union where `error` only exists on `failed` variant, `output` only on `completed`, etc.

## Testing Best Practices

- Do not `await expect(...).rejects.toThrow()` blocks...they do not need the await, since bun handles it
  - Use `expect(...).rejects.toThrow('...')` instead
- Use `expect(...).toMatchInlineSnapshot()` for things that are text based (like error messages)
- Prefer inline snapshots over multiple expect checks when the data is deterministic
- If the data is non-deterministic, use `expect(...).toMatch({...})` with appropriate expect matchers for fields that vary