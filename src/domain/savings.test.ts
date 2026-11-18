import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbCadence, arbCurrency, arbGrave, arbGraves, arbPriceCents, graveWith } from './arbitraries';
import { epitaph, formatMoney, monthlyCents, savedCents, totalSavedByCurrency } from './savings';

const total = (graves: Parameters<typeof totalSavedByCurrency>[0]) =>
  totalSavedByCurrency(graves).reduce((sum, t) => sum + t.cents, 0);
const byCurrency = (graves: Parameters<typeof totalSavedByCurrency>[0]) =>
  Object.fromEntries(totalSavedByCurrency(graves).map((t) => [t.currency, t.cents]));

describe('monthlyCents examples', () => {
  it.each([
    [1000, 'monthly', 1000],
    [12000, 'yearly', 1000],
    [1000, 'weekly', 4333],
    [1495, 'one-time', 0],
    [1, 'yearly', 0],
  ] as const)('%i cents %s -> %i', (p, cadence, expected) => {
    expect(monthlyCents(p, cadence)).toBe(expected);
  });
});

describe('savings properties', () => {
  it('P-M1 integer cents', () => {
    fc.assert(
      fc.property(arbPriceCents, arbCadence, arbGraves, (p, c, graves) => {
        expect(Number.isInteger(monthlyCents(p, c))).toBe(true);
        for (const t of totalSavedByCurrency(graves)) expect(Number.isInteger(t.cents)).toBe(true);
        for (const g of graves) expect(Number.isInteger(savedCents(g))).toBe(true);
      }),
    );
  });

  it('P-M2 non-negative', () => {
    fc.assert(
      fc.property(arbPriceCents, arbCadence, arbGraves, (p, c, graves) => {
        expect(monthlyCents(p, c)).toBeGreaterThanOrEqual(0);
        for (const t of totalSavedByCurrency(graves)) expect(t.cents).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('P-M3 cadence consistency', () => {
    fc.assert(
      fc.property(arbPriceCents, (p) => {
        expect(Math.abs(monthlyCents(p, 'yearly') * 12 - p)).toBeLessThanOrEqual(6);
        expect(Math.abs(monthlyCents(p, 'weekly') * 12 - p * 52)).toBeLessThanOrEqual(6);
        expect(monthlyCents(p, 'monthly')).toBe(p);
        expect(monthlyCents(p, 'one-time')).toBe(0);
      }),
    );
  });

  it('P-M3b saved equals price for cancelled graves', () => {
    fc.assert(
      fc.property(arbGrave, (g) => {
        expect(savedCents({ ...g, status: 'cancelled' })).toBe(g.priceCents);
        expect(savedCents({ ...g, status: 'active' })).toBe(0);
        expect(savedCents({ ...g, status: 'kept' })).toBe(0);
      }),
    );
  });

  it('P-M4 additive', () => {
    fc.assert(
      fc.property(arbGraves, arbGraves, (a, b) => {
        expect(total([...a, ...b])).toBe(total(a) + total(b));
        const merged = byCurrency([...a, ...b]);
        const [ba, bb] = [byCurrency(a), byCurrency(b)];
        for (const cur of Object.keys(merged)) expect(merged[cur]).toBe((ba[cur] ?? 0) + (bb[cur] ?? 0));
      }),
    );
  });

  it('P-M5 order independent', () => {
    fc.assert(
      fc.property(
        arbGraves.chain((graves) => fc.tuple(fc.constant(graves), fc.shuffledSubarray(graves, { minLength: graves.length }))),
        ([graves, shuffled]) => {
          expect(totalSavedByCurrency(shuffled)).toEqual(totalSavedByCurrency(graves));
        },
      ),
    );
  });

  it('P-M6 only cancelled graves count', () => {
    fc.assert(
      fc.property(arbGraves, arbGrave, (graves, g) => {
        const before = totalSavedByCurrency(graves);
        expect(totalSavedByCurrency([...graves, { ...g, status: 'active' }])).toEqual(before);
        expect(totalSavedByCurrency([...graves, { ...g, status: 'kept' }])).toEqual(before);
        const after = byCurrency([...graves, { ...g, status: 'cancelled' }]);
        const prev = byCurrency(graves);
        expect(after[g.currency]).toBe((prev[g.currency] ?? 0) + g.priceCents);
      }),
    );
  });

  it('P-M7 empty is zero', () => {
    expect(totalSavedByCurrency([])).toEqual([]);
    expect(total([])).toBe(0);
  });

  it('P-M8 currency safety', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const totals = totalSavedByCurrency(graves);
        expect(new Set(totals.map((t) => t.currency)).size).toBe(totals.length);
        for (const t of totals) {
          const expected = graves
            .filter((g) => g.status === 'cancelled' && g.currency === t.currency)
            .reduce((s, g) => s + g.priceCents, 0);
          expect(t.cents).toBe(expected);
        }
      }),
    );
    fc.assert(
      fc.property(arbCurrency, arbCurrency, arbPriceCents, arbPriceCents, (c1, c2, p1, p2) => {
        fc.pre(c1 !== c2);
        const t = totalSavedByCurrency([
          graveWith({ status: 'cancelled', currency: c1, priceCents: p1 }),
          graveWith({ status: 'cancelled', currency: c2, priceCents: p2 }),
        ]);
        expect(t).toHaveLength(2);
      }),
    );
  });
});

describe('totals ordering', () => {
  it('sorts totals by currency code', () => {
    const t = totalSavedByCurrency([
      graveWith({ status: 'cancelled', currency: 'USD', priceCents: 100 }),
      graveWith({ status: 'cancelled', currency: 'EUR', priceCents: 200 }),
      graveWith({ status: 'cancelled', currency: 'USD', priceCents: 50 }),
    ]);
    expect(t).toEqual([
      { currency: 'EUR', cents: 200 },
      { currency: 'USD', cents: 150 },
    ]);
  });
});

describe('formatMoney and epitaph', () => {
  it('formats known currencies', () => {
    expect(formatMoney(1495, 'USD')).toBe('$14.95');
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney(999, 'EUR')).toBe('€9.99');
    expect(formatMoney(123456, 'GBP')).toBe('£1,234.56');
  });

  it('falls back for invalid currency codes', () => {
    expect(formatMoney(1495, 'not-a-code')).toBe('14.95 not-a-code');
  });

  it('writes epitaphs for every cadence', () => {
    const base = { name: 'Audible', priceCents: 1495, currency: 'USD' } as const;
    expect(epitaph({ ...base, cadence: 'monthly' })).toBe('Here lies Audible. Saved you $14.95/mo.');
    expect(epitaph({ ...base, cadence: 'weekly' })).toBe('Here lies Audible. Saved you $14.95/wk.');
    expect(epitaph({ ...base, cadence: 'yearly' })).toBe('Here lies Audible. Saved you $14.95/yr.');
    expect(epitaph({ ...base, cadence: 'one-time' })).toBe('Here lies Audible. Saved you $14.95.');
  });
});
