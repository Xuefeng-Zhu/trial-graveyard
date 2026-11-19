import { describe, expect, it, vi, afterEach } from 'vitest';
import { parseReceipt, parseReceiptWithFallback, normalizeText, MAX_INPUT_CHARS } from './index';
import { parseAmount } from './money';
import { extractCadence } from './cadence';
import { extractDate } from './date';
import { extractCancelUrl, findUrls } from './url';
import { extractName } from './name';
import { FIXTURES, REF_DATE } from './fixtures/receipts';

describe('fixture corpus', () => {
  for (const f of FIXTURES) {
    it(f.id, () => {
      const r = parseReceipt(f.text, REF_DATE);
      expect(r.name?.value).toBe(f.expected.name);
      expect(r.priceCents?.value).toBe(f.expected.priceCents);
      expect(r.currency?.value).toBe(f.expected.currency);
      expect(r.cadence?.value).toBe(f.expected.cadence);
      expect(r.chargeAt?.value.slice(0, 10)).toBe(f.expected.date);
      expect(r.cancelUrl?.value).toBe(f.expected.cancelUrl);
      for (const field of Object.values(r)) {
        expect(field.confidence).toBeGreaterThan(0);
        expect(field.confidence).toBeLessThanOrEqual(1);
      }
    });
  }
});

describe('units', () => {
  it('parses amounts in US and European formats', () => {
    expect(parseAmount('15')).toBe(1500);
    expect(parseAmount('9.5')).toBe(950);
    expect(parseAmount('1,234.56')).toBe(123456);
    expect(parseAmount('1.234,56')).toBe(123456);
    expect(parseAmount('1,234')).toBe(123400);
  });

  it('prefers the earliest cadence phrase', () => {
    expect(extractCadence('weekly then annually')?.value).toBe('weekly');
    expect(extractCadence('a one-time fee')?.value).toBe('one-time');
    expect(extractCadence('nothing here')).toBeUndefined();
  });

  it('reads 10/31/2026 in US order and rejects impossible dates', () => {
    expect(extractDate('on 10/31/2026', REF_DATE)?.value.slice(0, 10)).toBe('2026-10-31');
    expect(extractDate('on 31/10/2026', REF_DATE)).toBeUndefined();
    expect(extractDate('on 2026-02-31', REF_DATE)).toBeUndefined();
    expect(extractDate('on Feb 30', REF_DATE)).toBeUndefined();
  });

  it('infers the year for year-less dates, including leap days', () => {
    expect(extractDate('Oct 1', REF_DATE)?.value.slice(0, 10)).toBe('2026-10-01');
    expect(extractDate('Sep 30', REF_DATE)?.value.slice(0, 10)).toBe('2027-09-30');
    expect(extractDate('Feb 29', REF_DATE)?.value.slice(0, 10)).toBe('2028-02-29');
    expect(extractDate('31st of October', REF_DATE)?.value.slice(0, 10)).toBe('2026-10-31');
  });

  it('strips trailing punctuation from URLs and ignores non-http schemes', () => {
    expect(findUrls('see https://example.com/cancel. ftp://x.com javascript:alert(1)')).toEqual([
      'https://example.com/cancel',
    ]);
    expect(extractCancelUrl([])).toBeUndefined();
    expect(extractCancelUrl(['https://a.com/x', 'https://b.com/manage'])?.value).toBe('https://b.com/manage');
  });

  it('falls back to the domain for the name', () => {
    expect(extractName('nothing', ['https://www.example.co.uk/x'])?.value).toBe('Example');
    expect(extractName('nothing', ['https://foo.com'])?.value).toBe('Foo');
    expect(extractName('nothing', [])).toBeUndefined();
    expect(extractName('Welcome to The New York Times. Your trial ends November 15.', [])?.value).toBe('The New York Times');
    expect(extractName('Welcome to Phantomflix Your trial ends soon', [])?.value).toBe('Phantomflix');
  });

  it('truncates input to 50 KB', () => {
    expect(normalizeText('a'.repeat(MAX_INPUT_CHARS * 2)).length).toBe(MAX_INPUT_CHARS);
    expect(parseReceipt(' '.repeat(10) + 'x'.repeat(MAX_INPUT_CHARS) + ' $5.00', REF_DATE)).toEqual({});
  });

  it('returns an empty result for digit-free input', () => {
    expect(parseReceipt('Welcome to Phantomflix! Your trial ends soon.', REF_DATE)).toEqual({});
    expect(parseReceipt('', REF_DATE)).toEqual({});
  });
});

describe('LLM fallback (R5.7, R5.8)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not touch the network when the flag is off', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await parseReceiptWithFallback('only 5 words', REF_DATE);
    expect(result).toEqual({});
    await parseReceiptWithFallback('only 5 words', REF_DATE, { llmFallback: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads the stub only when on and fewer than 3 fields found, and still avoids fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sparse = await parseReceiptWithFallback('costs $5.00', REF_DATE, { llmFallback: true });
    expect(sparse.priceCents?.value).toBe(500);
    const rich = await parseReceiptWithFallback(FIXTURES[0]!.text, REF_DATE, { llmFallback: true });
    expect(rich).toEqual(parseReceipt(FIXTURES[0]!.text, REF_DATE));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
