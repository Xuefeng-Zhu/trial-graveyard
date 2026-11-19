import { formatMoney } from './savings';
import type { Cadence, Grave } from './trial';

const SHORT: Record<Cadence, string> = { weekly: 'wk', monthly: 'mo', yearly: 'yr', 'one-time': '' };

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "Here lies Phantomflix · $13.99/mo · slain Nov 2026". Month and year are read in UTC so output never depends on the machine's zone. */
export function formatEpitaph(
  grave: Pick<Grave, 'name' | 'priceCents' | 'currency' | 'cadence' | 'cancelledAt' | 'createdAt'>,
): string {
  const suffix = SHORT[grave.cadence] ? `/${SHORT[grave.cadence]}` : '';
  const price = formatMoney(grave.priceCents, grave.currency) + suffix;
  const slain = MONTH_YEAR.format(new Date(grave.cancelledAt ?? grave.createdAt));
  return `Here lies ${grave.name} · ${price} · slain ${slain}`;
}
