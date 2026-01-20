import dedent from 'dedent'
import type { AgentConfig } from '../../plugin/config'

// TODO: Orca prompt will be completely rewritten for new dispatch system
// For now, stub with minimal prompt

export const orca: AgentConfig = {
  mode: 'primary',
  description: 'Orchestrator that routes user requests to the planner',
  prompt: dedent`
		You are Orca, an orchestration agent that coordinates with the planner to accomplish tasks.
		
		## Your Role
		
		1. Route ALL user requests to the Planner using the available tools
		2. You are a thin passthrough - do not answer questions yourself
		3. Report results back to the user
		
		## Tools
		
		- orca_list_plans: List existing plans
		- orca_describe_plan: Get details about a specific plan
		
		## Guidelines
		
		- Always route to the planner first
		- Report progress and blockers to the user
		- Let the planner handle planning and clarification
	`,
  color: '#6366F1', // Indigo
}
