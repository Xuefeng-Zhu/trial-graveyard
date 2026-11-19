import type { EmailMessage, EmailProvider, SearchOptions } from '../types';
import { buildFixtures } from './fixtures';

export class ConsentDeniedError extends Error {
  constructor() {
    super('Consent was declined. The spirits stay silent.');
    this.name = 'ConsentDeniedError';
  }
}

export interface MockProviderOptions {
  /** Delay before each streamed email. Default 250. Tests pass 0. */
  delayMs?: number;
  /** "Now" for fixture dates. Default: the current time at each search. */
  now?: () => Date;
  /** Fake consent step. The UI shows a dialog and resolves with the choice. Default accepts. */
  confirm?: () => Promise<boolean>;
}

const wait = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/** "Haunted Demo Inbox": in-memory provider with relative-date fixtures. No network. */
export function createMockProvider(options: MockProviderOptions = {}): EmailProvider {
  const delayMs = options.delayMs ?? 250;
  const now = options.now ?? (() => new Date());
  const confirm = options.confirm ?? (() => Promise.resolve(true));
  let connected = false;

  return {
    id: 'mock',
    label: 'Haunted Demo Inbox',
    async connect() {
      if (!(await confirm())) throw new ConsentDeniedError();
      connected = true;
    },
    disconnect() {
      connected = false;
      return Promise.resolve();
    },
    isConnected: () => connected,
    searchReceipts({ since }: SearchOptions): AsyncIterable<EmailMessage> {
      return {
        [Symbol.asyncIterator]: async function* () {
          if (!connected) throw new Error('Not connected. Connect the inbox before searching.');
          for (const msg of buildFixtures(now())) {
            if (new Date(msg.date).getTime() < since.getTime()) continue;
            await wait(delayMs);
            if (!connected) return;
            yield msg;
          }
        },
      };
    },
  };
}
