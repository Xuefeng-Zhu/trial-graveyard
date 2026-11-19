import { useStore } from 'zustand';
import { isMotionAllowed } from '../../domain/motion';
import { graveStore } from '../../state/store';
import type { GraveStore } from '../../state/store';
import { useReducedMotion } from '../graveyard/useReducedMotion';

/** True when the OS does not ask for reduced motion and Calm mode is off. */
export function useMotionAllowed(store: GraveStore = graveStore): boolean {
  const osReduced = useReducedMotion();
  const calm = useStore(store, (s) => s.settings.calm);
  return isMotionAllowed(osReduced, calm);
}
