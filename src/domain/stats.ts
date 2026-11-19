import { differenceInMilliseconds, parseISO } from 'date-fns';
import { MS_PER_DAY } from './stage';
import type { CurrencyTotal } from './savings';
import { summarize } from './selectors';
import type { Grave } from './trial';

export interface HackerStats {
  /** Cancelled trials. Same count and same graves as "Souls saved". */
  survived: number;
  /** Money dodged by every cancelled trial, per currency. Equals the saved totals. */
  dodged: CurrencyTotal[];
  /** Mean days between adding a trial and cancelling it, over cancelled trials with a valid cancel time. Null with none. */
  avgDaysUsed: number | null;
  /** Overdue trials: active, with the charge time already passed. */
  overdue: number;
}

/** Derives the trial-hacker stats from the same summary that feeds "Souls saved". */
export function deriveStats(graves: readonly Grave[], now: Date): HackerStats {
  const summary = summarize(graves, now);
  let daysTotal = 0;
  let counted = 0;
  for (const g of graves) {
    if (g.status !== 'cancelled' || g.cancelledAt === undefined) continue;
    const at = parseISO(g.cancelledAt).getTime();
    if (Number.isNaN(at)) continue;
    counted += 1;
    daysTotal += Math.max(0, differenceInMilliseconds(at, parseISO(g.createdAt))) / MS_PER_DAY;
  }
  return {
    survived: summary.cancelledCount,
    dodged: summary.saved,
    avgDaysUsed: counted === 0 ? null : daysTotal / counted,
    overdue: summary.overdueCount,
  };
}

/** "None yet", "Less than a day" (instead of "0.0 days"), or "2.5 days". */
export function formatAvgDays(avg: number | null): string {
  if (avg === null) return 'None yet';
  const rounded = Math.round(avg * 10) / 10;
  if (rounded === 0) return 'Less than a day';
  return `${rounded.toFixed(1)} ${rounded === 1 ? 'day' : 'days'}`;
}
