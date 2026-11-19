import { groupCents, totalSavedByCurrency } from './savings'
import { DAY, remainingTime } from './stage'
import type { Grave } from './trial'

export function nextCharge(graves: readonly Grave[], now: Date) {
  let next: Grave | undefined
  let nearest = Infinity
  for (const grave of graves) {
    if (grave.status !== 'active') continue
    const remaining = remainingTime(grave, now)
    if (remaining > 0 && remaining < nearest) { next = grave; nearest = remaining }
  }
  return next
}

export function overdueTrials(graves: readonly Grave[], now: Date) {
  return graves.filter(grave => grave.status === 'active' && remainingTime(grave, now) <= 0)
}

export function atRiskByCurrency(graves: readonly Grave[], now: Date) {
  return groupCents(graves.filter(grave => {
    const remaining = remainingTime(grave, now)
    return grave.status === 'active' && remaining > 0 && remaining <= 7 * DAY
  }))
}

export function summarize(graves: readonly Grave[], now: Date) {
  return { next: nextCharge(graves, now), overdue: overdueTrials(graves, now),
    atRisk: atRiskByCurrency(graves, now), saved: totalSavedByCurrency(graves) }
}
