import { groupCents, totalSavedByCurrency } from './savings'
import { overdueTrials } from './selectors'
import { DAY } from './stage'
import type { Grave } from './trial'

export function deriveStats(graves: readonly Grave[], now: Date) {
  const cancelled = graves.filter(grave => grave.status === 'cancelled')
  const dated = cancelled.filter(grave => grave.cancelledAt !== undefined)
  const survived = dated.filter(grave => Date.parse(grave.cancelledAt!) < Date.parse(grave.chargeAt))
  const thisYear = survived.filter(grave => new Date(grave.cancelledAt!).getFullYear() === now.getFullYear())
  return {
    confirmedCancellations: cancelled.length,
    saved: totalSavedByCurrency(graves),
    survived: survived.length,
    dodged: groupCents(thisYear),
    avgDaysUsed: dated.length ? dated.reduce((sum, grave) =>
      sum + Math.max(0, Date.parse(grave.cancelledAt!) - Date.parse(grave.createdAt)), 0) / dated.length / DAY : null,
    overdue: overdueTrials(graves, now).length,
  }
}

export function formatDaysUsed(days: number | null) {
  if (days === null) return 'No cancellation history'
  if (days < 1) return 'Less than a day'
  return `${Number(days.toFixed(1))} ${Number(days.toFixed(1)) === 1 ? 'day' : 'days'}`
}
