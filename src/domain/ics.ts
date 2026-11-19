import { format } from 'date-fns'
import { formatMoney } from './savings'
import type { Grave } from './trial'

export function escapeText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, '\\$&')
}

export function foldLine(line: string) {
  const encoder = new TextEncoder()
  let used = 0
  let output = ''
  for (const character of line) {
    const size = encoder.encode(character).length
    if (used + size > 75) {
      output += '\r\n '
      used = 1
    }
    output += character
    used += size
  }
  return output
}

export const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')

export function calendar(events: string[][]) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trial Graveyard//Reminders//EN',
    ...events.flat(), 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n'
}

export function eventText(grave: Grave) {
  const summary = `Cancel ${grave.name} before ${formatMoney(grave.priceCents, grave.currency)} charge`
  return [`SUMMARY:${escapeText(summary)}`, `DESCRIPTION:${escapeText(grave.cancelUrl ?? 'Open Trial Graveyard for details.')}`]
}

export function buildIcs(graves: readonly Grave[], now: Date) {
  return calendar(graves.map(grave => [
    'BEGIN:VEVENT', `UID:${escapeText(grave.id)}@trial-graveyard`, `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;VALUE=DATE:${format(grave.chargeAt, 'yyyyMMdd')}`, ...eventText(grave),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT24H', 'DESCRIPTION:Trial charge tomorrow', 'END:VALARM', 'END:VEVENT',
  ]))
}
