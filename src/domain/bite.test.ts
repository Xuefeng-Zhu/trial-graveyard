import { expect, it } from 'vitest'
import fc from 'fast-check'
import { addDays, formatISO } from 'date-fns'
import { cancelledArb, graveArb, offsetArb, reference, trial } from './arbitraries'
import { getCancelGuide, normalizeService } from './cancelGuides'
import { reminderTimes, buildHauntingIcs } from './haunting'
import { heroCountdown, pickHero, urgency } from './hero'
import { DAY, HOUR } from './stage'
import { atRiskByCurrency, summarize } from './selectors'
import { deriveStats, formatDaysUsed } from './stats'
import { totalSavedByCurrency } from './savings'

it('shows the next future active charge and counts overdue trials separately', () => {
  const now = reference
  const late = trial({ chargeAt: now.toISOString() })
  const next = trial({ chargeAt: new Date(+now + 3 * HOUR).toISOString() })
  const later = trial({ chargeAt: new Date(+now + 57 * HOUR).toISOString(), currency: 'CAD' })
  const kept = trial({ status: 'kept' })
  const graves = [late, later, kept, next]
  expect(pickHero(graves, now)).toBe(next)
  expect(summarize(graves, now)).toMatchObject({ overdue: [late], atRisk: { USD: 1399, CAD: 1399 } })
  expect(pickHero([late, kept], now)).toBeUndefined()
  expect(heroCountdown(later, now)).toEqual({ days: 2, hours: 9, text: 'turns in 2d 9h' })
})
it.each([
  [24, 'rising'], [24.01, 'restless'], [72, 'restless'], [72.01, 'uneasy'], [168, 'uneasy'], [168.01, 'calm'],
])('labels the hero at %i hours as %s', (hours, expected) => {
  expect(urgency(trial({ chargeAt: new Date(+reference + Number(hours) * HOUR).toISOString() }), reference)).toBe(expected)
})
it('always picks the minimum upcoming active charge and keeps countdowns nonnegative', () => {
  fc.assert(fc.property(fc.array(graveArb), offsetArb, (graves, offset) => {
    const now = new Date(+reference + offset)
    const upcoming = graves.filter(grave => grave.status === 'active' && Date.parse(grave.chargeAt) > +now)
    const next = pickHero(graves, now)
    if (!upcoming.length) expect(next).toBeUndefined()
    else {
      expect(next?.status).toBe('active')
      expect(Date.parse(next!.chargeAt)).toBeGreaterThan(+now)
      expect(Date.parse(next!.chargeAt)).toBe(Math.min(...upcoming.map(grave => Date.parse(grave.chargeAt))))
    }
    for (const grave of graves) {
      const count = heroCountdown(grave, now)
      expect(count.days).toBeGreaterThanOrEqual(0)
      expect(count.hours).toBeGreaterThanOrEqual(0)
      expect(count.hours).toBeLessThan(24)
    }
    const thisWeek = upcoming.filter(grave => Date.parse(grave.chargeAt) <= +now + 7 * DAY)
    const expected = thisWeek.reduce<Record<string, number>>((totals, grave) => {
      totals[grave.currency] = (totals[grave.currency] ?? 0) + grave.priceCents
      return totals
    }, {})
    expect(atRiskByCurrency(graves, now)).toEqual(expected)
  }))
})
it('keeps lifetime savings consistent with stats and counts pre-charge results by year', () => {
  const lived = trial({ status: 'cancelled', cancelledAt: reference.toISOString() })
  const earlier = trial({ status: 'cancelled', cancelledAt: '2025-01-01T00:00:00Z', createdAt: '2024-12-01T00:00:00Z' })
  const alreadyCharged = trial({ status: 'cancelled', cancelledAt: '2026-11-23T01:00:00Z' })
  const missingDate = trial({ status: 'cancelled' })
  const stats = deriveStats([lived, earlier, alreadyCharged, missingDate], reference)
  expect(stats.confirmedCancellations).toBe(4)
  expect(stats.saved).toEqual({ USD: 5596 })
  expect(stats.survived).toBe(2)
  expect(stats.dodged).toEqual({ USD: 1399 })
  expect(deriveStats([trial()], reference).avgDaysUsed).toBeNull()
  expect(formatDaysUsed(0)).toBe('Less than a day')
  expect(formatDaysUsed(null)).toBe('No cancellation history')
  expect(formatDaysUsed(1)).toBe('1 day')
  expect(formatDaysUsed(1.6)).toBe('1.6 days')
  fc.assert(fc.property(fc.array(cancelledArb), fc.array(graveArb), (cancelled, other) => {
    const graves = [...cancelled, ...other]
    expect(summarize(graves, reference).saved).toEqual(deriveStats(graves, reference).saved)
    expect(totalSavedByCurrency(graves)).toEqual(deriveStats(graves, reference).saved)
    const qualifying = graves.filter(grave => grave.status === 'cancelled' && grave.cancelledAt
      && Date.parse(grave.cancelledAt) < Date.parse(grave.chargeAt) && new Date(grave.cancelledAt).getFullYear() === reference.getFullYear())
    expect(deriveStats(graves, reference).dodged).toEqual(totalSavedByCurrency(qualifying))
  }))
})
it('prioritizes saved cancellation URLs and keeps fallback links clear', () => {
  expect(normalizeService(' Grimoire + ! ')).toBe('grimoire+')
  expect(getCancelGuide('WRAITHWAVE PREMIUM').url).toBe('https://wraithwave.example/account')
  expect(getCancelGuide('Wraithwave Premium', 'https://service.test/cancel')).toMatchObject({ url: 'https://service.test/cancel', demo: false })
  expect(getCancelGuide('Wraithwave Premium', 'javascript:evil')).toMatchObject({ url: 'https://wraithwave.example/account', demo: true })
  expect(getCancelGuide('Moth Audio')).toMatchObject({ url: undefined, demo: false, searchUrl: 'https://www.google.com/' })
  expect(getCancelGuide('Moth Audio').steps).toHaveLength(3)
})
it('keeps calendar reminders at the correct elapsed and local times across month ends and DST', () => {
  const old = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'
  try {
    fc.assert(fc.property(
      fc.constantFrom(new Date(2024, 1, 29, 12), new Date(2026, 2, 8, 12), new Date(2026, 10, 1, 12), new Date(2026, 11, 31, 12)),
      fc.constantFrom(7, 14, 30), fc.integer({ min: 0, max: 23 }),
      (boundary, length, hour) => {
        const created = addDays(boundary, -length)
        const charge = addDays(created, length)
        charge.setHours(hour, 0, 0, 0)
        const { early, morning } = reminderTimes(formatISO(charge))
        expect(+charge - +early).toBe(48 * HOUR)
        expect(+morning).toBeLessThanOrEqual(+charge)
        expect(morning.getDate()).toBe(charge.getDate())
        expect(morning.getHours()).toBe(Math.min(charge.getHours(), 9))
      }))
    expect(reminderTimes('2026-03-08T12:00:00-07:00').morning.toISOString()).toBe('2026-03-08T16:00:00.000Z')
    expect(reminderTimes('2026-11-01T12:00:00-08:00').morning.toISOString()).toBe('2026-11-01T17:00:00.000Z')
  } finally {
    if (old === undefined) delete process.env.TZ
    else process.env.TZ = old
  }
})
it('exports both alarms, stable UIDs, UTF-8 folding and RFC text escaping', () => {
  const file = buildHauntingIcs([trial({ id: 'two', name: 'é'.repeat(90) + ',;\nB' })], reference)
  const flat = file.replaceAll('\r\n ', '')
  expect(flat.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  expect(flat.match(/TRIGGER:PT0S/g)).toHaveLength(2)
  expect(flat).toContain('UID:two-48h@trial-graveyard')
  expect(flat).toContain('UID:two-morning@trial-graveyard')
  expect(flat).toContain('\\,\\;\\nB')
  expect(file.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/)
  expect(file.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true)
})
