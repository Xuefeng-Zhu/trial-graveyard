import { MS_PER_DAY, remainingMs } from './stage';
import { totalSavedByCurrency } from './savings';
import type { CurrencyTotal } from './savings';
import type { Grave } from './trial';

/** Active trials whose charge time has passed. Soonest-passed first, ties by input order. */
export function overdueTrials(graves: readonly Grave[], now: Date): Grave[] {
  return graves
    .filter((g) => g.status === 'active' && remainingMs(g, now) <= 0)
    .sort((a, b) => Date.parse(a.chargeAt) - Date.parse(b.chargeAt));
}

/** The one shared "next charge": the active trial with the soonest charge strictly in the future. Never overdue. */
export function nextCharge(graves: readonly Grave[], now: Date): Grave | undefined {
  let best: Grave | undefined;
  let bestRemaining = Infinity;
  for (const g of graves) {
    if (g.status !== 'active') continue;
    const remaining = remainingMs(g, now);
    if (remaining > 0 && remaining < bestRemaining) {
      best = g;
      bestRemaining = remaining;
    }
  }
  return best;
}

export const AT_RISK_WINDOW_MS = 7 * MS_PER_DAY;

/**
 * Money that will be charged within the window (default 7 days) if nothing is cancelled, per currency.
 * Active trials only, upcoming only (overdue trials are listed separately).
 */
export function atRiskByCurrency(
  graves: readonly Grave[],
  now: Date,
  windowMs: number = AT_RISK_WINDOW_MS,
): CurrencyTotal[] {
  const upcoming = graves.filter((g) => {
    if (g.status !== 'active') return false;
    const remaining = remainingMs(g, now);
    return remaining > 0 && remaining <= windowMs;
  });
  const totals = new Map<string, number>();
  for (const g of upcoming) totals.set(g.currency, (totals.get(g.currency) ?? 0) + g.priceCents);
  return [...totals.entries()]
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => a.currency.localeCompare(b.currency, 'en'));
}

export interface SavingsSummary {
  /** Cancelled trials. The count behind every saved figure. */
  cancelledCount: number;
  /** Money saved per currency: one charge per cancelled trial. */
  saved: CurrencyTotal[];
  /** Active trials past their charge time. */
  overdueCount: number;
}

/** Single source for the saved and stats figures, so they cannot disagree. */
export function summarize(graves: readonly Grave[], now: Date): SavingsSummary {
  return {
    cancelledCount: graves.filter((g) => g.status === 'cancelled').length,
    saved: totalSavedByCurrency(graves),
    overdueCount: overdueTrials(graves, now).length,
  };
}
