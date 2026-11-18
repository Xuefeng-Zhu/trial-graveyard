import { addDays, format, parseISO } from 'date-fns';
import { formatMoney } from './savings';
import type { Grave } from './trial';

const CRLF = '\r\n';
const MAX_OCTETS = 75;
const encoder = new TextEncoder();

/** Escapes a TEXT value per RFC 5545 section 3.3.11. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line so no line exceeds 75 octets, never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;
  // The first line may hold 75 octets; continuation lines start with a space, leaving 74.
  let limit = MAX_OCTETS;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentOctets + size > limit) {
      parts.push(current);
      current = '';
      currentOctets = 0;
      limit = MAX_OCTETS - 1;
    }
    current += char;
    currentOctets += size;
  }
  parts.push(current);
  return parts.join(CRLF + ' ');
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function eventLines(grave: Grave, stamp: string): string[] {
  const start = parseISO(grave.chargeAt);
  const price = formatMoney(grave.priceCents, grave.currency);
  const summary = `Cancel ${grave.name} before ${price} charge`;
  const description = grave.cancelUrl
    ? `Cancel here: ${grave.cancelUrl}`
    : 'No cancel link saved for this one.';
  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(grave.id)}@trial-graveyard`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${format(start, 'yyyyMMdd')}`,
    `DTEND;VALUE=DATE:${format(addDays(start, 1), 'yyyyMMdd')}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    'TRIGGER:-PT24H',
    'END:VALARM',
    'END:VEVENT',
  ];
}

/**
 * Builds an iCalendar document with one all-day event per grave on its charge date.
 * Graves with an unparseable charge date are skipped.
 */
export function buildIcs(graves: readonly Grave[], now: Date): string {
  const stamp = utcStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trial Graveyard//EN',
    'CALSCALE:GREGORIAN',
    ...graves
      .filter((g) => !Number.isNaN(Date.parse(g.chargeAt)))
      .flatMap((g) => eventLines(g, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
