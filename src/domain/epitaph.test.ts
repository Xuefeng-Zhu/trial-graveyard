import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatEpitaph } from './epitaph';
import { arbCancelledGrave, graveWith } from './arbitraries';
import { formatMoney } from './savings';

describe('formatEpitaph', () => {
  it('formats the documented example', () => {
    const g = graveWith({
      name: 'Disney+',
      priceCents: 1399,
      status: 'cancelled',
      cancelledAt: '2026-11-15T10:00:00.000Z',
    });
    expect(formatEpitaph(g)).toBe('Here lies Disney+ · $13.99/mo · slain Nov 2026');
  });

  it('omits the cadence suffix for one-time prices', () => {
    const g = graveWith({ name: 'Course', priceCents: 4900, cadence: 'one-time', cancelledAt: '2026-03-02T00:00:00Z' });
    expect(formatEpitaph(g)).toBe('Here lies Course · $49.00 · slain Mar 2026');
  });

  it('supports weekly, yearly and non-USD currencies', () => {
    expect(formatEpitaph(graveWith({ cadence: 'weekly', cancelledAt: '2026-01-05T00:00:00Z' }))).toContain('$15.49/wk');
    const yearly = graveWith({ cadence: 'yearly', currency: 'EUR', priceCents: 9900, cancelledAt: '2026-02-05T00:00:00Z' });
    expect(formatEpitaph(yearly)).toBe('Here lies Netflix · €99.00/yr · slain Feb 2026');
  });

  it('uses UTC at month boundaries', () => {
    expect(formatEpitaph(graveWith({ cancelledAt: '2026-11-30T23:59:59-08:00' }))).toContain('slain Dec 2026');
    expect(formatEpitaph(graveWith({ cancelledAt: '2026-12-01T00:00:00.000Z' }))).toContain('slain Dec 2026');
    expect(formatEpitaph(graveWith({ cancelledAt: '2026-11-30T23:59:59.999Z' }))).toContain('slain Nov 2026');
  });

  it('falls back to createdAt without cancelledAt', () => {
    expect(formatEpitaph(graveWith({ createdAt: '2026-10-01T09:00:00.000Z' }))).toContain('slain Oct 2026');
  });
});

describe('formatEpitaph properties', () => {
  it('P-E1 contains the name', () => {
    fc.assert(fc.property(arbCancelledGrave, (g) => formatEpitaph(g).includes(g.name)));
  });
  it('P-E2 contains the formatted price', () => {
    fc.assert(fc.property(arbCancelledGrave, (g) => formatEpitaph(g).includes(formatMoney(g.priceCents, g.currency))));
  });
  it('P-E3 contains the slain month and year', () => {
    fc.assert(
      fc.property(arbCancelledGrave, (g) => {
        const d = new Date(g.cancelledAt!);
        const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        expect(formatEpitaph(g)).toContain(`slain ${month} ${d.getUTCFullYear()}`);
      }),
    );
  });
  it('P-E4 never contains undefined or NaN outside the name', () => {
    fc.assert(
      fc.property(arbCancelledGrave, (g) => {
        const rest = formatEpitaph({ ...g, name: 'x' });
        expect(rest).not.toMatch(/undefined|NaN/);
      }),
    );
  });
  it('P-E5 is deterministic', () => {
    fc.assert(fc.property(arbCancelledGrave, (g) => formatEpitaph(g) === formatEpitaph({ ...g })));
  });
});
