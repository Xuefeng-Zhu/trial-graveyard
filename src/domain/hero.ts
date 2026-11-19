import { nextCharge } from './selectors'
import { DAY, HOUR, remainingTime } from './stage'
import type { Grave } from './trial'

export const pickHero = nextCharge

export function heroCountdown(grave: Grave, now: Date) {
  const hours = Math.max(0, Math.floor(remainingTime(grave, now) / HOUR))
  return { days: Math.floor(hours / 24), hours: hours % 24, text: `turns in ${Math.floor(hours / 24)}d ${hours % 24}h` }
}

export function urgency(grave: Grave, now: Date) {
  const remaining = remainingTime(grave, now)
  if (remaining <= DAY) return 'rising'
  if (remaining <= 3 * DAY) return 'restless'
  if (remaining <= 7 * DAY) return 'uneasy'
  return 'calm'
}
