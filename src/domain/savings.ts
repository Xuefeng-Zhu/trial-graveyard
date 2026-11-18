import type { Cadence, Grave } from './trial';

/** Monthly-equivalent of a price in cents. Rounds once, to the nearest cent. */
export function monthlyCents(priceCents: number, cadence: Cadence): number {
  switch (cadence) {
    case 'weekly':
      return Math.round((priceCents * 52) / 12);
    case 'monthly':
      return priceCents;
    case 'yearly':
      return Math.round(priceCents / 12);
    case 'one-time':
      return 0;
  }
}

/** Saved by cancelling: the one charge avoided. Zero for graves that are not cancelled. */
export function savedCents(grave: Pick<Grave, 'status' | 'priceCents'>): number {
  return grave.status === 'cancelled' ? grave.priceCents : 0;
}

export interface CurrencyTotal {
  currency: string;
  cents: number;
}

/** Sums saved cents per currency, sorted by currency code. Never mixes currencies. */
export function totalSavedByCurrency(
  graves: ReadonlyArray<Pick<Grave, 'status' | 'priceCents' | 'currency'>>,
): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const grave of graves) {
    if (grave.status !== 'cancelled') continue;
    totals.set(grave.currency, (totals.get(grave.currency) ?? 0) + grave.priceCents);
  }
  return [...totals.entries()]
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => a.currency.localeCompare(b.currency, 'en'));
}

/** Formats integer cents for display, e.g. 1495 USD -> "$14.95". Unknown currency codes fall back to "14.95 XYZ". */
export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

const CADENCE_SUFFIX: Record<Cadence, string> = {
  'one-time': '',
  weekly: '/wk',
  monthly: '/mo',
  yearly: '/yr',
};

/** "Here lies Audible. Saved you $14.95/mo." */
export function epitaph(grave: Pick<Grave, 'name' | 'priceCents' | 'currency' | 'cadence'>): string {
  const price = formatMoney(grave.priceCents, grave.currency) + CADENCE_SUFFIX[grave.cadence];
  return `Here lies ${grave.name}. Saved you ${price}.`;
}
