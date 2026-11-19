import { MS_PER_HOUR } from './stage';
import type { ViewState } from './stage';

export type MotionLevel = 'calm' | 'restless' | 'rising' | 'ghost';

export interface MotionState {
  level: MotionLevel;
  glow: boolean;
  cracks: boolean;
  tremble: boolean;
  /** Zombie hand bursting from the soil. */
  hand: boolean;
  dirt: boolean;
  ghost: boolean;
  /** 0 (far away) to 1 (charge time reached). Only graves in the restless window have a non-zero value. */
  intensity: number;
}

/** Remaining time at or below which a grave starts to glow, crack and tremble. */
export const RESTLESS_MS = 72 * MS_PER_HOUR;
/** Remaining time at or below which the zombie hand bursts out (overdue included). */
export const RISING_MS = 24 * MS_PER_HOUR;

const OFF = { glow: false, cracks: false, tremble: false, hand: false, dirt: false, ghost: false };

/** Maps a view state to the animation state of its tombstone. Pure; the stage thresholds are not changed. */
export function motionFor(view: ViewState): MotionState {
  if (view.kind === 'ghost') return { ...OFF, level: 'ghost', ghost: true, intensity: 0 };
  if (view.kind === 'tombstone') return { ...OFF, level: 'calm', intensity: 0 };
  const r = view.remainingMs;
  if (r > RESTLESS_MS) return { ...OFF, level: 'calm', intensity: 0 };
  const intensity = Math.min(1, Math.max(0, 1 - r / RESTLESS_MS));
  const restless = { ...OFF, glow: true, cracks: true, tremble: true, intensity };
  if (r > RISING_MS) return { ...restless, level: 'restless' };
  return { ...restless, level: 'rising', hand: true, dirt: true };
}

/** Decorative motion runs only when the OS allows it and Calm mode is off. */
export function isMotionAllowed(osReduced: boolean, calm: boolean): boolean {
  return !osReduced && !calm;
}
