export type { EmailMessage, EmailProvider, Candidate, ScanProgress } from './types'
export { scanEmails } from './scanner'
import { createMockProvider } from './providers/mock'

export const demoInbox = (now: Date, confirmed: boolean, delayMs?: number) =>
  createMockProvider({ now, confirm: () => confirmed, delayMs })
