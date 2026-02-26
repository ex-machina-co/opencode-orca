import * as fs from 'node:fs'
import * as path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod Schemas — ported verbatim from @fission-ai/openspec for compatibility.
// Non-strict z.object() so additive upstream fields don't break us.
// ---------------------------------------------------------------------------

export const ArtifactSchema = z.object({
  id: z.string().min(1, { error: 'Artifact ID is required' }),
  generates: z.string().min(1, { error: 'generates field is required' }),
  description: z.string(),
  template: z.string().min(1, { error: 'template field is required' }),
  instruction: z.string().optional(),
  requires: z.array(z.string()).default([]),
})
export type ArtifactSchema = z.infer<typeof ArtifactSchema>

export const ApplyPhaseSchema = z.object({
  requires: z.array(z.string()).min(1, { error: 'At least one required artifact' }),
  tracks: z.string().nullable().optional(),
  instruction: z.string().optional(),
})
export type ApplyPhaseSchema = z.infer<typeof ApplyPhaseSchema>

export const SchemaYamlSchema = z.object({
  name: z.string().min(1, { error: 'Schema name is required' }),
  version: z.number().int().positive({ error: 'Version must be a positive integer' }),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1, { error: 'At least one artifact required' }),
  apply: ApplyPhaseSchema.optional(),
})
export type SchemaYamlSchema = z.infer<typeof SchemaYamlSchema>

export const ChangeMetadataSchema = z.object({
  schema: z.string().min(1, { message: 'schema is required' }),
  created: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'created must be YYYY-MM-DD format',
    })
    .optional(),
})
export type ChangeMetadataSchema = z.infer<typeof ChangeMetadataSchema>

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaValidationError'
  }
}

export class SchemaLoadError extends Error {
  readonly schemaPath?: string
  constructor(message: string, options?: { cause?: unknown; schemaPath?: string }) {
    super(message, { cause: options?.cause })
    this.name = 'SchemaLoadError'
    this.schemaPath = options?.schemaPath
  }
}

// ---------------------------------------------------------------------------
// Schema Parsing
// ---------------------------------------------------------------------------

export function parseSchema(yamlContent: string): SchemaYamlSchema {
  const parsed = parseYaml(yamlContent)
  const result = SchemaYamlSchema.safeParse(parsed)
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new SchemaValidationError(`Invalid schema: ${errors}`)
  }
  const schema = result.data
  validateNoDuplicateIds(schema.artifacts)
  validateRequiresReferences(schema.artifacts)
  validateNoCycles(schema.artifacts)
  return schema
}

export function loadSchema(filePath: string): SchemaYamlSchema {
  const content = fs.readFileSync(filePath, 'utf-8')
  return parseSchema(content)
}

// ---------------------------------------------------------------------------
// Change Metadata Parsing
// ---------------------------------------------------------------------------

export function parseChangeMetadata(yamlContent: string): ChangeMetadataSchema {
  const parsed = parseYaml(yamlContent)
  const result = ChangeMetadataSchema.safeParse(parsed)
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new SchemaValidationError(`Invalid change metadata: ${errors}`)
  }
  return result.data
}

export function loadChangeMetadata(changeDir: string): ChangeMetadataSchema {
  const metadataPath = path.join(changeDir, '.openspec.yaml')
  if (!fs.existsSync(metadataPath)) {
    throw new SchemaLoadError(`Change directory is missing its metadata file: ${metadataPath}`, {
      schemaPath: metadataPath,
    })
  }
  const content = fs.readFileSync(metadataPath, 'utf-8')
  try {
    return parseChangeMetadata(content)
  } catch (error) {
    throw new SchemaLoadError(`Failed to parse change metadata: ${metadataPath}`, {
      cause: error,
      schemaPath: metadataPath,
    })
  }
}

// ---------------------------------------------------------------------------
// Schema Resolution — 2-tier: project → package
// ---------------------------------------------------------------------------

function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'schemas')
}

function getPackageSchemasDir(): string | undefined {
  try {
    const openspecMain = require.resolve('@fission-ai/openspec')
    const packageRoot = path.dirname(path.dirname(openspecMain))
    const schemasDir = path.join(packageRoot, 'schemas')
    if (fs.existsSync(schemasDir)) {
      return schemasDir
    }
  } catch {
    // Package not installed — no built-in schemas available
  }
  return undefined
}

function getSchemaFilePath(schemasDir: string, name: string): string {
  return path.join(schemasDir, name, 'schema.yaml')
}

