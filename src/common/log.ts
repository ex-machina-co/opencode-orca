export interface Logger {
  debug(message: string, extra?: Record<string, unknown>): void
  info(message: string, extra?: Record<string, unknown>): void
  warn(message: string, extra?: Record<string, unknown>): void
  error(message: string, extra?: Record<string, unknown>): void
}

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

let globalLogger: Logger = noopLogger

export function initLogger(): Logger {
  // No-op for now - logging was causing interruptions
  globalLogger = noopLogger
  return globalLogger
}

export function getLogger(): Logger {
  return globalLogger
}
