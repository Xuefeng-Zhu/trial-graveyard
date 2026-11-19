import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildShareSummary } from './shareCard';
import { arbGraves, graveWith } from './arbitraries';

describe('buildShareSummary', () => {
  it('summarises cancelled graves only', () => {
    const summary = buildShareSummary([
      graveWith({ status: 'cancelled', priceCents: 1000 }),
      graveWith({ status: 'cancelled', priceCents: 500, currency: 'EUR' }),
      graveWith({ status: 'active' }),
      graveWith({ status: 'kept' }),
    ]);
    expect(summary).toEqual({
      totals: [
        { currency: 'EUR', cents: 500 },
        { currency: 'USD', cents: 1000 },
      ],
      slain: 2,
    });
  });

  it('is empty without cancelled graves', () => {
    expect(buildShareSummary([])).toEqual({ totals: [], slain: 0 });
  });

  it('never includes names or cancel URLs', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const marked = graves.map((g, i) => ({ ...g, name: `NAME-${i}-\u2620`, cancelUrl: `https://secret${i}.example/cancel` }));
        const json = JSON.stringify(buildShareSummary(marked));
        expect(json).not.toMatch(/NAME-|secret|https?:/);
      }),
    );
  });
});
