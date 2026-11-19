import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import fc from 'fast-check'
import { graveArb, offsetArb, reference, trial } from './arbitraries'
import { HOUR, getStage } from './stage'
import { pixelStateFor } from './pixelState'
import { motionFor } from './motion'
import { dailyQuest, levelForXp, MAX_LEVEL, styleUnlocked, totalXp, uniqueXp, xpForLevel, xpProgress, type XpEntry } from './xp'
import { deriveStats } from './stats'
import { summarize } from './selectors'
import { totalSavedByCurrency } from './savings'

const at = (offset: number) => trial({ chargeAt: new Date(+reference + offset).toISOString() })
const ledgerArb = fc.array(fc.record({
  kind: fc.constantFrom('add', 'review', 'cancel'),
  graveId: fc.constantFrom('p1', 'p2', 'p3', 'p4', 'p5'),
  at: offsetArb.map(offset => new Date(+reference + offset).toISOString()),
}))

it.each([
  [0, 'critical', 'Overdue', false, true], [48, 'critical', '48h left', false, true],
  [49, 'warning', '49h left', true, false], [72, 'warning', '72h left', true, false],
  [73, 'normal', '4d left', false, false],
] as const)('maps %i hours to %s', (hours, kind, label, sparks, hand) => {
  expect(pixelStateFor(at(hours * HOUR), reference)).toEqual({ kind, label, sparks, hand })
})
it('renders confirmed cancellations and kept plans without active motions', () => {
  expect(pixelStateFor(trial({ status: 'cancelled' }), reference)).toEqual({ kind: 'cancelled', label: 'Cancelled', sparks: false, hand: false })
  expect(pixelStateFor(trial({ status: 'kept' }), reference)).toEqual({ kind: 'kept', label: 'Kept', sparks: false, hand: false })
})
it('maps urgency monotonically and delegates animation flags to the stage', () => {
  fc.assert(fc.property(offsetArb, offsetArb, (a, b) => {
    const earlier = at(Math.min(a, b))
    const later = at(Math.max(a, b))
    const first = pixelStateFor(earlier, reference)
    const second = pixelStateFor(later, reference)
    const order = ['normal', 'warning', 'critical']
    expect(order.indexOf(first.kind)).toBeGreaterThanOrEqual(order.indexOf(second.kind))
    expect(first).toMatchObject(motionFor(getStage(earlier, reference)))
  }))
})
const entry = (kind: XpEntry['kind'], graveId = 'a') => ({ kind, graveId, at: '2026-11-19T08:00:00+00:00' })

it('awards XP once for each action and caps the daily quest', () => {
  const entries = [entry('add'), entry('review'), entry('cancel'), entry('cancel'), entry('cancel', 'b')]
  expect(totalXp(entries)).toBe(65)
  expect(uniqueXp(entries)).toHaveLength(4)
  expect(dailyQuest(entries, reference)).toBe(1)
  expect(dailyQuest(entries, new Date('2026-11-20T12:00:00Z'))).toBe(0)
  expect(dailyQuest([entry('review')], reference)).toBe(0)
  expect(dailyQuest([{ ...entry('cancel'), at: '2026-11-19T23:00:00-09:00' }], reference)).toBe(1)
})
it('enforces level thresholds, style levels and the level cap', () => {
  expect(levelForXp(99)).toBe(1)
  expect(levelForXp(100)).toBe(2)
  expect(xpProgress(200)).toBe(.5)
  expect(styleUnlocked('mossy', 299)).toBe(false)
  expect(styleUnlocked('mossy', 300)).toBe(true)
  expect(xpProgress(xpForLevel(MAX_LEVEL))).toBe(1)
  expect(levelForXp(xpForLevel(MAX_LEVEL) + 50_000)).toBe(MAX_LEVEL)
})
it('levels never decrease with XP and progress is always between zero and one', () => {
  fc.assert(fc.property(fc.nat(25_000), fc.nat(25_000), (xp, additional) => {
    expect(levelForXp(xp + additional)).toBeGreaterThanOrEqual(levelForXp(xp))
    expect(xpProgress(xp)).toBeGreaterThanOrEqual(0)
    expect(xpProgress(xp)).toBeLessThanOrEqual(1)
  }))
})
it('changing XP, quest state and cosmetics leaves every money figure invariant', () => {
  const source = readFileSync(new URL('./xp.ts', import.meta.url), 'utf8')
  expect(source).not.toMatch(/from ['"].*\/(?:savings|stats|selectors)['"]/)
  fc.assert(fc.property(fc.array(graveArb), ledgerArb, ledgerArb, (graves, before, after) => {
    function financialView(ledger: XpEntry[]) {
      const xp = totalXp(ledger)
      const view = { graves, level: levelForXp(xp), quest: dailyQuest(ledger, reference), mossy: styleUnlocked('mossy', xp) }
      expect([0, 1]).toContain(view.quest)
      const { saved, atRisk } = summarize(view.graves, reference)
      return { saved, atRisk, totals: totalSavedByCurrency(view.graves), stats: deriveStats(view.graves, reference) }
    }
    expect(financialView(before)).toEqual(financialView(after))
  }))
})
