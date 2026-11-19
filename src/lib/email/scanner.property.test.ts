import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { scanEmails } from './scanner';
import { arbGraves } from '../../domain/arbitraries';
import type { EmailMessage } from './types';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const SERVICES = ['Disney+', 'Spotify Premium', 'Peloton', 'Audible', 'Acme', 'Zed'];
const arbDay = fc.record({ m: fc.integer({ min: 1, max: 12 }), d: fc.integer({ min: 1, max: 28 }) });
const pad = (n: number) => String(n).padStart(2, '0');

const arbMessage: fc.Arbitrary<EmailMessage> = fc
  .record({
    id: fc.uuid(),
    service: fc.constantFrom(...SERVICES),
    day: arbDay,
    year: fc.integer({ min: 2026, max: 2028 }),
    withDate: fc.boolean(),
    subject: fc.constantFrom('Your trial', 'Hello', 'Your order has shipped', 'Plan renews on soon', 'Newsletter'),
    from: fc.constantFrom('a@mail.disneyplus.com', 'b@acme.example', 'nobody', 'c@spotify.com'),
    junk: fc.string({ maxLength: 40 }),
    price: fc.integer({ min: 0, max: 99_999 }),
  })
  .map((r) => ({
    id: r.id,
    from: r.from,
    subject: r.subject,
    date: NOW.toISOString(),
    text: r.withDate
      ? `Your ${r.service} free trial ends on ${r.year}-${pad(r.day.m)}-${pad(r.day.d)}. You will be charged $${(r.price / 100).toFixed(2)} per month. ${r.junk}`
      : `Your ${r.service} trial is active. ${r.junk}`,
  }));

async function* stream(msgs: EmailMessage[]): AsyncGenerator<EmailMessage> {
  for (const m of msgs) yield m;
}

describe('scanEmails properties', () => {
  it('never emits a trial without a valid charge date and never duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbMessage, { maxLength: 25 }), arbGraves, async (msgs, graves) => {
        const found = await scanEmails(stream(msgs), graves, NOW);
        const keys = found.map((c) => c.key);
        expect(new Set(keys).size).toBe(keys.length);
        const graveKeys = new Set(graves.map((g) => `${g.name.trim().toLowerCase()}|${g.chargeAt.slice(0, 10)}`));
        for (const c of found) {
          expect(c.fields.chargeDate).toBeTruthy();
          expect(Number.isNaN(Date.parse(c.fields.chargeDate))).toBe(false);
          expect(c.confidence).toBeGreaterThanOrEqual(0);
          expect(c.confidence).toBeLessThanOrEqual(1);
          expect(graveKeys.has(c.key)).toBe(false);
          expect(c.snippet.length).toBeLessThanOrEqual(160);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbMessage, { maxLength: 15 }), async (msgs) => {
        expect(await scanEmails(stream(msgs), [], NOW)).toEqual(await scanEmails(stream(msgs), [], NOW));
      }),
      { numRuns: 50 },
    );
  });
});
