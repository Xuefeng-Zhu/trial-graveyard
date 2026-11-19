import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { centsArb, graveArb, offsetArb, reference, trial } from './arbitraries'
import { byCharge, countdown, DAY, getStage, getViewState, HOUR, stages } from './stage'
import { epitaph, formatMoney, monthlyCents, savedCents, totalSavedByCurrency } from './savings'
import { buildIcs, escapeText, foldLine } from './ics'
import { cadences, createGrave, validIso, validUrl, validateTrial } from './trial'

const at = (offset: number) => trial({ chargeAt: new Date(+reference + offset).toISOString() })
const stage = (offset: number) => getStage(at(offset), reference)
const rank = (offset: number) => stages.indexOf(stage(offset))
const forAll = <T>(arb: fc.Arbitrary<T>, test: (input: T) => void) => fc.assert(fc.property(arb, input => { test(input) }))

describe('stage boundaries', () => {
  for (const [hours, before, after] of [[0, 'overdue', 'zombie'], [48, 'zombie', 'churning'], [72, 'churning', 'cracked'], [168, 'cracked', 'sealed']] as const) {
    it.each(Array.from({ length: 81 }, (_, i) => i - 40))(`at ${hours}h plus %i ms`, delta => {
      expect(stage(hours * HOUR + delta)).toBe(delta <= 0 ? before : after)
    })
  }
  it('P-S1 returns a known stage', () => forAll(offsetArb, offset => expect(stages).toContain(stage(offset))))
  it('P-S2 gives the exact boundary the more urgent state', () => forAll(fc.constantFrom(0, 48, 72, 168), hours => expect(rank(hours * HOUR)).toBe(rank(hours * HOUR + 1) + 1)))
  it('P-S3 is monotonic across remaining times', () => forAll(fc.tuple(offsetArb, offsetArb), ([a, b]) => expect(rank(Math.min(a, b))).toBeGreaterThanOrEqual(rank(Math.max(a, b)))))
  it('P-S4 gets more urgent as the clock advances', () => forAll(fc.tuple(offsetArb, fc.nat()), ([offset, step]) => {
    expect(stages.indexOf(getStage(at(offset), new Date(+reference + step)))).toBeGreaterThanOrEqual(rank(offset))
  }))
  it('P-S5 is invariant when both clocks shift', () => forAll(fc.tuple(offsetArb, offsetArb), ([offset, shift]) => {
    expect(getStage(at(offset + shift), new Date(+reference + shift))).toBe(stage(offset))
  }))
  it('P-S6 gates stage by status', () => forAll(graveArb, grave => {
    expect(getViewState(grave, reference).kind).toBe({ cancelled: 'tombstone', kept: 'ghost', active: 'grave' }[grave.status])
  }))
  it('P-S7 agrees with an independent severity oracle', () => forAll(offsetArb, offset => {
    const hours = offset / HOUR
    expect(rank(offset)).toBe(hours <= 0 ? 4 : Number(hours <= 168) + Number(hours <= 72) + Number(hours <= 48))
  }))
  it('P-S8 rounds up in the displayed unit', () => forAll(offsetArb, offset => {
    if (offset <= 0) expect(countdown(offset)).toBe('Overdue')
    else expect(countdown(offset)).toBe(offset <= 72 * HOUR ? `${Math.ceil(offset / HOUR)}h left` : `${Math.ceil(offset / DAY)}d left`)
  }))
  it('sorts by instant', () => expect([at(1000), at(0)].sort(byCharge)).toEqual([at(0), at(1000)]))
})

