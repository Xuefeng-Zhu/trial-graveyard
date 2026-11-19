import { describe, expect, it } from 'vitest';
import { scanEmails, analyzeMessage, candidateKey } from './scanner';
import { createMockProvider } from './providers/mock';
import { domainLabel, knownService, senderDomain } from './signals';
import { graveWith } from '../../domain/arbitraries';
import type { EmailMessage } from './types';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const SINCE = new Date(NOW.getTime() - 60 * 86_400_000);

async function* stream(msgs: EmailMessage[]): AsyncGenerator<EmailMessage> {
  for (const m of msgs) yield m;
}

async function mockMessages(): Promise<EmailMessage[]> {
  const p = createMockProvider({ delayMs: 0, now: () => NOW });
  await p.connect();
  const out: EmailMessage[] = [];
  for await (const m of p.searchReceipts({ since: SINCE })) out.push(m);
  return out;
}

const msg = (over: Partial<EmailMessage> = {}): EmailMessage => ({
  id: 'm1',
  from: 'Acme <hi@acme.example>',
  subject: 'Your Acme trial',
  date: NOW.toISOString(),
  text: 'Your Acme free trial ends on 2026-10-20. After that you will be charged $9.99 per month.',
  ...over,
});

describe('scanEmails on the mock inbox', () => {
  it('finds the 8 trials and 2 renewals and no distractors', async () => {
    const progress: Array<{ read: number; found: number }> = [];
    const found = await scanEmails(stream(await mockMessages()), [], NOW, (p) => progress.push(p));
    const names = found.map((c) => c.fields.name);
    expect(found).toHaveLength(10);
    for (const n of ['Phantomflix', 'Wraithwave Premium', 'Cryptic Cloud', 'Hexlingo Max', 'Spectral Fitness', 'Ghoul GPT Pro', 'Necro Audiobooks Plus', 'Banshee Box Plus', 'Crypt Drive+']) {
      expect(names).toContain(n);
    }
    expect(names.some((n) => /grimoire\+/i.test(n))).toBe(true);
    expect(found.map((c) => c.messageId).filter((id) => /ship|newsletter|password/.test(id))).toEqual([]);
    expect(progress).toHaveLength(13);
    expect(progress.at(-1)).toEqual({ read: 13, found: 10 });
  });

  it('extracts price, cadence and charge date, and never keeps the full body', async () => {
    const found = await scanEmails(stream(await mockMessages()), [], NOW);
    const phantom = found.find((c) => c.fields.name === 'Phantomflix')!;
    expect(phantom.fields.priceCents).toBe(1399);
    expect(phantom.fields.cadence).toBe('monthly');
    expect(phantom.fields.currency).toBe('USD');
    expect(phantom.fields.chargeDate.slice(0, 10)).toBe('2026-10-04');
    expect(phantom.fields.cancelUrl).toContain('phantomflix.example');
    expect(phantom.snippet.length).toBeLessThanOrEqual(160);
    expect(phantom.confidence).toBeGreaterThan(0.8);
    expect(phantom.signals).toContain('sender:mail.phantomflix.example');
    expect(found.map((c) => c.fields.chargeDate)).toEqual([...found.map((c) => c.fields.chargeDate)].sort());
  });

  it('skips trials that already have a grave (same service and day)', async () => {
    const grave = graveWith({ name: 'phantomflix', chargeAt: '2026-10-04T09:00:00.000Z' });
    const found = await scanEmails(stream(await mockMessages()), [grave], NOW);
    expect(found).toHaveLength(9);
    expect(found.map((c) => c.fields.name)).not.toContain('Phantomflix');
  });

  it('keeps a trial when the grave has a different charge day', async () => {
    const grave = graveWith({ name: 'Phantomflix', chargeAt: '2026-10-05T09:00:00.000Z' });
    expect(await scanEmails(stream(await mockMessages()), [grave], NOW)).toHaveLength(10);
  });
});

