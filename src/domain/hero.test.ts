import { describe, expect, it } from 'vitest';
import { graveWith } from './arbitraries';
import { heroCountdown, pickHero, urgency } from './hero';
import { MS_PER_DAY, MS_PER_HOUR } from './stage';

const NOW = new Date('2026-10-01T00:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe('pickHero', () => {
  it('picks the active grave charging soonest in the future', () => {
    const a = graveWith({ id: 'a', chargeAt: at(5 * MS_PER_DAY) });
    const b = graveWith({ id: 'b', chargeAt: at(2 * MS_PER_DAY) });
    const past = graveWith({ id: 'p', chargeAt: at(-MS_PER_DAY) });
    const done = graveWith({ id: 'c', chargeAt: at(MS_PER_HOUR), status: 'cancelled' });
    expect(pickHero([a, past, done, b], NOW)?.id).toBe('b');
  });

  it('returns undefined when nothing is upcoming', () => {
    expect(pickHero([], NOW)).toBeUndefined();
    expect(pickHero([graveWith({ chargeAt: at(-1) })], NOW)).toBeUndefined();
  });
});

describe('heroCountdown', () => {
  it('formats days and hours', () => {
    expect(heroCountdown(2 * MS_PER_DAY + 5 * MS_PER_HOUR + 59 * 60_000)).toEqual({
      days: 2,
      hours: 5,
      text: 'turns in 2d 5h',
    });
  });

  it('clamps negative and non-finite values to zero', () => {
    expect(heroCountdown(-5).text).toBe('turns in 0d 0h');
    expect(heroCountdown(NaN).text).toBe('turns in 0d 0h');
  });
});

describe('urgency', () => {
  it('maps remaining time to levels at the boundaries', () => {
    expect(urgency(7 * MS_PER_DAY + 1)).toBe('calm');
    expect(urgency(7 * MS_PER_DAY)).toBe('uneasy');
    expect(urgency(3 * MS_PER_DAY + 1)).toBe('uneasy');
    expect(urgency(3 * MS_PER_DAY)).toBe('restless');
    expect(urgency(MS_PER_DAY + 1)).toBe('restless');
    expect(urgency(MS_PER_DAY)).toBe('rising');
    expect(urgency(-1)).toBe('rising');
  });
});
