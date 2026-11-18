import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGraves, graveWith } from './arbitraries';
import { buildIcs, escapeText, foldLine } from './ics';

const NOW = new Date(Date.UTC(2026, 9, 1, 12, 30, 5));
const encoder = new TextEncoder();
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

/** Finds `,` `;` or backslash-free newline characters that are not escaped within a TEXT value. */
const hasUnescaped = (value: string) => /(^|[^\\])(\\\\)*[,;]/.test(value) || /[\r\n]/.test(value);

describe('buildIcs examples', () => {
  const grave = graveWith({
    id: 'abc',
    name: 'Audible',
    chargeAt: '2026-10-31T09:00:00-07:00',
    priceCents: 1495,
    cancelUrl: 'https://audible.com/cancel',
  });

  it('builds a calendar with one event, an all-day date and a 24h alarm', () => {
    const ics = buildIcs([grave], NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:abc@trial-graveyard\r\n');
    expect(ics).toContain('DTSTAMP:20261001T123005Z\r\n');
    const d = new Date('2026-10-31T09:00:00-07:00');
    const local = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    expect(ics).toContain(`DTSTART;VALUE=DATE:${local}\r\n`);
    expect(ics).toContain('SUMMARY:Cancel Audible before $14.95 charge\r\n');
    expect(ics).toContain('TRIGGER:-PT24H\r\n');
    expect(ics).toContain('https://audible.com/cancel');
  });

  it('is stable for the same input', () => {
    expect(buildIcs([grave], NOW)).toBe(buildIcs([grave], NOW));
  });

  it('notes a missing cancel link', () => {
    const ics = buildIcs([{ ...grave, cancelUrl: undefined }], NOW);
    expect(ics).toContain('DESCRIPTION:No cancel link saved for this one.');
  });

  it('skips graves with an invalid date and handles an empty list', () => {
    expect(buildIcs([{ ...grave, chargeAt: 'nope' }], NOW)).not.toContain('BEGIN:VEVENT');
    expect(buildIcs([], NOW)).toBe(
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Trial Graveyard//EN\r\nCALSCALE:GREGORIAN\r\nEND:VCALENDAR\r\n',
    );
  });

  it('escapes special characters in the name', () => {
    const ics = buildIcs([{ ...grave, name: 'A, B; C\\D\nE' }], NOW);
    expect(unfold(ics)).toContain('SUMMARY:Cancel A\\, B\\; C\\\\D\\nE before');
  });
});

describe('escapeText and foldLine', () => {
  it('escapes backslash, semicolon, comma and all newline styles', () => {
    expect(escapeText('a\\b;c,d\ne\r\nf\rg')).toBe('a\\\\b\\;c\\,d\\ne\\nf\\ng');
  });

  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
  });

  it('folds at 75 octets and unfolds back to the original', () => {
    const line = 'DESCRIPTION:' + 'x'.repeat(200);
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('never splits a multi-byte character', () => {
    const line = 'SUMMARY:' + '👻é'.repeat(60);
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });
});

describe('ICS properties', () => {
  it('P-I1 valid lines and escaped TEXT values', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const ics = buildIcs(graves, NOW);
        expect(ics.endsWith('\r\n')).toBe(true);
        // Every physical line ends in CRLF: no bare LF or CR remain once CRLF is removed.
        const physical = ics.slice(0, -2).split('\r\n');
        expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
        for (const line of physical) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);

        const logical = unfold(ics).slice(0, -2).split('\r\n');
        const textProps = logical.filter((l) => /^(SUMMARY|DESCRIPTION):/.test(l));
        for (const l of textProps) expect(hasUnescaped(l.slice(l.indexOf(':') + 1))).toBe(false);
        expect(logical.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(graves.length);
      }),
    );
  });
});
