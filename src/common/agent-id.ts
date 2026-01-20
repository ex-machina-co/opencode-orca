import { z } from 'zod'

export const AgentId = z.string().min(1).describe('Non-empty unique string identifier for agents')
export type AgentId = z.infer<typeof AgentId>
