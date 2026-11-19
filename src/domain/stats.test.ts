import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGraves, graveWith } from './arbitraries';
import { totalSavedByCurrency } from './savings';
import { deriveStats, formatAvgDays } from './stats';

const NOW = new Date(2026, 5, 15, 12, 0);
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 9, 0).toISOString();

describe('deriveStats', () => {
  it('is empty for no graves', () => {
    expect(deriveStats([], NOW)).toEqual({ survived: 0, dodged: [], avgDaysUsed: null, overdue: 0 });
  });

  it('counts a cancelled grave without a cancelledAt (the demo case) as survived and dodged', () => {
    const s = deriveStats([graveWith({ status: 'cancelled', priceCents: 1199 })], NOW);
    expect(s.survived).toBe(1);
    expect(s.dodged).toEqual([{ currency: 'USD', cents: 1199 }]);
    expect(s.avgDaysUsed).toBeNull();
  });

  it('counts overdue active trials, averages days used and ignores invalid cancel times', () => {
    const graves = [
      graveWith({ id: '1', status: 'cancelled', createdAt: iso(2026, 5, 1), cancelledAt: iso(2026, 5, 5), priceCents: 1000 }),
      graveWith({ id: '2', status: 'cancelled', createdAt: iso(2026, 5, 1), cancelledAt: iso(2026, 5, 3), priceCents: 500 }),
      graveWith({ id: '3', status: 'cancelled', cancelledAt: 'nonsense', priceCents: 200 }),
      graveWith({ id: '4', chargeAt: iso(2026, 5, 10) }),
      graveWith({ id: '5', status: 'kept', chargeAt: iso(2026, 5, 10) }),
      graveWith({ id: '6', chargeAt: iso(2026, 6, 10) }),
    ];
    const s = deriveStats(graves, NOW);
    expect(s.survived).toBe(3);
    expect(s.dodged).toEqual([{ currency: 'USD', cents: 1700 }]);
    expect(s.avgDaysUsed).toBeCloseTo(3, 5);
    expect(s.overdue).toBe(1);
  });

  it('clamps a cancel time before creation to zero days', () => {
    const s = deriveStats(
      [graveWith({ status: 'cancelled', createdAt: iso(2026, 5, 5), cancelledAt: iso(2026, 5, 1) })],
      NOW,
    );
    expect(s.avgDaysUsed).toBe(0);
  });

  it('P: survived and dodged always agree with the saved totals', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const s = deriveStats(graves, NOW);
        expect(s.dodged).toEqual(totalSavedByCurrency(graves));
        expect(s.survived).toBe(graves.filter((g) => g.status === 'cancelled').length);
        expect(s.survived === 0).toBe(s.dodged.length === 0);
        expect(s.overdue).toBeLessThanOrEqual(graves.length);
        if (s.avgDaysUsed !== null) expect(s.avgDaysUsed).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});

describe('formatAvgDays', () => {
  it('reads sensibly', () => {
    expect(formatAvgDays(null)).toBe('None yet');
    expect(formatAvgDays(0)).toBe('Less than a day');
    expect(formatAvgDays(0.04)).toBe('Less than a day');
    expect(formatAvgDays(1)).toBe('1.0 day');
    expect(formatAvgDays(2.46)).toBe('2.5 days');
  });
});