export function resolveSchema(name: string, projectRoot: string): { schema: SchemaYamlSchema; schemaDir: string } {
  const cleanName = name.replace(/\.ya?ml$/, '')

  const projectSchemaFile = getSchemaFilePath(getProjectSchemasDir(projectRoot), cleanName)
  if (fs.existsSync(projectSchemaFile)) {
    try {
      return {
        schema: loadSchema(projectSchemaFile),
        schemaDir: path.dirname(projectSchemaFile),
      }
    } catch (error) {
      throw new SchemaLoadError(`Failed to load project schema '${cleanName}': ${projectSchemaFile}`, {
        cause: error,
        schemaPath: projectSchemaFile,
      })
    }
  }

  const packageSchemasDir = getPackageSchemasDir()
  if (packageSchemasDir) {
    const packageSchemaFile = getSchemaFilePath(packageSchemasDir, cleanName)
    if (fs.existsSync(packageSchemaFile)) {
      try {
        return {
          schema: loadSchema(packageSchemaFile),
          schemaDir: path.dirname(packageSchemaFile),
        }
      } catch (error) {
        throw new SchemaLoadError(`Failed to load built-in schema '${cleanName}': ${packageSchemaFile}`, {
          cause: error,
          schemaPath: packageSchemaFile,
        })
      }
    }
  }

  const searched = [getProjectSchemasDir(projectRoot)]
  if (packageSchemasDir) searched.push(packageSchemasDir)
  throw new SchemaLoadError(`Schema '${cleanName}' not found. Searched: ${searched.join(', ')}`)
}

// ---------------------------------------------------------------------------
// Schema Listing
// ---------------------------------------------------------------------------

export type SchemaListEntry = {
  name: string
  dir: string
  source: 'project' | 'package'
}

export function listSchemas(projectRoot: string): SchemaListEntry[] {
  const entries = new Map<string, SchemaListEntry>()

  const projectSchemasDir = getProjectSchemasDir(projectRoot)
  scanSchemasDir(projectSchemasDir, 'project', entries)

  const packageSchemasDir = getPackageSchemasDir()
  if (packageSchemasDir) {
    scanSchemasDir(packageSchemasDir, 'package', entries)
  }

  return Array.from(entries.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function scanSchemasDir(
  schemasDir: string,
  source: 'project' | 'package',
  entries: Map<string, SchemaListEntry>,
): void {
  if (!fs.existsSync(schemasDir)) return
  const dirs = fs.readdirSync(schemasDir, { withFileTypes: true })
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue
    const schemaFile = path.join(schemasDir, dirent.name, 'schema.yaml')
    if (!fs.existsSync(schemaFile)) continue
    // Project entries are added first; don't overwrite with package entries
    if (!entries.has(dirent.name)) {
      entries.set(dirent.name, {
        name: dirent.name,
        dir: path.join(schemasDir, dirent.name),
        source,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Internal Validators
// ---------------------------------------------------------------------------

function validateNoDuplicateIds(artifacts: ArtifactSchema[]): void {
  const seen = new Set<string>()
  for (const artifact of artifacts) {
    if (seen.has(artifact.id)) {
      throw new SchemaValidationError(`Duplicate artifact ID: '${artifact.id}'`)
    }
    seen.add(artifact.id)
  }
}

function validateRequiresReferences(artifacts: ArtifactSchema[]): void {
  const ids = new Set(artifacts.map((a) => a.id))
  for (const artifact of artifacts) {
    for (const req of artifact.requires) {
      if (!ids.has(req)) {
        throw new SchemaValidationError(`Artifact '${artifact.id}' requires unknown artifact '${req}'`)
      }
    }
  }
}

function validateNoCycles(artifacts: ArtifactSchema[]): void {
  const adjMap = new Map<string, string[]>()
  for (const artifact of artifacts) {
    adjMap.set(artifact.id, artifact.requires)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const parent = new Map<string, string>()

  function dfs(nodeId: string): void {
    visited.add(nodeId)
    inStack.add(nodeId)

    for (const dep of adjMap.get(nodeId) ?? []) {
      if (inStack.has(dep)) {
        const cycle = reconstructCycle(dep, nodeId, parent)
        throw new SchemaValidationError(`Dependency cycle detected: ${cycle}`)
      }
      if (!visited.has(dep)) {
        parent.set(dep, nodeId)
        dfs(dep)
      }
    }

    inStack.delete(nodeId)
  }

  for (const artifact of artifacts) {
    if (!visited.has(artifact.id)) {
      dfs(artifact.id)
    }
  }
}

function reconstructCycle(cycleStart: string, cycleEnd: string, parentMap: Map<string, string>): string {
  const cyclePath: string[] = [cycleStart]
  let current = cycleEnd
  while (current !== cycleStart) {
    cyclePath.push(current)
    const next = parentMap.get(current)
    if (next === undefined) break
    current = next
  }
  cyclePath.push(cycleStart)
  return cyclePath.reverse().join(' -> ')
}
