import type { Cadence } from '../../domain/trial';

/** `date` is an ISO 8601 string. */
export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  text: string;
}

export interface SearchOptions {
  since: Date;
}

export interface EmailProvider {
  readonly id: string;
  readonly label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  /** Rejects when the provider is not connected. */
  searchReceipts(opts: SearchOptions): AsyncIterable<EmailMessage>;
}

export interface CandidateFields {
  name: string;
  priceCents?: number;
  currency?: string;
  cadence?: Cadence;
  /** Local ISO datetime, always present. */
  chargeDate: string;
  cancelUrl?: string;
}

/** A possible trial found in an email. Never holds the full email body. */
export interface Candidate {
  /** Lowercased service name + `|` + charge day (YYYY-MM-DD). */
  key: string;
  messageId: string;
  fields: CandidateFields;
  /** 0..1 */
  confidence: number;
  /** Up to 160 characters around the charge sentence. */
  snippet: string;
  /** For example `subject:trial` or `sender:phantomflix.example`. */
  signals: string[];
}

export interface ScanProgress {
  read: number;
  found: number;
}
