import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getExecutionsDir } from '../planning/storage'
import { type PlanExecution, PlanExecution as PlanExecutionSchema } from './schemas'

function isNotFound(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === 'ENOENT'
}

export function getExecutionPath(workingDir: string, planId: string, executionId: string): string {
  return join(getExecutionsDir(workingDir, planId), `${executionId}.json`)
}

export async function ensureExecutionsDir(workingDir: string, planId: string): Promise<void> {
  const dir = getExecutionsDir(workingDir, planId)
  await mkdir(dir, { recursive: true })
}

export async function readExecution(
  workingDir: string,
  planId: string,
  executionId: string,
): Promise<PlanExecution | null> {
  const path = getExecutionPath(workingDir, planId, executionId)
  try {
    const content = await readFile(path, 'utf-8')
    return PlanExecutionSchema.parse(JSON.parse(content))
  } catch (err) {
    if (isNotFound(err)) return null
    throw new Error(`Failed to read execution at ${path}: ${err}`)
  }
}

export async function writeExecution(workingDir: string, planId: string, execution: PlanExecution): Promise<void> {
  await ensureExecutionsDir(workingDir, planId)
  const path = getExecutionPath(workingDir, planId, execution.execution_id)
  await writeFile(path, JSON.stringify(execution, null, 2), 'utf-8')
}

export async function listExecutionIds(workingDir: string, planId: string): Promise<string[]> {
  const dir = getExecutionsDir(workingDir, planId)
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name.replace('.json', ''))
  } catch (err) {
    if (isNotFound(err)) return []
    throw err
  }
}

export async function getLatestExecutionId(workingDir: string, planId: string): Promise<string | null> {
  const ids = await listExecutionIds(workingDir, planId)
  if (ids.length === 0) return null

  // IDs encode timestamps, lexical sort = chronological
  const sorted = ids.sort()
  return sorted[sorted.length - 1]
}
