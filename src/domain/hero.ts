import { MS_PER_DAY, MS_PER_HOUR, remainingMs } from './stage';
import type { Grave } from './trial';

export type Urgency = 'calm' | 'uneasy' | 'restless' | 'rising';

export interface HeroCountdown {
  days: number;
  hours: number;
  text: string;
}

/** The active grave with the nearest charge time that is still in the future, if any. */
export function pickHero(graves: readonly Grave[], now: Date): Grave | undefined {
  let best: Grave | undefined;
  let bestRemaining = Infinity;
  for (const grave of graves) {
    if (grave.status !== 'active') continue;
    const remaining = remainingMs(grave, now);
    if (remaining > 0 && remaining < bestRemaining) {
      best = grave;
      bestRemaining = remaining;
    }
  }
  return best;
}

/** Whole days and hours left, clamped at zero. Text reads "turns in 2d 5h". */
export function heroCountdown(remaining: number): HeroCountdown {
  const safe = Math.max(0, Number.isFinite(remaining) ? remaining : 0);
  const days = Math.floor(safe / MS_PER_DAY);
  const hours = Math.floor((safe % MS_PER_DAY) / MS_PER_HOUR);
  return { days, hours, text: `turns in ${days}d ${hours}h` };
}

/**
 * calm: more than 7 days. uneasy: more than 3 days up to 7. restless: 3 days or less.
 * rising: 24 hours or less (including past due).
 */
export function urgency(remaining: number): Urgency {
  if (remaining <= MS_PER_DAY) return 'rising';
  if (remaining <= 3 * MS_PER_DAY) return 'restless';
  if (remaining <= 7 * MS_PER_DAY) return 'uneasy';
  return 'calm';
}
