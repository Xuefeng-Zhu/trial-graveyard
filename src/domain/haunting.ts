import { addMinutes, parseISO, setHours, startOfHour, subHours } from 'date-fns';
import { escapeText, foldLine } from './ics';
import { formatMoney } from './savings';
import type { Grave } from './trial';

const CRLF = '\r\n';
export const MORNING_HOUR = 9;
export const EARLY_HOURS = 48;
const EVENT_MINUTES = 30;

export interface Reminders {
  /** 48 hours before the charge. */
  early: Date;
  /** 09:00 local on the charge date, never later than the charge itself. */
  morning: Date;
}

/** Reminder instants for a charge time. Neither is ever after `chargeAt`. */
export function reminderTimes(chargeAt: Date): Reminders {
  // Local 09:00 on the charge date. setHours uses local time, so DST shifts are handled.
  const nineLocal = setHours(startOfHour(chargeAt), MORNING_HOUR);
  const morning = nineLocal.getTime() <= chargeAt.getTime() ? nineLocal : chargeAt;
  return { early: subHours(chargeAt, EARLY_HOURS), morning };
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function eventLines(grave: Grave, kind: '48h' | 'morning', at: Date, stamp: string): string[] {
  const price = formatMoney(grave.priceCents, grave.currency);
  const summary =
    kind === '48h'
      ? `${grave.name} turns in 48 hours: ${price} charge`
      : `${grave.name} turns today: ${price} charge`;
  const description = grave.cancelUrl
    ? `Exorcise it here: ${grave.cancelUrl}`
    : 'No cancel link saved for this one.';
  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(grave.id)}-${kind}@trial-graveyard`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${utcStamp(at)}`,
    `DTEND:${utcStamp(addMinutes(at, EVENT_MINUTES))}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
  ];
}

/**
 * Builds an iCalendar document with two haunting reminders per grave (48h before and the
 * morning of the charge), each with a VALARM. Graves with an unparseable charge date are skipped.
 */
export function buildHauntingIcs(graves: readonly Grave[], now: Date): string {
  const stamp = utcStamp(now);
  const events = graves
    .map((g) => ({ g, charge: parseISO(g.chargeAt) }))
    .filter(({ charge }) => !Number.isNaN(charge.getTime()))
    .flatMap(({ g, charge }) => {
      const { early, morning } = reminderTimes(charge);
      return [...eventLines(g, '48h', early, stamp), ...eventLines(g, 'morning', morning, stamp)];
    });
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trial Graveyard//Hauntings//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

