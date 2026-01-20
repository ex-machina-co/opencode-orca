import { randomBytes } from 'node:crypto'
import z from 'zod'

// This is a simplified version of the OpenCode identifier generation logic.

const prefixes = {
  // same ones as in OpenCode
  session: 'ses',
  message: 'msg',
  permission: 'per',
  question: 'que',
  user: 'usr',
  part: 'prt',
  pty: 'pty',
  tool: 'tool',
  // ours
  plan: 'plan',
  exec: 'exec',
} as const

export type Prefix = keyof typeof prefixes

export function schema(prefix: Prefix, extraDescribe?: string) {
  const describeExtra = extraDescribe ? ` ${extraDescribe}` : ''

  return z
    .string()
    .startsWith(`${prefixes[prefix]}_`)
    .describe(`Unique ${prefix} identifier${describeExtra} (${prefixes[prefix]}_xxx format)`)
}

const LENGTH = 26

// State for monotonic ID generation
let lastTimestamp = 0
let counter = 0

export function generateID(prefix: Prefix): string {
  const currentTimestamp = Date.now()

  if (currentTimestamp !== lastTimestamp) {
    lastTimestamp = currentTimestamp
    counter = 0
  }
  counter++

  const now = BigInt(currentTimestamp) * BigInt(0x1000) + BigInt(counter)
  const timeBytes = Buffer.alloc(6)

  for (let i = 0; i < 6; i++) {
    timeBytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff))
  }

  return `${prefixes[prefix]}_${timeBytes.toString('hex')}${randomBase62(LENGTH - 12)}`
}

function randomBase62(length: number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let result = ''
  const bytes = randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % 62]
  }
  return result
}

export function extractTimestamp(id: string): number {
  const prefix = id.split('_')[0]
  const hex = id.slice(prefix.length + 1, prefix.length + 13)
  const encoded = BigInt(`0x${hex}`)
  return Number(encoded / BigInt(0x1000))
}
