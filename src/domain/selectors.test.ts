import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGraves, arbNowMs, graveWith, H } from './arbitraries';
import { totalSavedByCurrency } from './savings';
import { atRiskByCurrency, nextCharge, overdueTrials, summarize } from './selectors';
import { remainingMs } from './stage';
import { deriveStats } from './stats';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const at = (hours: number, o = {}) =>
  graveWith({ chargeAt: new Date(NOW.getTime() + hours * H).toISOString(), ...o });

describe('selectors', () => {
  it('nextCharge skips overdue, non-active and picks the soonest upcoming (the QA case)', () => {
    const graves = [at(-5, { id: 'hollow', name: 'Hollowtv' }), at(3, { id: 'wraith' }), at(50, { id: 'later' }), at(1, { id: 'k', status: 'kept' })];
    expect(nextCharge(graves, NOW)?.id).toBe('wraith');
    expect(overdueTrials(graves, NOW).map((g) => g.id)).toEqual(['hollow']);
  });

  it('nextCharge is undefined with only overdue trials, and a charge exactly now is overdue', () => {
    expect(nextCharge([at(-1), at(0)], NOW)).toBeUndefined();
    expect(overdueTrials([at(0, { id: 'a' }), at(-2, { id: 'b' })], NOW).map((g) => g.id)).toEqual(['b', 'a']);
  });

  it('atRisk sums active upcoming trials within the window, per currency', () => {
    const graves = [
      at(10, { priceCents: 100 }),
      at(20, { priceCents: 250 }),
      at(30, { priceCents: 999, currency: 'EUR' }),
      at(-3, { priceCents: 5000 }),
      at(24 * 8, { priceCents: 7000 }),
      at(5, { priceCents: 8000, status: 'cancelled' }),
      at(5, { priceCents: 9000, status: 'kept' }),
    ];
    expect(atRiskByCurrency(graves, NOW)).toEqual([
      { currency: 'EUR', cents: 999 },
      { currency: 'USD', cents: 350 },
    ]);
    expect(atRiskByCurrency(graves, NOW, 24 * 9 * H).find((t) => t.currency === 'USD')?.cents).toBe(7350);
    expect(atRiskByCurrency([], NOW)).toEqual([]);
  });

  it('summarize counts cancelled and overdue', () => {
    const s = summarize([at(-1), at(1, { status: 'cancelled', priceCents: 300 })], NOW);
    expect(s).toEqual({ cancelledCount: 1, saved: [{ currency: 'USD', cents: 300 }], overdueCount: 1 });
  });
});

describe('selector properties', () => {
  const arbNow = arbNowMs.map((ms) => new Date(ms));

  it('next charge is never in the past and is the minimum upcoming active charge', () => {
    fc.assert(
      fc.property(arbGraves, arbNow, (graves, now) => {
        const next = nextCharge(graves, now);
        const upcoming = graves.filter((g) => g.status === 'active' && remainingMs(g, now) > 0);
        if (upcoming.length === 0) {
          expect(next).toBeUndefined();
          return;
        }
        expect(next?.status).toBe('active');
        expect(remainingMs(next!, now)).toBeGreaterThan(0);
        expect(remainingMs(next!, now)).toBe(Math.min(...upcoming.map((g) => remainingMs(g, now))));
      }),
    );
  });

  it('next charge is never an overdue trial', () => {
    fc.assert(
      fc.property(arbGraves, arbNow, (graves, now) => {
        const next = nextCharge(graves, now);
        expect(overdueTrials(graves, now)).not.toContain(next);
      }),
    );
  });

  it('saved and stats totals agree', () => {
    fc.assert(
      fc.property(arbGraves, arbNow, (graves, now) => {
        const stats = deriveStats(graves, now);
        const summary = summarize(graves, now);
        expect(stats.dodged).toEqual(summary.saved);
        expect(stats.dodged).toEqual(totalSavedByCurrency(graves));
        expect(stats.survived).toBe(summary.cancelledCount);
        expect(stats.overdue).toBe(summary.overdueCount);
      }),
    );
  });

  it('at-risk totals come from active trials only', () => {
    fc.assert(
      fc.property(arbGraves, arbNow, (graves, now) => {
        const inactive = graves.map((g) => (g.status === 'active' ? { ...g, status: 'kept' as const } : g));
        expect(atRiskByCurrency(inactive, now)).toEqual([]);
        const sum = atRiskByCurrency(graves, now).reduce((n, t) => n + t.cents, 0);
        const expected = graves
          .filter((g) => g.status === 'active' && remainingMs(g, now) > 0 && remainingMs(g, now) <= 7 * 24 * H)
          .reduce((n, g) => n + g.priceCents, 0);
        expect(sum).toBe(expected);
      }),
    );
  });
});
