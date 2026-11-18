import { savedCents, monthlyCents, epitaph } from './savings';
import type { Grave } from './trial';

export type Stage = 'sealed' | 'cracked' | 'churning' | 'zombie' | 'overdue';

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * First row where `R <= limit` wins; otherwise `sealed`.
 * Each boundary belongs to the more urgent stage.
 */
export const THRESHOLDS: ReadonlyArray<readonly [number, Stage]> = [
  [0, 'overdue'],
  [48 * MS_PER_HOUR, 'zombie'],
  [72 * MS_PER_HOUR, 'churning'],
  [168 * MS_PER_HOUR, 'cracked'],
];

export const STAGE_SEVERITY: Record<Stage, number> = {
  sealed: 0,
  cracked: 1,
  churning: 2,
  zombie: 3,
  overdue: 4,
};

export type ViewState =
  | { kind: 'grave'; stage: Stage; remainingMs: number }
  | { kind: 'tombstone'; epitaph: string; savedCents: number }
  | { kind: 'ghost'; monthlyCents: number };

/** Remaining time `R = chargeAt - now` in milliseconds. */
export function remainingMs(grave: Pick<Grave, 'chargeAt'>, now: Date): number {
  return Date.parse(grave.chargeAt) - now.getTime();
}

export function stageForRemaining(remaining: number): Stage {
  for (const [limit, stage] of THRESHOLDS) {
    if (remaining <= limit) return stage;
  }
  return 'sealed';
}

/** Urgency stage from elapsed time. Callers should gate on `status === 'active'` (see getViewState). */
export function getStage(grave: Pick<Grave, 'chargeAt'>, now: Date): Stage {
  return stageForRemaining(remainingMs(grave, now));
}

export function getViewState(grave: Grave, now: Date): ViewState {
  switch (grave.status) {
    case 'cancelled':
      return { kind: 'tombstone', epitaph: epitaph(grave), savedCents: savedCents(grave) };
    case 'kept':
      return { kind: 'ghost', monthlyCents: monthlyCents(grave.priceCents, grave.cadence) };
    case 'active': {
      const remaining = remainingMs(grave, now);
      return { kind: 'grave', stage: stageForRemaining(remaining), remainingMs: remaining };
    }
  }
}

export interface Countdown {
  unit: 'hours' | 'days';
  value: number;
  text: string;
}

/**
 * Countdown for `remaining > 0`. Up to 72 hours it counts hours, beyond that days,
 * always rounded up. Returns undefined when the charge time has passed.
 */
export function countdown(remaining: number): Countdown | undefined {
  if (!(remaining > 0)) return undefined;
  const unit = remaining <= 72 * MS_PER_HOUR ? 'hours' : 'days';
  const value = Math.ceil(remaining / (unit === 'hours' ? MS_PER_HOUR : MS_PER_DAY));
  const noun = value === 1 ? unit.slice(0, -1) : unit;
  return { unit, value, text: `charges in ${value} ${noun}` };
}

const STAGE_NAMES: Record<Stage, string> = {
  sealed: 'Sealed',
  cracked: 'Cracked',
  churning: 'Churning',
  zombie: 'Zombie',
  overdue: 'Overdue',
};

/** Text for the stage so colour or animation is never the only signal, e.g. "Zombie, charges in 5 hours". */
export function stageLabel(stage: Stage, remaining: number): string {
  const c = countdown(remaining);
  return c ? `${STAGE_NAMES[stage]}, ${c.text}` : `${STAGE_NAMES[stage]}, charge date has passed`;
}
