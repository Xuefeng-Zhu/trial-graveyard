import { totalSavedByCurrency } from './savings'
import type { Grave } from './trial'

export function buildShareSummary(graves: readonly Grave[]) {
  return {
    totals: Object.entries(totalSavedByCurrency(graves)).sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, cents]) => ({ currency, cents })),
    slain: graves.filter(grave => grave.status === 'cancelled').length,
  }
}
