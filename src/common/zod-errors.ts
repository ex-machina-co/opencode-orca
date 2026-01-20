import type { ZodError } from 'zod'

export function formatZodErrors(error: ZodError): string {
  const issues = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
      return `- ${path}: ${issue.message}`
    })
    .join('\n')

  return `Validation failed:\n${issues}\n\nPlease correct the format and try again.`
}
