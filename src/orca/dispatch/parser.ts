import type { Part } from '@opencode-ai/sdk/v2'
import type { ZodError, ZodType, z } from 'zod'

/** Error thrown when response parsing fails */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly rawContent: string,
    public readonly zodError?: ZodError,
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

/** Result of a parse attempt */
export type ParseAttemptResult<T> =
  | { success: true; data: T }
  | { success: false; type: 'json_error'; content: string }
  | { success: false; type: 'schema_error'; content: string; error: ZodError }

/**
 * Extract text content from message parts.
 * Concatenates all text parts, ignoring tool calls and other part types.
 */
export function extractTextContent(parts: Part[]): string | null {
  const textParts = parts.filter((part): part is Part & { type: 'text' } => part.type === 'text')

  if (textParts.length === 0) {
    return null
  }

  return textParts.map((part) => part.text).join('\n')
}

/**
 * Strip markdown code fences from content.
 * Handles ```json, ```, and bare JSON.
 */
export function stripMarkdownCodeFences(content: string): string {
  const trimmed = content.trim()

  // Match ```json or ``` at start and ``` at end
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  return trimmed
}

/**
 * Attempt to parse content as JSON and validate against a schema.
 */
export function tryParseAndValidate<T extends ZodType>(
  content: string,
  schema: T,
): ParseAttemptResult<z.infer<T>> {
  const jsonContent = stripMarkdownCodeFences(content)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonContent)
  } catch {
    return { success: false, type: 'json_error', content }
  }

  const result = schema.safeParse(parsed)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, type: 'schema_error', content, error: result.error }
}

/**
 * Format a correction prompt from Zod validation errors.
 */
export function formatCorrectionPrompt(error: ZodError): string {
  const issues = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `at "${issue.path.join('.')}"` : 'at root'
      return `- ${path}: ${issue.message}`
    })
    .join('\n')

  return `Your JSON response had validation errors. Please fix and respond with ONLY the corrected JSON:

${issues}

Respond with valid JSON only, no markdown code fences or explanation.`
}

/**
 * Format a JSON parse error correction prompt.
 */
export function formatJsonErrorPrompt(content: string): string {
  return `Your response could not be parsed as JSON. Please respond with ONLY valid JSON, no markdown or explanation.

Your response was:
${content}`
}
