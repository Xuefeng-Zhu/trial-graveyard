import { cadenceSuffix, epitaph, formatMoney } from './savings'
import type { Grave } from './trial'

const month = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' })

export function formatEpitaph(grave: Grave) {
  if (!grave.cancelledAt) return epitaph(grave)
  const price = formatMoney(grave.priceCents, grave.currency) + cadenceSuffix[grave.cadence]
  return `Here lies ${grave.name} · ${price} · slain ${month.format(new Date(grave.cancelledAt))}`
}
