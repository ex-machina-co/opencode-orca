/**
 * Console output utilities with colored formatting
 */

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
} as const

/**
 * Print a success message (green)
 */
export function success(message: string): void {
  console.log(`${COLORS.green}${message}${COLORS.reset}`)
}

/**
 * Print an error message (red)
 */
export function error(message: string): void {
  console.error(`${COLORS.red}Error: ${message}${COLORS.reset}`)
}

/**
 * Print a warning message (yellow)
 */
export function warn(message: string): void {
  console.warn(`${COLORS.yellow}Warning: ${message}${COLORS.reset}`)
}

/**
 * Print an info message (blue)
 */
export function info(message: string): void {
  console.log(`${COLORS.blue}${message}${COLORS.reset}`)
}

/**
 * Print a debug message (gray)
 */
export function debug(message: string): void {
  console.log(`${COLORS.gray}${message}${COLORS.reset}`)
}

/**
 * Print a plain message (no color)
 */
export function log(message: string): void {
  console.log(message)
}
