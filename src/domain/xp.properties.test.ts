import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGraves, arbXpLedger } from './arbitraries';
import { deriveStats } from './stats';
import { monthlyCents, savedCents, totalSavedByCurrency } from './savings';
import { MAX_LEVEL, dailyQuest, levelFor, progressFor, totalXp, unlockedStyles } from './xp';

const NOW = new Date('2026-10-30T09:00:00.000Z');

describe('xp properties', () => {
  it('level is monotonic in XP and progress stays in [0, 1]', () => {
    fc.assert(
      fc.property(fc.nat(100_000), fc.nat(100_000), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const l = levelFor(lo);
        const h = levelFor(hi);
        expect(h.level).toBeGreaterThanOrEqual(l.level);
        expect(l.level).toBeGreaterThanOrEqual(1);
        expect(h.level).toBeLessThanOrEqual(MAX_LEVEL);
        for (const p of [l.progress, h.progress]) {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
        }
      }),
    );
  });

  it('XP never decreases when events are added, and unlocks only grow', () => {
    fc.assert(
      fc.property(arbXpLedger, arbXpLedger, (a, b) => {
        expect(totalXp([...a, ...b])).toBeGreaterThanOrEqual(totalXp(a));
        expect(unlockedStyles(progressFor([...a, ...b]).level).length).toBeGreaterThanOrEqual(
          unlockedStyles(progressFor(a).level).length,
        );
      }),
    );
  });

  it('the daily quest is capped at its goal', () => {
    fc.assert(
      fc.property(arbXpLedger, fc.constantFrom('2026-01-01T00:00:00Z', '2050-06-01T12:00:00Z'), (l, today) => {
        const q = dailyQuest(l, today);
        expect(q.done).toBeGreaterThanOrEqual(0);
        expect(q.done).toBeLessThanOrEqual(q.goal);
      }),
    );
  });

  it('financial totals are identical whatever the XP data is', () => {
    fc.assert(
      fc.property(arbGraves, arbXpLedger, (graves, ledger) => {
        const before = {
          totals: totalSavedByCurrency(graves),
          saved: graves.map(savedCents),
          monthly: graves.map((g) => monthlyCents(g.priceCents, g.cadence)),
          stats: deriveStats(graves, NOW),
        };
        progressFor(ledger);
        dailyQuest(ledger, '2026-01-01T00:00:00Z');
        const after = {
          totals: totalSavedByCurrency(graves),
          saved: graves.map(savedCents),
          monthly: graves.map((g) => monthlyCents(g.priceCents, g.cadence)),
          stats: deriveStats(graves, NOW),
        };
        expect(after).toEqual(before);
      }),
    );
  });

  it('xp.ts does not import savings or stats', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/domain/xp.ts'), 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*(import|export)\b.*\bfrom\b/.test(l));
    expect(imports.join('\n')).not.toMatch(/savings|stats/);
  });
});
