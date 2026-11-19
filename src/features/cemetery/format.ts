import { countdown, getViewState, remainingMs, stageLabel } from '../../domain/stage';
import { formatMoney } from '../../domain/savings';
import type { Grave } from '../../domain/trial';
import { pixelStateFor } from '../../domain/pixelState';

export const CADENCE_SUFFIX = { 'one-time': '', weekly: '/wk', monthly: '/mo', yearly: '/yr' } as const;

export const priceText = (g: Grave): string => `${formatMoney(g.priceCents, g.currency)}${CADENCE_SUFFIX[g.cadence]}`;

/** Short text under a gravestone: "11 days", "48h left", "Overdue", "Cancelled" or "Kept". Always words, never colour alone. */
export function statusText(grave: Grave, now: Date): string {
  const state = pixelStateFor(grave, now);
  if (state.badge) return state.badge;
  const c = countdown(remainingMs(grave, now));
  return c ? `${c.value} ${c.value === 1 ? 'day' : 'days'}` : 'Due';
}

/** Longer wording for assistive tech, e.g. "Zombie, charges in 5 hours". */
export function longStatus(grave: Grave, now: Date): string {
  const view = getViewState(grave, now);
  if (view.kind === 'grave') return stageLabel(view.stage, view.remainingMs);
  if (view.kind === 'tombstone') return `Cancelled, saved ${formatMoney(view.savedCents, grave.currency)}`;
  return `Kept, haunting you for ${formatMoney(view.monthlyCents, grave.currency)}/mo`;
}

const RANK = { active: 0, kept: 1, cancelled: 2 } as const;

/** Active trials first by charge time, then kept, then cancelled. Ties by name. */
export function byUrgency(a: Grave, b: Grave): number {
  return (
    RANK[a.status] - RANK[b.status] ||
    Date.parse(a.chargeAt) - Date.parse(b.chargeAt) ||
    a.name.localeCompare(b.name, 'en')
  );
}

/** The most urgent active trial, if any. */
export function nextToRise(graves: readonly Grave[]): Grave | undefined {
  return graves.filter((g) => g.status === 'active').sort(byUrgency)[0];
}

export const toneOf = (kind: ReturnType<typeof pixelStateFor>['kind']): 'neutral' | 'warning' | 'critical' | 'success' | 'info' =>
  ({ normal: 'neutral', warning: 'warning', critical: 'critical', cancelled: 'success', kept: 'info' } as const)[kind];
