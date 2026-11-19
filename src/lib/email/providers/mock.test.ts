import { describe, expect, it } from 'vitest';
import { ConsentDeniedError, createMockProvider } from './mock';
import { buildFixtures } from './fixtures';
import type { EmailMessage } from '../types';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const make = (confirm?: () => Promise<boolean>) => createMockProvider({ delayMs: 0, now: () => NOW, confirm });
const SINCE = new Date(NOW.getTime() - 60 * 86_400_000);

async function collect(it: AsyncIterable<EmailMessage>): Promise<EmailMessage[]> {
  const out: EmailMessage[] = [];
  for await (const m of it) out.push(m);
  return out;
}

describe('mock provider', () => {
  it('has the expected identity', () => {
    const p = make();
    expect(p.id).toBe('mock');
    expect(p.label).toBe('Haunted Demo Inbox');
  });

  it('connects after consent and disconnects', async () => {
    const p = make();
    expect(p.isConnected()).toBe(false);
    await p.connect();
    expect(p.isConnected()).toBe(true);
    await p.disconnect();
    expect(p.isConnected()).toBe(false);
  });

  it('rejects connect when consent is declined', async () => {
    const p = make(() => Promise.resolve(false));
    await expect(p.connect()).rejects.toBeInstanceOf(ConsentDeniedError);
    expect(p.isConnected()).toBe(false);
  });

  it('rejects search when not connected', async () => {
    await expect(collect(make().searchReceipts({ since: SINCE }))).rejects.toThrow(/not connected/i);
  });

  it('streams about 12 emails with the required mix', async () => {
    const p = make();
    await p.connect();
    const msgs = await collect(p.searchReceipts({ since: SINCE }));
    expect(msgs).toHaveLength(13);
    const text = msgs.map((m) => `${m.subject} ${m.text}`).join('\n');
    for (const s of ['Disney+', 'Spotify Premium', 'Adobe Creative Cloud', 'Duolingo Max', 'New York Times', 'Peloton', 'ChatGPT Plus', 'Audible']) {
      expect(text).toContain(s);
    }
    expect(msgs.filter((m) => /renews on/i.test(m.subject))).toHaveLength(2);
    expect(msgs.filter((m) => /shipped|newsletter|password/i.test(m.subject))).toHaveLength(3);
    expect(new Set(msgs.map((m) => m.id)).size).toBe(msgs.length);
  });

  it('omits emails older than since', async () => {
    const p = make();
    await p.connect();
    const since = new Date(NOW.getTime() - 10 * 86_400_000);
    const msgs = await collect(p.searchReceipts({ since }));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.length).toBeLessThan(13);
    expect(msgs.every((m) => new Date(m.date) >= since)).toBe(true);
  });

  it('stops streaming after disconnect', async () => {
    const p = make();
    await p.connect();
    const out: EmailMessage[] = [];
    for await (const m of p.searchReceipts({ since: SINCE })) {
      out.push(m);
      await p.disconnect();
    }
    expect(out).toHaveLength(1);
  });

  it('waits for the injected delay and uses the real clock by default', async () => {
    const p = createMockProvider({ delayMs: 1 });
    await p.connect();
    const msgs = await collect(p.searchReceipts({ since: new Date(Date.now() - 30 * 86_400_000) }));
    expect(msgs).toHaveLength(13);
  });

  it('dates are relative to now: emails in the past, charge dates in the future', () => {
    const msgs = buildFixtures(NOW);
    for (const m of msgs) {
      const ago = (NOW.getTime() - new Date(m.date).getTime()) / 86_400_000;
      expect(ago).toBeGreaterThanOrEqual(1);
      expect(ago).toBeLessThanOrEqual(20);
    }
    const later = new Date(NOW.getTime() + 100 * 86_400_000);
    expect(buildFixtures(later)[0]!.text).not.toBe(buildFixtures(NOW)[0]!.text);
  });
});
