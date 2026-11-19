import { addDays, endOfMonth, isSameDay } from 'date-fns';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arbNowMs, graveWith } from './arbitraries';
import { buildHauntingIcs, EARLY_HOURS, reminderTimes } from './haunting';
import { heroCountdown } from './hero';
import { MS_PER_DAY, MS_PER_HOUR } from './stage';
import { toLocalIso } from './trial';

const NOW = new Date(Date.UTC(2026, 9, 1, 12, 30, 5));
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

const arbLocalCharge = fc
  .record({
    y: fc.integer({ min: 2000, max: 2099 }),
    m: fc.integer({ min: 0, max: 11 }),
    d: fc.integer({ min: 1, max: 28 }),
    h: fc.integer({ min: 0, max: 23 }),
    min: fc.integer({ min: 0, max: 59 }),
  })
  .map(({ y, m, d, h, min }) => new Date(y, m, d, h, min));

function checkInvariants(charge: Date) {
  const { early, morning } = reminderTimes(charge);
  expect(early.getTime()).toBeLessThanOrEqual(charge.getTime());
  expect(morning.getTime()).toBeLessThanOrEqual(charge.getTime());
  expect(charge.getTime() - early.getTime()).toBe(EARLY_HOURS * MS_PER_HOUR);
  expect(isSameDay(morning, charge)).toBe(true);
  if (charge.getHours() >= 9) {
    expect(morning.getHours()).toBe(9);
    expect(morning.getMinutes()).toBe(0);
  } else {
    expect(morning.getTime()).toBe(charge.getTime());
  }
}

describe('reminderTimes properties', () => {
  it('never schedules after the charge, 48h early, 09:00 local morning', () => {
    fc.assert(fc.property(arbLocalCharge, checkInvariants));
  });

  it('holds for any instant', () => {
    fc.assert(fc.property(arbNowMs, (ms) => checkInvariants(new Date(ms))));
  });

  it('holds for trials ending at month end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2099 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 0, max: 23 }),
        (y, m, h) => {
          const last = endOfMonth(new Date(y, m, 1, h, 0));
          last.setHours(h, 0, 0, 0);
          checkInvariants(last);
        },
      ),
    );
  });

  it('holds on Feb 29 of leap years', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }).map((n) => 2000 + n * 4),
        fc.integer({ min: 0, max: 23 }),
        (y, h) => {
          const charge = new Date(y, 1, 29, h, 0);
          expect(charge.getDate()).toBe(29);
          checkInvariants(charge);
        },
      ),
    );
  });

  it('holds for 7, 14 and 30 day trials', () => {
    fc.assert(
      fc.property(arbLocalCharge, fc.constantFrom(7, 14, 30), (start, days) => {
        const charge = addDays(start, days);
        checkInvariants(charge);
        expect(charge.getTime() - start.getTime()).toBeGreaterThanOrEqual(
          days * MS_PER_DAY - MS_PER_HOUR,
        );
      }),
    );
  });

  it('keeps the countdown from going negative', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e12, max: 1e12 }), (ms) => {
        const c = heroCountdown(ms);
        expect(c.days).toBeGreaterThanOrEqual(0);
        expect(c.hours).toBeGreaterThanOrEqual(0);
        expect(c.hours).toBeLessThan(24);
      }),
    );
  });
});

