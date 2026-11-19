import { expect, it } from 'vitest'
import fc from 'fast-check'
import { cancelledArb, graveArb, trial } from './arbitraries'
import { formatEpitaph } from './epitaph'
import { cadenceSuffix, formatMoney, totalSavedByCurrency } from './savings'
import { buildShareSummary } from './shareCard'

it.each([
  [trial({ status: 'cancelled', cancelledAt: '2026-11-02T10:00:00Z' }), 'Here lies Phantomflix · $13.99/mo · slain Nov 2026'],
  [trial({ status: 'cancelled', currency: 'EUR', cadence: 'one-time', cancelledAt: '2026-12-01T01:00:00+02:00' }), 'Here lies Phantomflix · €13.99 · slain Nov 2026'],
  [trial({ status: 'cancelled' }), 'Here lies Phantomflix. Saved you $13.99/mo.'],
] as const)('formats the date and price for $0.cadence', (grave, expected) => expect(formatEpitaph(grave)).toBe(expected))

it('P-E1 through P-E5 preserve the name, exact price and UTC month deterministically', () => {
  fc.assert(fc.property(cancelledArb, grave => {
    const result = formatEpitaph(grave)
    const month = new Date(grave.cancelledAt!).toUTCString().slice(8, 16)
    expect(result).toBe(`Here lies ${grave.name} · ${formatMoney(grave.priceCents, grave.currency)}${cadenceSuffix[grave.cadence]} · slain ${month}`)
    expect(result).not.toMatch(/undefined|NaN/)
    expect(formatEpitaph(grave)).toBe(result)
  }))
})
it('P-T1 through P-T5 filter and sum cancellations and revert exactly after undo', () => {
  fc.assert(fc.property(fc.array(graveArb), cancelledArb, (graves, cancelled) => {
    const before = totalSavedByCurrency(graves)
    const withCancellation = totalSavedByCurrency([...graves, cancelled])
    expect(totalSavedByCurrency([cancelled, ...graves].reverse())).toEqual(withCancellation)
    expect(withCancellation[cancelled.currency]).toBe((before[cancelled.currency] ?? 0) + cancelled.priceCents)
    expect(totalSavedByCurrency([...graves, { ...cancelled, status: 'active' }])).toEqual(before)
    expect(totalSavedByCurrency([...graves, { ...cancelled, status: 'kept' }])).toEqual(before)
    expect(Object.values(withCancellation).every(count => count >= 0)).toBe(true)
  }))
})
it('shares currency totals and cancellation count only', () => {
  expect(buildShareSummary([trial(), trial({ status: 'cancelled' }), trial({ currency: 'EUR', status: 'cancelled' })]))
    .toEqual({ totals: [{ currency: 'EUR', cents: 1399 }, { currency: 'USD', cents: 1399 }], slain: 2 })
  fc.assert(fc.property(fc.array(graveArb), graves => {
    const privateGraves = graves.map((grave, index) => ({ ...grave, name: `Private service ${index}`, cancelUrl: `https://private.example/${index}` }))
    const summary = buildShareSummary(privateGraves)
    expect(summary).toEqual(buildShareSummary(graves))
    expect(JSON.stringify(summary)).not.toMatch(/Private service|private\.example/)
  }))
})
