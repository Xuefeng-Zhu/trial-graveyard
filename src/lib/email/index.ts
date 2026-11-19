import { createMockProvider } from './providers/mock';
import type { EmailProvider } from './types';

export type {
  Candidate,
  CandidateFields,
  EmailMessage,
  EmailProvider,
  ScanProgress,
  SearchOptions,
} from './types';
export { scanEmails, analyzeMessage, candidateKey, MIN_CONFIDENCE } from './scanner';
export { createMockProvider, ConsentDeniedError } from './providers/mock';
export type { MockProviderOptions } from './providers/mock';

/** Registered providers. Gmail and Outlook are planned, see providers/README.md. */
export const PROVIDERS: EmailProvider[] = [createMockProvider()];