describe('reminderTimes in America/Los_Angeles', () => {
  const original = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });
  afterAll(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it('uses the local timezone', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(480);
  });

  it('keeps 09:00 local across spring forward (2026-03-08)', () => {
    const charge = new Date('2026-03-08T20:00:00-07:00');
    const { early, morning } = reminderTimes(charge);
    expect(morning.toISOString()).toBe('2026-03-08T16:00:00.000Z');
    expect(early.toISOString()).toBe('2026-03-07T03:00:00.000Z');
  });

  it('keeps 09:00 local across fall back (2026-11-01)', () => {
    const charge = new Date('2026-11-01T20:00:00-08:00');
    const { early, morning } = reminderTimes(charge);
    expect(morning.toISOString()).toBe('2026-11-01T17:00:00.000Z');
    expect(early.toISOString()).toBe('2026-10-31T04:00:00.000Z');
  });

  it('holds around every DST transition day', () => {
    fc.assert(
      fc.property(
        fc.constantFrom([2026, 2, 8], [2026, 10, 1], [2027, 2, 14], [2027, 10, 7]),
        fc.integer({ min: -2, max: 2 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        ([y, m, d], offset, h, min) => checkInvariants(new Date(y, m, d + offset, h, min)),
      ),
    );
  });
});

describe('buildHauntingIcs', () => {
  const grave = graveWith({
    id: 'abc',
    name: 'Audible, Inc; "extra"',
    chargeAt: '2026-10-31T20:00:00.000Z',
    priceCents: 1495,
    cancelUrl: 'https://audible.com/cancel',
  });

  it('writes two events and two alarms per grave with CRLF line endings', () => {
    const ics = buildHauntingIcs([grave, graveWith({ id: 'two' })], NOW);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('uses stable UIDs per trial', () => {
    const ics = buildHauntingIcs([grave], NOW);
    expect(ics).toContain('UID:abc-48h@trial-graveyard\r\n');
    expect(ics).toContain('UID:abc-morning@trial-graveyard\r\n');
    expect(buildHauntingIcs([grave], new Date(0))).toContain('UID:abc-48h@trial-graveyard');
  });

  it('places the early reminder 48 hours before the charge', () => {
    const ics = buildHauntingIcs([grave], NOW);
    expect(ics).toContain('DTSTART:20261029T200000Z\r\n');
    expect(ics).toContain('DTSTAMP:20261001T123005Z\r\n');
    expect(ics).toContain('TRIGGER:PT0S\r\n');
  });

  it('escapes commas, semicolons and newlines in text', () => {
    const ics = unfold(buildHauntingIcs([grave], NOW));
    expect(ics).toContain('SUMMARY:Audible\\, Inc\\; "extra" turns in 48 hours: $14.95 charge\r\n');
    const odd = unfold(buildHauntingIcs([graveWith({ id: 'a;b,c', name: 'x\ny' })], NOW));
    expect(odd).toContain('UID:a\\;b\\,c-48h@trial-graveyard');
    expect(odd).toContain('x\\ny');
  });

  it('folds every line at 75 octets, including multibyte text', () => {
    const long = graveWith({ name: 'Ghoul 👻 '.repeat(30), cancelUrl: 'https://x.example/' + 'a'.repeat(200) });
    const ics = buildHauntingIcs([long], NOW);
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(ics).toMatch(/\r\n /);
  });

  it('notes a missing cancel link and skips unparseable dates', () => {
    const ics = buildHauntingIcs([graveWith({ chargeAt: 'nope' }), graveWith({ id: 'ok' })], NOW);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('No cancel link saved for this one.');
  });

  it('skips reminders that are not after now', () => {
    const at = (iso: string) => buildHauntingIcs([graveWith({ id: 'p', chargeAt: iso })], NOW);
    // charge within 48h: the early reminder is past, the morning one is not
    const soon = at('2026-10-02T23:59:00.000Z');
    expect(soon).not.toContain('UID:p-48h@');
    // charge already passed: nothing is emitted
    const past = at('2026-09-01T00:00:00.000Z');
    expect(past).not.toContain('BEGIN:VEVENT');
    expect(past).toContain('END:VCALENDAR');
  });

  it('puts the morning reminder at 09:00 local', () => {
    const charge = new Date(2026, 9, 31, 18, 0);
    const ics = buildHauntingIcs([graveWith({ chargeAt: toLocalIso(charge) })], NOW);
    const nine = new Date(2026, 9, 31, 9, 0).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    expect(ics).toContain(`DTSTART:${nine}\r\n`);
  });
});
