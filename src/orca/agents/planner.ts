import dedent from 'dedent'
import { extractFieldDocs, formatFieldDocsAsMarkdownList } from '../../common/schema-docs'
import type { AgentConfig } from '../../plugin/config'
import { SPECIALIST_LIST_PLACEHOLDER } from '../../plugin/constants'
import { Plan } from '../planning/schemas'

const planOutputDocs = formatFieldDocsAsMarkdownList(extractFieldDocs(Plan, { exclude: ['type'] }))

export const planner: AgentConfig = {
  mode: 'subagent',
  accepts: ['question'],
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
