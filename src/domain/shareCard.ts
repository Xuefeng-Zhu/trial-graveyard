import { totalSavedByCurrency } from './savings';
import type { CurrencyTotal } from './savings';
import type { Grave } from './trial';

export interface ShareSummary {
  totals: CurrencyTotal[];
  slain: number;
}

/** Totals and slain count from cancelled graves only. Carries no names or URLs. */
export function buildShareSummary(graves: ReadonlyArray<Pick<Grave, 'status' | 'priceCents' | 'currency'>>): ShareSummary {
  return {
    totals: totalSavedByCurrency(graves),
    slain: graves.filter((g) => g.status === 'cancelled').length,
  };
}
