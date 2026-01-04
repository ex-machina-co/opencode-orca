/**
 * JSONC (JSON with Comments) utilities
 * Uses comment-json to preserve comments when reading/writing
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parse, stringify } from 'comment-json'

export interface OpenCodeConfig {
  plugin?: string[]
  [key: string]: unknown
}

/**
 * Read a JSONC file, preserving comments
 * Returns the parsed object or null if file doesn't exist
 */
export function readJsonc<T = unknown>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return parse(content) as T
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to parse ${filePath}: ${err.message}`)
    }
    throw new Error(`Failed to parse ${filePath}`)
  }
}

/**
 * Write a JSONC file, preserving comments from the original object
 * The object should have been parsed with comment-json to preserve symbols
 */
export function writeJsonc(filePath: string, data: unknown): void {
  try {
    const content = stringify(data, null, 2)
    writeFileSync(filePath, `${content}\n`, 'utf-8')
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to write ${filePath}: ${err.message}`)
    }
    throw new Error(`Failed to write ${filePath}`)
  }
}

/**
 * Read a plain JSON file
 * Returns the parsed object or null if file doesn't exist
 */
export function readJson<T = unknown>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to parse ${filePath}: ${err.message}`)
    }
    throw new Error(`Failed to parse ${filePath}`)
  }
}

/**
 * Write a plain JSON file
 */
export function writeJson(filePath: string, data: unknown): void {
  try {
    const content = JSON.stringify(data, null, 2)
    writeFileSync(filePath, `${content}\n`, 'utf-8')
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to write ${filePath}: ${err.message}`)
    }
    throw new Error(`Failed to write ${filePath}`)
  }
}