describe('scanEmails details', () => {
  it('collapses repeated emails and keeps the higher confidence', async () => {
    const weak = msg({ id: 'weak', subject: 'Hello', from: 'x@acme.example' });
    const strong = msg({ id: 'strong' });
    const found = await scanEmails(stream([weak, strong, msg({ id: 'again' })]), [], NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.messageId).toBe('strong');
  });

  it('keeps the earlier email on a confidence tie', async () => {
    const found = await scanEmails(stream([msg({ id: 'a' }), msg({ id: 'b' })]), [], NOW);
    expect(found.map((c) => c.messageId)).toEqual(['a']);
  });

  it('sorts by date then name', async () => {
    const mk = (id: string, name: string, day: string) =>
      msg({ id, text: `Your ${name} free trial ends on ${day}. After that you will be charged $5 per month.` });
    const found = await scanEmails(
      stream([mk('1', 'Zed', '2026-10-21'), mk('2', 'Bob', '2026-10-21'), mk('3', 'Cat', '2026-10-10')]),
      [],
      NOW,
    );
    expect(found.map((c) => c.fields.name)).toEqual(['Cat', 'Bob', 'Zed']);
  });

  it('ignores an email without a charge date', () => {
    expect(analyzeMessage(msg({ text: 'Your Acme trial is active. Enjoy $5 offers.' }), NOW)).toBeUndefined();
  });

  it('ignores a distractor subject even when the body has a date', () => {
    expect(analyzeMessage(msg({ subject: 'Your order has shipped', text: 'Delivery on 2026-10-09.' }), NOW)).toBeUndefined();
  });

  it('ignores low confidence emails', () => {
    expect(analyzeMessage(msg({ subject: 'Hi', from: 'a@b.example', text: 'See you on 2026-10-09' }), NOW)).toBeUndefined();
  });

  it('subject keywords and known senders raise confidence', () => {
    const plain = analyzeMessage(msg({ subject: 'Hello' }), NOW)!;
    const withSubject = analyzeMessage(msg({ subject: 'Your trial' }), NOW)!;
    const withSender = analyzeMessage(msg({ subject: 'Your trial', from: 'a@mail.phantomflix.example' }), NOW)!;
    expect(withSubject.confidence).toBeGreaterThan(plain.confidence);
    expect(withSender.confidence).toBeGreaterThan(withSubject.confidence);
    expect(withSubject.signals).toEqual(['subject:trial']);
  });

  it('falls back to the sender domain when the parser finds no name', () => {
    const text = 'Charge on 2026-10-20. You will be charged $9.99 per month.';
    expect(analyzeMessage(msg({ text, from: 'Phantomflix <a@mail.phantomflix.example>' }), NOW)!.fields.name).toBe('Phantomflix');
    expect(analyzeMessage(msg({ text, from: 'a@billing.zebra.example' }), NOW)!.fields.name).toBe('Zebra');
  });

  it('drops an email with no usable name', () => {
    const text = 'Charge on 2026-10-20. You will be charged $9.99 per month.';
    expect(analyzeMessage(msg({ text, from: 'nobody' }), NOW)).toBeUndefined();
  });

  it('uses now as the reference date when the email date is invalid', () => {
    const c = analyzeMessage(msg({ date: 'nope', text: 'Your Acme free trial ends on Oct 20. You will be charged $9.99 per month.' }), NOW)!;
    expect(c.fields.chargeDate.slice(0, 10)).toBe('2026-10-20');
  });

  it('builds keys from service and day', () => {
    expect(candidateKey(' Phantomflix ', '2026-10-31T09:00:00.000Z')).toBe('phantomflix|2026-10-31');
  });
});

describe('signals', () => {
  it('maps sender domains', () => {
    expect(senderDomain('A <a@Mail.Example.com>')).toBe('mail.example.com');
    expect(senderDomain('nobody')).toBeUndefined();
    expect(knownService('x.necroaudiobooks.example')).toBe('Necro Audiobooks');
    expect(knownService('evilnecroaudiobooks.example')).toBeUndefined();
  });

  // Parser coverage for real services in user-provided mail, not demo content.
  it('still recognises real services by sender domain', () => {
    expect(knownService('x.audible.com')).toBe('Audible');
    expect(knownService('evilaudible.com')).toBeUndefined();
    expect(knownService('mail.netflix.com')).toBe('Netflix');
    expect(knownService('mail.disneyplus.com')).toBe('Disney+');
    expect(knownService(undefined)).toBeUndefined();
    expect(domainLabel(undefined)).toBeUndefined();
    expect(domainLabel('com')).toBeUndefined();
  });
});
