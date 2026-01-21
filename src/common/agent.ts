import { z } from 'zod'

export const AgentId = z.string().min(1).describe('Non-empty unique string identifier for agents')
export type AgentId = z.infer<typeof AgentId>

export const AgentType = z.enum(['orca', 'planner', 'specialist'])
export type AgentType = z.infer<typeof AgentType>
