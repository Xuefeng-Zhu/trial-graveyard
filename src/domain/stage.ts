import { differenceInMilliseconds } from 'date-fns'
import { type Grave } from './trial'
import { epitaph, monthlyCents, savedCents } from './savings'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
export const stages = ['sealed', 'cracked', 'churning', 'zombie', 'overdue'] as const
export type Stage = typeof stages[number]
const thresholds = [[0, 'overdue'], [48 * HOUR, 'zombie'], [72 * HOUR, 'churning'], [7 * DAY, 'cracked']] as const

export function remainingTime(grave: Grave, now: Date) {
  return differenceInMilliseconds(grave.chargeAt, now)
}

export function getStage(grave: Grave, now: Date): Stage {
  const remaining = remainingTime(grave, now)
  return thresholds.find(([limit]) => remaining <= limit)?.[1] ?? 'sealed'
}

export function countdown(remaining: number) {
  if (remaining <= 0) return 'Overdue'
  const [interval, unit] = remaining <= 72 * HOUR ? [HOUR, 'h'] : [DAY, 'd']
  return `${Math.ceil(remaining / interval)}${unit} left`
}

export function getViewState(grave: Grave, now: Date) {
  if (grave.status === 'cancelled') return { kind: 'tombstone', epitaph: epitaph(grave), savedCents: savedCents(grave) } as const
  if (grave.status === 'kept') return { kind: 'ghost', monthlyCents: monthlyCents(grave) } as const
  return { kind: 'grave', stage: getStage(grave, now), remainingMs: remainingTime(grave, now) } as const
}

export function byCharge(a: Grave, b: Grave) {
  return Date.parse(a.chargeAt) - Date.parse(b.chargeAt)
}
