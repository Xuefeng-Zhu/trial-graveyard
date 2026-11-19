import { addMinutes, startOfDay, setHours, subHours } from 'date-fns'
import { calendar, escapeText, eventText, utcStamp } from './ics'
import type { Grave } from './trial'

export function reminderTimes(chargeAt: string) {
  const charge = new Date(chargeAt)
  const morning = setHours(startOfDay(charge), 9)
  return { early: subHours(charge, 48), morning: morning > charge ? charge : morning }
}

export function buildHauntingIcs(graves: readonly Grave[], now: Date) {
  return calendar(graves.flatMap(grave => {
    const { early, morning } = reminderTimes(grave.chargeAt)
    return ([['48h', early], ['morning', morning]] as const).map(([suffix, start]) => [
      'BEGIN:VEVENT', `UID:${escapeText(grave.id)}-${suffix}@trial-graveyard`, `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(addMinutes(start, 30))}`, ...eventText(grave),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', 'DESCRIPTION:Trial charge reminder', 'END:VALARM', 'END:VEVENT',
    ])
  }))
}
