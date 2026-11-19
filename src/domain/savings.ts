import type { Cadence, Grave } from './trial'

export const cadenceSuffix: Record<Cadence, string> = { 'one-time': '', weekly: '/wk', monthly: '/mo', yearly: '/yr' }
export function monthlyCents({ priceCents, cadence }: Pick<Grave, 'priceCents' | 'cadence'>) {
  switch (cadence) {
    case 'weekly': return Math.round(priceCents * 52 / 12)
    case 'monthly': return priceCents
    case 'yearly': return Math.round(priceCents / 12)
    case 'one-time': return 0
  }
}

export function savedCents(grave: Grave) {
  return grave.status === 'cancelled' ? grave.priceCents : 0
}

export function groupCents(graves: readonly Grave[]) {
  const totals = new Map<string, number>()
  for (const grave of graves) {
    totals.set(grave.currency, (totals.get(grave.currency) ?? 0) + grave.priceCents)
  }
  return Object.fromEntries(totals)
}

export function totalSavedByCurrency(graves: readonly Grave[]) {
  return groupCents(graves.filter(grave => grave.status === 'cancelled'))
}

export function formatMoney(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function epitaph(grave: Grave) {
  return `Here lies ${grave.name}. Saved you ${formatMoney(savedCents(grave), grave.currency)}${cadenceSuffix[grave.cadence]}.`
}