describe('savings and validation', () => {
  it('P-M1 through P-M3b preserve integer math across cadences', () => forAll(centsArb, price => {
    for (const [cadence, factor] of [['weekly', 52], ['monthly', 12], ['yearly', 1], ['one-time', 0]] as const) {
      const grave = trial({ priceCents: price, cadence, status: 'cancelled' })
      const monthly = monthlyCents(grave)
      expect(monthly).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(monthly)).toBe(true)
      expect(Math.abs(monthly * 12 - price * factor)).toBeLessThanOrEqual(6)
      expect(savedCents(grave)).toBe(price)
    }
  }))
  it('P-M4 through P-M8 sum only cancelled graves, by currency and independently of order', () => forAll(fc.tuple(fc.array(graveArb), fc.array(graveArb)), ([a, b]) => {
    const graves = a.concat(b)
    const sum = totalSavedByCurrency(graves)
    expect(totalSavedByCurrency([...graves].reverse())).toEqual(sum)
    for (const currency of ['USD', 'EUR', 'GBP', 'CAD']) {
      const filtered = graves.filter(grave => grave.currency === currency)
      expect(sum[currency] ?? 0).toBe(filtered.reduce((total, grave) => total + savedCents(grave), 0))
      expect(sum[currency] ?? 0).toBe((totalSavedByCurrency(a)[currency] ?? 0) + (totalSavedByCurrency(b)[currency] ?? 0))
    }
    expect(totalSavedByCurrency([])).toEqual({})
  }))
  it('formats an epitaph', () => expect(epitaph(trial({ status: 'cancelled' }))).toContain('$13.99/mo'))
  it('formats non-USD cents', () => expect(formatMoney(1245, 'EUR')).toBe('€12.45'))
  it('creates an active record, trimming the name and assigning a UUID', () => {
    const grave = createGrave({ ...trial(), name: ' Acme ' }, reference)
    expect(grave.name).toBe('Acme')
    expect(grave.id).toMatch(/^[a-f0-9-]{36}$/)
    expect(grave.status).toBe('active')
  })
  it.each(['', '2026-02-29T12:00:00Z', '2026-11-19', 'abcdef'])('rejects malformed date %s', date => expect(validIso(date)).toBe(false))
  it.each(['https://site.example', 'http://site.example:8000'])('accepts URL %s', url => expect(validUrl(url)).toBe(true))
  it.each(['javascript:alert(1)', 'https://user:pw@example.org', 'https://host:pw@example.org', 'https://user@example.org', 'example.org'])
    ('rejects unsafe URL %s', url => expect(validUrl(url)).toBe(false))
  it.each(cadences)('accepts cadence %s and a zero price', cadence => expect(validateTrial(trial({ cadence, priceCents: 0 }))).toEqual({}))
  it('reports each bad field', () => {
    const errors = validateTrial(trial({ name: ' ', chargeAt: '?', priceCents: -1, currency: 'dollar', cadence: 'daily' as 'monthly', cancelUrl: 'javascript:a' }))
    expect(Object.keys(errors)).toEqual(['name', 'chargeAt', 'priceCents', 'currency', 'cadence', 'cancelUrl'])
    for (const priceCents of [1.1, NaN, 1e12]) expect(validateTrial(trial({ priceCents })).priceCents).toBeTruthy()
    expect(validateTrial(trial({ cancelUrl: 'https://test.example' }))).toEqual({})
  })
})

describe('calendar', () => {
  it('escapes text and folds at octet boundaries', () => {
    expect(escapeText('a,;\\\r\nb\nc\rd')).toBe('a\\,\\;\\\\\\nb\\nc\\nd')
    expect(foldLine('a'.repeat(74) + 'é')).toBe('a'.repeat(74) + '\r\n é')
  })
  it('keeps stable UIDs and local charge dates', () => {
    const text = buildIcs([trial({ cancelUrl: 'https://test.example/account' })], reference)
    for (const value of ['UID:fixture@trial-graveyard', 'DTSTAMP:20261119T120000Z', 'DTSTART;VALUE=DATE:20261121', 'TRIGGER:-PT24H', 'DESCRIPTION:https://test.example/account']) expect(text).toContain(value)
  })
  it('P-I1 generates CRLF, escaped text and lines that fit within 75 bytes', () => forAll(fc.array(graveArb), graves => {
    const file = buildIcs(graves, reference)
    expect(file.endsWith('\r\n')).toBe(true)
    expect(file.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/)
    for (const line of file.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const unfolded = file.replaceAll('\r\n ', '')
    expect(unfolded.match(/BEGIN:VEVENT/g)?.length ?? 0).toBe(graves.length)
    for (const entry of unfolded.matchAll(/SUMMARY:(.*)/g)) expect(entry[1]).not.toMatch(/(?<!\\)[,;]/)
  }))
})
