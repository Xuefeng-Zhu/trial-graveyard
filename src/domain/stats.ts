import { differenceInMilliseconds, getYear, parseISO } from 'date-fns';
import { MS_PER_DAY } from './stage';
import type { CurrencyTotal } from './savings';
import type { Grave } from './trial';

export interface HackerStats {
  /** Trials buried before they charged. */
  survived: number;
  /** Money dodged by trials buried this calendar year, per currency. */
  dodged: CurrencyTotal[];
  /** Mean days between adding a trial and cancelling it, or null with no cancellations. */
  avgDaysUsed: number | null;
  /** Trials that charged before they were cancelled or while still active or kept. */
  escaped: number;
}

/** Derives the trial-hacker stats from the graves alone. */
export function deriveStats(graves: readonly Grave[], now: Date): HackerStats {
  const year = getYear(now);
  const dodged = new Map<string, number>();
  let survived = 0;
  let escaped = 0;
  let daysTotal = 0;
  let cancelledCount = 0;

  for (const g of graves) {
    const charge = parseISO(g.chargeAt).getTime();
    if (g.status === 'cancelled') {
      const at = g.cancelledAt === undefined ? NaN : parseISO(g.cancelledAt).getTime();
      if (Number.isNaN(at)) continue;
      cancelledCount += 1;
      daysTotal += Math.max(0, differenceInMilliseconds(at, parseISO(g.createdAt))) / MS_PER_DAY;
      if (at < charge) {
        survived += 1;
        if (getYear(at) === year) dodged.set(g.currency, (dodged.get(g.currency) ?? 0) + g.priceCents);
      }
    } else if (charge <= now.getTime()) {
      escaped += 1;
    }
  }

  return {
    survived,
    dodged: [...dodged.entries()]
      .map(([currency, cents]) => ({ currency, cents }))
      .sort((a, b) => a.currency.localeCompare(b.currency, 'en')),
    avgDaysUsed: cancelledCount === 0 ? null : daysTotal / cancelledCount,
    escaped,
  };
}
