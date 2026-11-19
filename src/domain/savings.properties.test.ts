import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { totalSavedByCurrency } from './savings';
import { arbGrave, arbGraves } from './arbitraries';

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('totalSavedByCurrency properties', () => {
  it('P-T1 equals the sum of cancelled graves per currency', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        for (const t of totalSavedByCurrency(graves)) {
          const expected = sum(
            graves.filter((g) => g.status === 'cancelled' && g.currency === t.currency).map((g) => g.priceCents),
          );
          expect(t.cents).toBe(expected);
        }
      }),
    );
  });

  it('P-T2 is non-negative', () => {
    fc.assert(fc.property(arbGraves, (graves) => totalSavedByCurrency(graves).every((t) => t.cents >= 0)));
  });

  it('P-T3 does not depend on order', () => {
    fc.assert(
      fc.property(
        arbGraves.chain((graves) => fc.tuple(fc.constant(graves), fc.shuffledSubarray(graves, { minLength: graves.length }))),
        ([graves, shuffled]) => {
          expect(totalSavedByCurrency(shuffled)).toEqual(totalSavedByCurrency(graves));
        },
      ),
    );
  });

  it('P-T4 ignores active and kept graves', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const cancelledOnly = graves.filter((g) => g.status === 'cancelled');
        expect(totalSavedByCurrency(graves)).toEqual(totalSavedByCurrency(cancelledOnly));
      }),
    );
  });

  it('P-T5 cancel then undo restores the total', () => {
    fc.assert(
      fc.property(arbGraves, arbGrave, (graves, target) => {
        const active = { ...target, status: 'active' as const };
        const before = totalSavedByCurrency([...graves, active]);
        const cancelled = { ...active, status: 'cancelled' as const, cancelledAt: '2026-01-01T00:00:00Z' };
        const { cancelledAt: _c, ...undone } = cancelled;
        expect(totalSavedByCurrency([...graves, { ...undone, status: 'active' as const }])).toEqual(before);
      }),
    );
  });
});
