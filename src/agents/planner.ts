import dedent from 'dedent'
import type { AgentConfig } from '../plugin/config'
import { SPECIALIST_LIST_PLACEHOLDER } from '../plugin/constants'
import { extractFieldDocs, formatFieldDocsAsMarkdownList } from '../schemas/jsonschema'
import { PlanFieldsSchema } from '../schemas/payloads'

/**
 * Generate the "Your output should include" section from PlanFieldsSchema.
 * This ensures the prompt stays in sync with the schema definition.
 */
function generatePlanOutputDocs(): string {
  const docs = extractFieldDocs(PlanFieldsSchema, { exclude: ['agent_id'] })
  return formatFieldDocsAsMarkdownList(docs)
}

// Generate once at module load time
const planOutputDocs = generatePlanOutputDocs()

export const planner: AgentConfig = {
  mode: 'subagent',
  specialist: true,
  responseTypes: ['plan', 'answer', 'question', 'failure'],
  description: 'Plans complex multi-step tasks with detailed execution steps',
  prompt: dedent`
    You are a strategic planning agent. Your role is to analyze complex requests and produce detailed, actionable plans.

    ## Available Specialists
    
    You may ONLY assign steps to the following specialists:
    ${SPECIALIST_LIST_PLACEHOLDER}
    
    Do NOT reference agents outside this list - they are not available.

    Your output should include:
    ${planOutputDocs}
    
    Guidelines:
    - Research before planning - understand the codebase first
    - Be specific - "modify function X in file Y" not "update the code"
    - Include verification steps in the plan
    - Flag anything requiring human decision as a blocker
    - Plans should be executable by other agents without ambiguity
  `,
  color: '#8B5CF6', // Purple
}
