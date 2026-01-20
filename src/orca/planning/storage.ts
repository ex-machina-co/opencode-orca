import { exists, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type StoredPlan, StoredPlan as StoredPlanSchema } from './schemas'

export const PLANS_DIR = '.opencode/plans'

function isNotFound(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === 'ENOENT'
}

export function getPlanPath(workingDir: string, planId: string): string {
  return join(workingDir, PLANS_DIR, `${planId}.json`)
}

export function getExecutionsDir(workingDir: string, planId: string): string {
  return join(workingDir, PLANS_DIR, planId)
}

export async function ensurePlansDir(workingDir: string): Promise<void> {
  const dir = join(workingDir, PLANS_DIR)
  await mkdir(dir, { recursive: true })
}

export async function readPlan(workingDir: string, planId: string): Promise<StoredPlan | null> {
  const path = getPlanPath(workingDir, planId)
  try {
    const content = await readFile(path, 'utf-8')
    return StoredPlanSchema.parse(JSON.parse(content))
  } catch (err) {
    if (isNotFound(err)) return null
    throw new Error(`Failed to read plan at ${path}: ${err}`)
  }
}

export async function writePlan(workingDir: string, plan: StoredPlan): Promise<void> {
  await ensurePlansDir(workingDir)
  const path = getPlanPath(workingDir, plan.plan_id)
  await writeFile(path, JSON.stringify(plan, null, 2), 'utf-8')
}

export async function deletePlan(workingDir: string, planId: string): Promise<void> {
  const planPath = getPlanPath(workingDir, planId)
  const execDir = getExecutionsDir(workingDir, planId)

  await rm(planPath, { force: true })
  await rm(execDir, { recursive: true, force: true })
}

export async function listPlanIds(workingDir: string): Promise<string[]> {
  const dir = join(workingDir, PLANS_DIR)
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => e.name.replace('.json', ''))
  } catch (err) {
    if (isNotFound(err)) return []
    throw err
  }
}

export async function hasExecutions(workingDir: string, planId: string): Promise<boolean> {
  const execDir = getExecutionsDir(workingDir, planId)
  return exists(execDir)
}
