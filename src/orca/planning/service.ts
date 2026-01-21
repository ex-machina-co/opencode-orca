import * as Identifier from '../../common/identifier'
import { DraftPlan, type PlanStep, type PlanSummary, ProposalPlan, StoredPlan } from './schemas'
import { deletePlan, hasExecutions, listPlanIds, readPlan, writePlan } from './storage'

export interface PlanContent {
  goal: string
  summary?: string
  steps: PlanStep[]
  assumptions: string[]
  verification: string[]
  risks: string[]
}

export class PlanningService {
  constructor(private workingDir: string) {}

  // ==================== DRAFT OPERATIONS ====================

  async createDraft(sessionId: string, goal: string): Promise<DraftPlan> {
    const now = new Date().toISOString()
    const plan = DraftPlan.parse({
      plan_id: Identifier.generateID('plan'),
      planner_session_id: sessionId,
      created_at: now,
      updated_at: now,
      stage: 'draft',
      goal,
    })

    await writePlan(this.workingDir, plan)
    return plan
  }

  async setPlanAssumptions(planId: string, assumptions: string[]): Promise<DraftPlan> {
    const plan = await this.getDraftOrThrow(planId)

    const updated = DraftPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      assumptions,
    })

    await writePlan(this.workingDir, updated)
    return updated
  }

  async setPlanRisks(planId: string, risks: string[]): Promise<DraftPlan> {
    const plan = await this.getDraftOrThrow(planId)

    const updated = DraftPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      risks,
    })

    await writePlan(this.workingDir, updated)
    return updated
  }

  async setPlanVerification(planId: string, verification: string[]): Promise<DraftPlan> {
    const plan = await this.getDraftOrThrow(planId)

    const updated = DraftPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      verification,
    })

    await writePlan(this.workingDir, updated)
    return updated
  }

  async addStep(planId: string, step: PlanStep, position?: number): Promise<DraftPlan> {
    const plan = await this.getDraftOrThrow(planId)
    const steps = [...plan.steps]

    if (position !== undefined && position >= 0 && position <= steps.length) {
      steps.splice(position, 0, step)
    } else {
      steps.push(step)
    }

    const updated = DraftPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      steps,
    })

    await writePlan(this.workingDir, updated)
    return updated
  }

  async updateStep(planId: string, index: number, updates: Partial<PlanStep>): Promise<DraftPlan> {
    const plan = await this.getDraftOrThrow(planId)
    if (index < 0 || index >= plan.steps.length) {
      throw new Error(`Step index ${index} out of bounds (0-${plan.steps.length - 1})`)
    }

    const steps = [...plan.steps]
    steps[index] = { ...steps[index], ...updates }

    const updated = DraftPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      steps,
    })

    await writePlan(this.workingDir, updated)
    return updated
  }

  async removeStep(planId: string, index: number): Promise<DraftPlan> {
    const plan = await this.getDraftOrThrow(planId)
    if (index < 0 || index >= plan.steps.length) {
      throw new Error(`Step index ${index} out of bounds (0-${plan.steps.length - 1})`)
    }

    const steps = plan.steps.filter((_, i) => i !== index)

    const updated = DraftPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      steps,
    })

    await writePlan(this.workingDir, updated)
    return updated
  }

  async submit(planId: string, summary?: string): Promise<ProposalPlan> {
    const plan = await this.getDraftOrThrow(planId)

    const proposal = ProposalPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      stage: 'proposal',
      summary,
    })

    await writePlan(this.workingDir, proposal)
    return proposal
  }

  private async getDraftOrThrow(planId: string): Promise<DraftPlan> {
    const plan = await this.getPlan(planId)
    if (!plan) throw new Error(`Plan not found: ${planId}`)
    if (plan.stage !== 'draft') {
      throw new Error(`Plan ${planId} is not a draft (current stage: ${plan.stage})`)
    }
    return plan as DraftPlan
  }

  // ==================== PROPOSAL OPERATIONS ====================

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
      verification: content.verification,
      risks: content.risks,
    }

    // TODO: why do we have a proposal plan vs StoredPlan dichotomy?
    StoredPlan.parse(plan)
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

    const updated = StoredPlan.parse({
      ...plan,
      updated_at: new Date().toISOString(),
      stage: 'rejected',
      rejection_reason: reason,
    })

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
