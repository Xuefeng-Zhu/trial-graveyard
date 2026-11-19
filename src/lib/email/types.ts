import type { TrialInput } from '../../domain/trial'

export interface EmailMessage { id: string; from: string; subject: string; date: string; text: string }
export interface EmailProvider {
  readonly id: string
  readonly label: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  searchReceipts(options: { since: Date }): AsyncIterable<EmailMessage>
}

export interface Candidate {
  key: string
  messageId: string
  fields: TrialInput
  confidence: number
  snippet: string
  signals: string[]
}

export interface ScanProgress { read: number; found: number }
