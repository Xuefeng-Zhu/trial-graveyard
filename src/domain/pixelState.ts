import { countdown, getViewState } from './stage';
import type { Stage } from './stage';
import { motionFor } from './motion';
import type { Grave } from './trial';

export type PixelKind = 'normal' | 'warning' | 'critical' | 'cancelled' | 'kept';

export const CRACK_ORANGE = '#FFB14A';
export const CRITICAL_RED = '#FF586E';

export interface PixelState {
  kind: PixelKind;
  /** Badge text such as "72h left", "Overdue", "Cancelled" or "Kept". Undefined for normal graves. */
  badge: string | undefined;
  sparks: boolean;
  /** Colour of the cracks, or undefined when the stone is intact. */
  cracks: typeof CRACK_ORANGE | typeof CRITICAL_RED | undefined;
  zombieHand: boolean;
  /** Urgent (red) countdown styling. */
  urgent: boolean;
}

const CALM: Omit<PixelState, 'kind' | 'badge'> = {
  sparks: false,
  cracks: undefined,
  zombieHand: false,
  urgent: false,
};

/** Warning is the churning stage (72 h or less), critical is zombie or overdue (48 h or less). Thresholds live in stage.ts. */
const KIND_BY_STAGE: Record<Stage, PixelKind> = {
  sealed: 'normal',
  cracked: 'normal',
  churning: 'warning',
  zombie: 'critical',
  overdue: 'critical',
};

/** Visual state of a gravestone, derived only from `getViewState` and `motionFor`. Pure. */
export function pixelStateFor(grave: Grave, now: Date): PixelState {
  const view = getViewState(grave, now);
  if (view.kind === 'tombstone') return { ...CALM, kind: 'cancelled', badge: 'Cancelled' };
  if (view.kind === 'ghost') return { ...CALM, kind: 'kept', badge: 'Kept' };
  const kind = KIND_BY_STAGE[view.stage];
  if (kind === 'normal') return { ...CALM, kind, badge: undefined };
  const motion = motionFor(view);
  const c = countdown(view.remainingMs);
  const critical = kind === 'critical';
  return {
    kind,
    badge: c ? `${c.value}h left` : 'Overdue',
    sparks: !critical && motion.glow && motion.cracks,
    // motionFor cracks every grave within 72 h, which covers both warning and critical.
    cracks: critical ? CRITICAL_RED : CRACK_ORANGE,
    zombieHand: critical,
    urgent: critical,
  };
}
