import { mock, spyOn } from 'bun:test'
import type { Logger } from '../log'
import * as logModule from '../log'

export type MockLogger = {
  [K in keyof Logger]: ReturnType<typeof mock<Logger[K]>>
}

export function mockLogger(): MockLogger {
  const mockLog: MockLogger = {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  }
  spyOn(logModule, 'getLogger').mockReturnValue(mockLog)
  return mockLog
}
