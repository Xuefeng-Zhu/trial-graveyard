import fc from 'fast-check';
import type { Cadence, Grave, Status } from './trial';

export const H = 3_600_000;
export const BOUNDARIES = [0, 48 * H, 72 * H, 168 * H];

/** Remaining-time offsets in ms, biased toward the stage boundaries +-1 ms. */
export const arbRemainingMs = fc.oneof(
  fc.constantFrom(...BOUNDARIES).chain((b) => fc.constantFrom(b - 1, b, b + 1)),
  fc.integer({ min: -30 * 24 * H, max: 30 * 24 * H }),
);

export const arbNowMs = fc.integer({ min: Date.UTC(2000, 0, 1), max: Date.UTC(2100, 0, 1) });

export const arbCadence: fc.Arbitrary<Cadence> = fc.constantFrom('one-time', 'weekly', 'monthly', 'yearly');
export const arbStatus: fc.Arbitrary<Status> = fc.constantFrom('active', 'cancelled', 'kept');
export const arbCurrency = fc.constantFrom('USD', 'EUR', 'GBP', 'JPY');
export const arbPriceCents = fc.integer({ min: 0, max: 100_000_000 });

export const arbGrave: fc.Arbitrary<Grave> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 60, unit: 'binary' }),
  chargeAt: arbNowMs.map((ms) => new Date(ms).toISOString()),
  priceCents: arbPriceCents,
  currency: arbCurrency,
  cadence: arbCadence,
  cancelUrl: fc.option(fc.webUrl({ withQueryParameters: true }), { nil: undefined }),
  status: arbStatus,
  createdAt: fc.constant('2026-01-01T00:00:00.000Z'),
});

/** A cancelled grave with a random `cancelledAt` instant. */
export const arbCancelledGrave: fc.Arbitrary<Grave> = fc
  .tuple(arbGrave, arbNowMs)
  .map(([g, ms]) => ({ ...g, status: 'cancelled' as const, cancelledAt: new Date(ms).toISOString() }));

export const arbGraves = fc.array(arbGrave, { maxLength: 15 });

export function graveWith(overrides: Partial<Grave> = {}): Grave {
  return {
    id: 'g1',
    name: 'Netflix',
    chargeAt: '2026-10-31T09:00:00.000Z',
    priceCents: 1549,
    currency: 'USD',
    cadence: 'monthly',
    status: 'active',
    createdAt: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}
