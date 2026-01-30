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

export interface LoggerClients {
  client: OpencodeClient
  clientNext: OpencodeClientV2
}

function createLogger(clients: LoggerClients): Logger {
  const { client, clientNext } = clients

  const log = (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    extra?: Record<string, unknown>,
  ): void => {
    clientNext.app
      .log({
        service: SERVICE_NAME,
        level,
        message,
        extra,
      })
      .catch(() => {})
  }

  return {
    debug: (message, extra) => log('debug', message, extra),
    info: (message, extra) => log('info', message, extra),
    warn: (message, extra) => log('warn', message, extra),
    error: (message, extra) => {
      log('error', message, extra)
      clientNext.tui
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

export function initLogger(clients?: LoggerClients): Logger {
  globalLogger = clients ? createLogger(clients) : noopLogger
  return globalLogger
}

export function getLogger(): Logger {
  return globalLogger
}
