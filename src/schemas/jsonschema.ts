import type * as z from 'zod'

/**
 * Field documentation entry for prompt generation
 */
export interface FieldDoc {
  /** Field name as it appears in the schema */
  name: string
  /** Human-readable label (title-cased name with underscores replaced) */
  label: string
  /** Description from .describe() or undefined if not set */
  description: string | undefined
  /** Whether the field is optional */
  optional: boolean
}

/**
 * Extract field documentation from a Zod strict object schema.
 *
 * This utility enables generating prompt documentation from schema definitions,
 * ensuring the schema remains the single source of truth.
 *
 * @param schema - A Zod strict object schema (z.strictObject)
 * @param options - Configuration options
 * @param options.exclude - Field names to exclude from output (e.g., ['agent_id'])
 * @returns Array of field documentation entries
 *
 * @example
 * ```ts
 * const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id'] })
 * // Returns: [{ name: 'goal', label: 'Goal', description: '...', optional: false }, ...]
 * ```
 */
export function extractFieldDocs(
  schema: z.ZodObject<z.ZodRawShape>,
  options: { exclude?: string[] } = {},
): FieldDoc[] {
  const { exclude = [] } = options
  const shape = schema.shape
  const docs: FieldDoc[] = []

  for (const [name, fieldSchema] of Object.entries(shape)) {
    if (exclude.includes(name)) continue

    // Use isOptional() method to check optionality (Zod 4 compatible)
    // biome-ignore lint/suspicious/noExplicitAny: Zod 4 types are complex, runtime check is reliable
    const schemaAny = fieldSchema as any
    const optional = typeof schemaAny.isOptional === 'function' ? schemaAny.isOptional() : false

    // Get description - try unwrap() for optional schemas, fall back to direct access
    let description: string | undefined
    if (optional && typeof schemaAny.unwrap === 'function') {
      description = schemaAny.unwrap().description
    } else {
      description = schemaAny.description
    }

    // Convert field name to human-readable label
    // e.g., 'files_touched' -> 'Files Touched'
    const label = name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    docs.push({ name, label, description, optional })
  }

  return docs
}

/**
 * Generate a numbered markdown list from field documentation.
 *
 * Creates prompt-ready documentation like:
 * ```
 * 1. **Goal**: Clear statement of what we are achieving
 * 2. **Steps**: Numbered steps with specific actions
 * ```
 *
 * @param docs - Field documentation from extractFieldDocs()
 * @returns Formatted markdown string
 */
export function formatFieldDocsAsMarkdownList(docs: FieldDoc[]): string {
  return docs
    .map((doc, index) => {
      const desc = doc.description ?? `The ${doc.name.replace(/_/g, ' ')}`
      return `${index + 1}. **${doc.label}**: ${desc}`
    })
    .join('\n')
}

/**
 * Generate a bullet list with code-formatted field names.
 *
 * Creates prompt-ready documentation like:
 * ```
 * - `goal`: The overall plan objective
 * - `step_index`: Current step number (0-based)
 * ```
 *
 * @param docs - Field documentation from extractFieldDocs()
 * @returns Formatted markdown string with backtick-wrapped field names
 */
export function formatFieldDocsAsCodeList(docs: FieldDoc[]): string {
  return docs
    .map((doc) => {
      const desc = doc.description ?? `The ${doc.name.replace(/_/g, ' ')}`
      return `- \`${doc.name}\`: ${desc}`
    })
    .join('\n')
}
