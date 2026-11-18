import { describe, expect, it } from 'vitest';
import {
  createGrave,
  isCadence,
  isHttpUrl,
  normalizeChargeAt,
  parsePriceToCents,
  toLocalIso,
  validateTrial,
  type TrialInput,
} from './trial';

const valid: TrialInput = {
  name: ' Audible ',
  chargeAt: '2026-10-31',
  price: '14.95',
  cadence: 'monthly',
  cancelUrl: 'https://audible.com/cancel',
};

describe('validateTrial', () => {
  it('accepts a valid form and normalizes it', () => {
    const result = validateTrial(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Audible');
    expect(result.value.priceCents).toBe(1495);
    expect(result.value.currency).toBe('USD');
    expect(result.value.cancelUrl).toBe('https://audible.com/cancel');
    expect(result.value.chargeAt).toMatch(/^2026-10-31T09:00:00[+-]\d{2}:\d{2}$/);
  });

  it('omits an empty cancel URL and uppercases currency', () => {
    const result = validateTrial({ ...valid, cancelUrl: '  ', currency: 'eur' });
    expect(result.ok && result.value.cancelUrl).toBeUndefined();
    expect(result.ok && result.value.currency).toBe('EUR');
    const noUrl = validateTrial({ ...valid, cancelUrl: undefined });
    expect(noUrl.ok).toBe(true);
  });

  it('accepts a price of zero', () => {
    const result = validateTrial({ ...valid, price: 0 });
    expect(result.ok && result.value.priceCents).toBe(0);
  });

  it('reports every invalid field at once', () => {
    const result = validateTrial({
      name: '   ',
      chargeAt: 'tomorrow',
      price: -1,
      cadence: 'daily',
      cancelUrl: 'javascript:alert(1)',
      currency: 'dollars',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      'cadence',
      'cancelUrl',
      'chargeAt',
      'currency',
      'name',
      'price',
    ]);
  });

  it.each([['ftp://example.com'], ['not a url'], ['mailto:a@b.co']])('rejects cancel URL %s', (cancelUrl) => {
    const result = validateTrial({ ...valid, cancelUrl });
    expect(result.ok).toBe(false);
  });
});

describe('helpers', () => {
  it('isHttpUrl accepts only http and https', () => {
    expect(isHttpUrl('http://a.co')).toBe(true);
    expect(isHttpUrl('https://a.co/x?y=1')).toBe(true);
    expect(isHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });

  it('parsePriceToCents handles numbers, strings and bad input', () => {
    expect(parsePriceToCents(14.95)).toBe(1495);
    expect(parsePriceToCents(' 0.1 ')).toBe(10);
    expect(parsePriceToCents('')).toBeUndefined();
    expect(parsePriceToCents('abc')).toBeUndefined();
    expect(parsePriceToCents(NaN)).toBeUndefined();
    expect(parsePriceToCents(Infinity)).toBeUndefined();
    expect(parsePriceToCents(-0.01)).toBeUndefined();
    expect(parsePriceToCents(1e300)).toBeUndefined();
  });

  it('isCadence narrows known cadences', () => {
    expect(isCadence('weekly')).toBe(true);
    expect(isCadence('daily')).toBe(false);
  });

  it('normalizeChargeAt rejects impossible dates and keeps full ISO strings', () => {
    expect(normalizeChargeAt('2026-02-31')).toBeUndefined();
    expect(normalizeChargeAt('2026-13-01')).toBeUndefined();
    expect(normalizeChargeAt('2026-10-31T09:00:00-07:00')).toBe('2026-10-31T09:00:00-07:00');
    expect(normalizeChargeAt('2026-10-31T25:00:00Z')).toBeUndefined();
    expect(normalizeChargeAt('')).toBeUndefined();
  });

  it('toLocalIso round-trips the instant', () => {
    const d = new Date(2026, 9, 31, 9, 5, 7);
    expect(Date.parse(toLocalIso(d))).toBe(d.getTime());
    expect(toLocalIso(d)).toMatch(/^2026-10-31T09:05:07[+-]\d{2}:\d{2}$/);
  });

  it('toLocalIso formats both offset signs', () => {
    const spy = (offset: number): Date => {
      const d = new Date(2026, 0, 1);
      d.getTimezoneOffset = () => offset;
      return d;
    };
    expect(toLocalIso(spy(420))).toMatch(/-07:00$/);
    expect(toLocalIso(spy(-330))).toMatch(/\+05:30$/);
  });
});

describe('createGrave', () => {
  it('creates an active grave from validated input', () => {
    const result = validateTrial(valid);
    if (!result.ok) throw new Error('expected valid');
    const now = new Date(2026, 9, 1, 12, 0, 0);
    const grave = createGrave(result.value, 'abc', now);
    expect(grave).toMatchObject({ id: 'abc', status: 'active', name: 'Audible', priceCents: 1495 });
    expect(Date.parse(grave.createdAt)).toBe(now.getTime());
  });
});
