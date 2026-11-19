import { buildFixtures } from './fixtures'
import type { EmailProvider } from '../types'

export class ConsentDeniedError extends Error {
  constructor() { super('Demo inbox consent declined.') }
}

export function createMockProvider({ delayMs = 220, now, confirm }: {
  delayMs?: number; now: Date; confirm: () => Promise<boolean> | boolean;
}): EmailProvider {
  let connected = false
  let generation = 0
  return {
    id: 'mock', label: 'Haunted Demo Inbox',
    async connect() {
      const session = ++generation
      if (!await confirm()) throw new ConsentDeniedError()
      if (session === generation) connected = true
    },
    async disconnect() { connected = false; generation++ },
    isConnected: () => connected,
    async *searchReceipts({ since }) {
      if (!connected) throw new Error('Connect to the demo inbox first.')
      const session = generation
      for (const message of buildFixtures(now)) {
        if (Date.parse(message.date) < +since) continue
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs))
        if (session !== generation) return
        yield message
      }
    },
  }
}
