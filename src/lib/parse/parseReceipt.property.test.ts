import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseReceipt, normalizeText } from './index';
import { REF_DATE } from './fixtures/receipts';

const NEUTRAL = ['alpha', 'beta', 'gamma', 'lorem', 'ipsum', 'dolor', 'thanks', 'hello'];
const arbNoise = fc.array(fc.constantFrom(...NEUTRAL), { maxLength: 6 }).map((w) => w.join(' '));

const SYMBOLS = [
  ['$', 'USD'],
  ['€', 'EUR'],
  ['£', 'GBP'],
] as const;
const CADENCE_PHRASES = [
  ['per month', 'monthly'],
  ['/mo', 'monthly'],
  ['monthly', 'monthly'],
  ['per year', 'yearly'],
  ['annually', 'yearly'],
  ['weekly', 'weekly'],
] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const arbCents = fc.integer({ min: 0, max: 99_999_999 });
const arbSymbol = fc.constantFrom(...SYMBOLS);
const arbCadencePhrase = fc.constantFrom(...CADENCE_PHRASES);
const arbDate = fc
  .record({ y: fc.integer({ min: 2001, max: 2099 }), m: fc.integer({ min: 1, max: 12 }), d: fc.integer({ min: 1, max: 28 }) });

const pad = (n: number) => String(n).padStart(2, '0');
const major = (cents: number) => `${Math.floor(cents / 100)}.${pad(cents % 100)}`;
const withCommas = (cents: number) =>
  `${Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${pad(cents % 100)}`;

const dateFormats: Array<(d: { y: number; m: number; d: number }) => string> = [
  ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`,
  ({ y, m, d }) => `${MONTHS[m - 1]!.slice(0, 3)} ${d}, ${y}`,
  ({ y, m, d }) => `${d} ${MONTHS[m - 1]} ${y}`,
  ({ y, m, d }) => `${pad(m)}/${pad(d)}/${y}`,
];

const calendarDate = (iso: string) => iso.slice(0, 10);

describe('receipt parser properties', () => {
  it('P-P1 never throws, even on huge unicode input', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 300 }), (s) => {
        expect(typeof parseReceipt(s, REF_DATE)).toBe('object');
      }),
    );
    expect(typeof parseReceipt('\u{1F4A9}$1,'.repeat(60_000), REF_DATE)).toBe('object');
    expect(typeof parseReceipt('\ufdfa'.repeat(60_000), REF_DATE)).toBe('object');
  });

  it('P-P2 is deterministic', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 200 }), (s) => {
        expect(parseReceipt(s, REF_DATE)).toEqual(parseReceipt(s, REF_DATE));
      }),
    );
  });

  it('P-P3 recovers cents and currency from symbol or code, with noise', () => {
    fc.assert(
      fc.property(arbCents, arbSymbol, arbCadencePhrase, arbNoise, arbNoise, fc.boolean(), fc.boolean(), (cents, [sym, cur], [phrase, cadence], pre, post, commas, asCode) => {
        const amount = commas ? withCommas(cents) : major(cents);
        const price = asCode ? `${cur} ${amount}` : `${sym}${amount}`;
        const r = parseReceipt(`${pre} ${price} ${phrase} ${post}`, REF_DATE);
        expect(r.priceCents?.value).toBe(cents);
        expect(r.currency?.value).toBe(cur);
        expect(r.cadence?.value).toBe(cadence);
      }),
    );
  });

  it('P-P4 recovers the calendar date in every supported format', () => {
    fc.assert(
      fc.property(arbDate, fc.constantFrom(0, 1, 2, 3), fc.boolean(), arbNoise, arbNoise, (d, fmt, labelled, pre, post) => {
        const text = `${pre} ${labelled ? 'trial ends ' : ''}${dateFormats[fmt]!(d)} ${post}`;
        const r = parseReceipt(text, REF_DATE);
        expect(r.chargeAt && calendarDate(r.chargeAt.value)).toBe(`${d.y}-${pad(d.m)}-${pad(d.d)}`);
      }),
    );
  });

  it('P-P5 ignores leading and trailing text without digits or date words', () => {
    const base = 'Welcome to Netflix. Your trial ends Oct 31, 2026. Then $15.49 per month. https://netflix.com/cancel';
    const expected = parseReceipt(base, REF_DATE);
    fc.assert(
      fc.property(arbNoise, arbNoise, (pre, post) => {
        expect(parseReceipt(`${pre} ${base} ${post}`, REF_DATE)).toEqual(expected);
      }),
    );
  });

  it('P-P6 is insensitive to whitespace and keyword case', () => {
    fc.assert(
      fc.property(arbCents, arbDate, arbCadencePhrase, fc.constantFrom(0, 1, 2, 3), fc.boolean(), fc.constantFrom(' ', '  ', '\n', '\t \n'), (cents, d, [phrase, cadence], fmt, upper, ws) => {
        const parts = ['Trial ends', dateFormats[fmt]!(d), 'then', `$${major(cents)}`, phrase];
        const base = parts.join(' ');
        const shaped = parts.map((p) => (upper ? p.toUpperCase() : p)).join(ws);
        const a = parseReceipt(base, REF_DATE);
        const b = parseReceipt(shaped, REF_DATE);
        expect(b.priceCents?.value).toBe(a.priceCents?.value);
        expect(b.currency?.value).toBe(a.currency?.value);
        expect(b.cadence?.value).toBe(cadence);
        expect(b.chargeAt?.value).toBe(a.chargeAt?.value);
      }),
    );
  });

  it('P-P7 invents nothing: every source appears in the normalized input', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 200 }), arbNoise, arbCents, (s, noise, cents) => {
        const text = `${s} Welcome to Foo ${noise} $${major(cents)} per month https://foo.com/cancel Oct 5`;
        const normalized = normalizeText(text);
        for (const field of Object.values(parseReceipt(text, REF_DATE))) {
          expect(normalized).toContain(field.source);
        }
      }),
    );
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 200 }), (s) => {
        const digitFree = s.replace(/\d/g, '');
        expect(normalizeText(digitFree)).not.toMatch(/\d/);
        expect(parseReceipt(digitFree, REF_DATE)).toEqual({});
      }),
    );
  });

  it('P-P8 returns valid prices, dates and URLs', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 300 }), (s) => {
        const r = parseReceipt(`${s} $1,5 Oct 31 13/45/2026 https://x.io/a`, REF_DATE);
        if (r.priceCents) {
          expect(Number.isInteger(r.priceCents.value)).toBe(true);
          expect(r.priceCents.value).toBeGreaterThanOrEqual(0);
        }
        if (r.chargeAt) expect(Number.isNaN(Date.parse(r.chargeAt.value))).toBe(false);
        if (r.cancelUrl) expect(new URL(r.cancelUrl.value).protocol).toMatch(/^https?:$/);
      }),
    );
  });

  it('P-P9 parses 100 KB of adversarial input within 200 ms', () => {
    const inputs = [
      'a'.repeat(100_000),
      '1,'.repeat(50_000),
      '$'.repeat(100_000),
      'http://'.repeat(14_000),
      'https://a.b/' + '.'.repeat(100_000),
      'Oct 1 '.repeat(17_000),
      'your a '.repeat(14_000),
      'welcome to A '.repeat(8_000),
      '1/1/2026 '.repeat(11_000),
      '9.9.9.9.9 '.repeat(10_000),
    ];
    for (const input of inputs) {
      const start = performance.now();
      parseReceipt(input, REF_DATE);
      expect(performance.now() - start).toBeLessThan(200);
    }
  });
});
