import type { OpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient as OpencodeClientV2 } from '@opencode-ai/sdk/v2'

export interface Logger {
  debug(message: string, extra?: Record<string, unknown>): void
  info(message: string, extra?: Record<string, unknown>): void
  warn(message: string, extra?: Record<string, unknown>): void
  error(message: string, extra?: Record<string, unknown>): void
}

const SERVICE_NAME = 'opencode-orca'

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

function createLogger(client: OpencodeClientV2): Logger {
  const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string, extra?: Record<string, unknown>): void => {
    client.app
      .log({
        service: SERVICE_NAME,
        level,
        message,
        extra,
      })
      // Fire-and-forget: logging must never block agent execution.
      // Errors are intentionally swallowed to prevent any interruption.
      .catch(() => {})
  }

  return {
    debug: (message, extra) => log('debug', message, extra),
    info: (message, extra) => log('info', message, extra),
    warn: (message, extra) => log('warn', message, extra),
    error: (message, extra) => {
      log('error', message, extra)
      client.tui
        .showToast({
          title: 'Orca Error',
          message,
          variant: 'error',
          duration: 10_000,
        })
        .catch(() => {})
    },
  }
}

let globalLogger: Logger = noopLogger

export function initLogger(client?: OpencodeClientV2): Logger {
  globalLogger = client ? createLogger(client) : noopLogger
  return globalLogger
}

export function getLogger(): Logger {
  return globalLogger
}
