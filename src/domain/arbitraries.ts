import fc from 'fast-check'
import { createGrave, cadences, type Grave } from './trial'
import { DAY, HOUR } from './stage'

export const reference = new Date('2026-11-19T12:00:00Z')
export const trial = (overrides: Partial<Grave> = {}): Grave => ({
  ...createGrave({ name: 'Phantomflix', priceCents: 1399, currency: 'USD', cadence: 'monthly',
    chargeAt: '2026-11-21T12:00:00Z' }, reference, 'fixture'), ...overrides,
})
export const centsArb = fc.integer({ min: 0, max: 10_000_000 })
export const offsetArb = fc.oneof(fc.integer({ min: -40 * DAY, max: 40 * DAY }),
  fc.tuple(fc.constantFrom(0, 48 * HOUR, 72 * HOUR, 7 * DAY), fc.integer({ min: -1, max: 1 })).map(([boundary, delta]) => boundary + delta))
export const currencyArb = fc.constantFrom('USD', 'GBP', 'EUR', 'CAD')
export const graveArb = fc.record({
  id: fc.uuid(), name: fc.string({ minLength: 1 }).map(name => `Trial ${name}`), priceCents: centsArb,
  currency: currencyArb, cadence: fc.constantFrom(...cadences), status: fc.constantFrom('active', 'cancelled', 'kept'),
  chargeAt: offsetArb.map(offset => new Date(+reference + offset).toISOString()),
}).map(input => trial(input))

export const cancelledArb = fc.tuple(graveArb, offsetArb).map(([grave, offset]): Grave => ({
  ...grave, status: 'cancelled', cancelledAt: new Date(+reference + offset).toISOString(),
}))
