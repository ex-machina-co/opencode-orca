- We use the dedent library for TypeScript multiline string formatting, meaning leading spaces and line breaks are trimmed. Check for examples in the code.
- This is a PLUGIN, not a library. We don't need to maintain backwards API compatibility.
- Remove deprecated code instead of keeping aliases.
- Do not use barrel exports unless there is a reason.
- Comments should be for exceptional or confusing things...not normal code. Be sparing with them.

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