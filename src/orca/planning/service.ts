import * as Identifier from '../../common/identifier'
import type { PlanStep, PlanSummary, ProposalPlan, StoredPlan } from './schemas'
import { StoredPlan as StoredPlanSchema } from './schemas'
import { deletePlan, hasExecutions, listPlanIds, readPlan, writePlan } from './storage'

export interface PlanContent {
  goal: string
  summary?: string
  steps: PlanStep[]
  assumptions: string[]
  files_touched: string[]
  verification: string[]
  risks: string[]
}

export class PlanningService {
  constructor(private workingDir: string) {}

  async createProposal(sessionId: string, content: PlanContent): Promise<ProposalPlan> {
    const now = new Date().toISOString()
    const plan: ProposalPlan = {
      plan_id: Identifier.generateID('plan'),
      planner_session_id: sessionId,
      created_at: now,
      updated_at: now,
      stage: 'proposal',
      goal: content.goal,
      summary: content.summary,
      steps: content.steps,
      assumptions: content.assumptions,
      files_touched: content.files_touched,
      verification: content.verification,
      risks: content.risks,
    }

    StoredPlanSchema.parse(plan)
    await writePlan(this.workingDir, plan)
    return plan
  }

  async revise(planId: string, content: PlanContent): Promise<ProposalPlan> {
    const plan = await this.getPlanOrThrow(planId)
    if (plan.stage !== 'proposal') {
      throw new Error(`Cannot revise plan in stage: ${plan.stage}`)
    }

    const updated: ProposalPlan = {
      ...plan,
      updated_at: new Date().toISOString(),
      stage: 'proposal',
      goal: content.goal,
      summary: content.summary,
      steps: content.steps,
      assumptions: content.assumptions,
      files_touched: content.files_touched,
      verification: content.verification,
      risks: content.risks,
    }

    await writePlan(this.workingDir, updated)
    return updated
  }

  async approve(planId: string): Promise<StoredPlan> {
    const plan = await this.getPlanOrThrow(planId)
    if (plan.stage !== 'proposal') {
      throw new Error(`Cannot approve plan in stage: ${plan.stage}`)
    }

    const updated: StoredPlan = {
      ...plan,
      updated_at: new Date().toISOString(),
      stage: 'approved',
    }

    await writePlan(this.workingDir, updated)
    return updated
  }

  async reject(planId: string, reason?: string): Promise<StoredPlan> {
    const plan = await this.getPlanOrThrow(planId)
    if (plan.stage !== 'proposal') {
      throw new Error(`Cannot reject plan in stage: ${plan.stage}`)
    }

    const updated: StoredPlan = {
      ...plan,
      updated_at: new Date().toISOString(),
      stage: 'rejected',
      rejection_reason: reason,
    }

    await writePlan(this.workingDir, updated)
    return updated
  }

  async getPlan(planId: string): Promise<StoredPlan | null> {
    return readPlan(this.workingDir, planId)
  }

  async getPlanOrThrow(planId: string): Promise<StoredPlan> {
    const plan = await this.getPlan(planId)
    if (!plan) throw new Error(`Plan not found: ${planId}`)
    return plan
  }

  async listPlans(): Promise<PlanSummary[]> {
    const planIds = await listPlanIds(this.workingDir)
    const summaries: PlanSummary[] = []

    for (const planId of planIds) {
      const plan = await readPlan(this.workingDir, planId)
      if (!plan) continue

      summaries.push({
        plan_id: plan.plan_id,
        goal: plan.goal,
        stage: plan.stage,
        created_at: plan.created_at,
        step_count: plan.steps.length,
        has_executions: await hasExecutions(this.workingDir, planId),
      })
    }

    // IDs encode timestamps, lexical sort = chronological (most recent first)
    return summaries.sort((a, b) => b.plan_id.localeCompare(a.plan_id))
  }

  async removePlan(planId: string): Promise<void> {
    await deletePlan(this.workingDir, planId)
  }
}
