import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGraves, graveWith } from './arbitraries';
import { deriveStats } from './stats';

const NOW = new Date(2026, 5, 15, 12, 0);
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 9, 0).toISOString();

describe('deriveStats', () => {
  it('is empty for no graves', () => {
    expect(deriveStats([], NOW)).toEqual({ survived: 0, dodged: [], avgDaysUsed: null, escaped: 0 });
  });

  it('counts survived, dodged this year, average days and escaped', () => {
    const graves = [
      graveWith({
        id: '1',
        status: 'cancelled',
        createdAt: iso(2026, 5, 1),
        cancelledAt: iso(2026, 5, 5),
        chargeAt: iso(2026, 5, 20),
        priceCents: 1000,
      }),
      graveWith({
        id: '2',
        status: 'cancelled',
        currency: 'EUR',
        createdAt: iso(2026, 4, 1),
        cancelledAt: iso(2026, 4, 3),
        chargeAt: iso(2026, 4, 10),
        priceCents: 500,
      }),
      // survived last year: counts as survived, not dodged this year
      graveWith({
        id: '3',
        status: 'cancelled',
        createdAt: iso(2025, 5, 1),
        cancelledAt: iso(2025, 5, 3),
        chargeAt: iso(2025, 5, 10),
        priceCents: 9999,
      }),
      // cancelled after the charge: not survived
      graveWith({
        id: '4',
        status: 'cancelled',
        createdAt: iso(2026, 0, 1),
        cancelledAt: iso(2026, 0, 20),
        chargeAt: iso(2026, 0, 10),
        priceCents: 777,
      }),
      graveWith({ id: '5', status: 'active', chargeAt: iso(2026, 5, 1) }),
      graveWith({ id: '6', status: 'kept', chargeAt: iso(2026, 5, 2) }),
      graveWith({ id: '7', status: 'active', chargeAt: iso(2026, 8, 1) }),
    ];
    const s = deriveStats(graves, NOW);
    expect(s.survived).toBe(3);
    expect(s.dodged).toEqual([
      { currency: 'EUR', cents: 500 },
      { currency: 'USD', cents: 1000 },
    ]);
    expect(s.avgDaysUsed).toBeCloseTo((4 + 2 + 2) / 3, 5);
    expect(s.escaped).toBe(3); // kept and active past charge, plus the late cancellation
  });

  it('counts a late cancellation as escaped, not survived or averaged', () => {
    const s = deriveStats(
      [
        graveWith({
          status: 'cancelled',
          createdAt: iso(2026, 0, 1),
          cancelledAt: iso(2026, 0, 20),
          chargeAt: iso(2026, 0, 10),
        }),
      ],
      NOW,
    );
    expect(s).toEqual({ survived: 0, dodged: [], avgDaysUsed: null, escaped: 1 });
  });

  it('ignores cancelled graves without a valid cancelledAt', () => {
    const s = deriveStats(
      [
        graveWith({ status: 'cancelled' }),
        graveWith({ status: 'cancelled', cancelledAt: 'nope' }),
      ],
      NOW,
    );
    expect(s).toEqual({ survived: 0, dodged: [], avgDaysUsed: null, escaped: 0 });
  });

  it('never reports negative days and keeps counts bounded', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const s = deriveStats(graves, NOW);
        expect(s.survived).toBeLessThanOrEqual(graves.length);
        expect(s.escaped).toBeLessThanOrEqual(graves.length);
        if (s.avgDaysUsed !== null) expect(s.avgDaysUsed).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
