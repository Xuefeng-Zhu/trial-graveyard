import { motionFor } from './motion'
import { countdown, getViewState, type Stage } from './stage'
import type { Grave } from './trial'

export type PixelKind = 'normal' | 'warning' | 'critical' | 'cancelled' | 'kept'
const kindByStage: Record<Stage, PixelKind> = {
  sealed: 'normal', cracked: 'normal', churning: 'warning', zombie: 'critical', overdue: 'critical',
}

export function pixelStateFor(grave: Grave, now: Date) {
  const view = getViewState(grave, now)
  if (view.kind === 'tombstone') return { kind: 'cancelled', label: 'Cancelled', sparks: false, hand: false } as const
  if (view.kind === 'ghost') return { kind: 'kept', label: 'Kept', sparks: false, hand: false } as const
  return { kind: kindByStage[view.stage], label: countdown(view.remainingMs), ...motionFor(view.stage) }
}

export const statusText: Record<PixelKind, string> = {
  normal: 'Calm', warning: 'Warning', critical: 'Critical', cancelled: 'Cancelled', kept: 'Kept',
}
