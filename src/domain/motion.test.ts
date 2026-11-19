import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbRemainingMs } from './arbitraries';
import { isMotionAllowed, motionFor, RESTLESS_MS, RISING_MS, type MotionLevel } from './motion';
import { MS_PER_HOUR, stageForRemaining, type ViewState } from './stage';

const grave = (remainingMs: number): ViewState => ({
  kind: 'grave',
  stage: stageForRemaining(remainingMs),
  remainingMs,
});
const RANK: Record<MotionLevel, number> = { calm: 0, ghost: 0, restless: 1, rising: 2 };

describe('motionFor examples', () => {
  it('is calm when far away', () => {
    expect(motionFor(grave(RESTLESS_MS + 1))).toMatchObject({ level: 'calm', glow: false, intensity: 0 });
  });
  it('glows, cracks and trembles at 72 h', () => {
    expect(motionFor(grave(RESTLESS_MS))).toMatchObject({
      level: 'restless',
      glow: true,
      cracks: true,
      tremble: true,
      hand: false,
      dirt: false,
      intensity: 0,
    });
  });
  it('raises the hand at 24 h and when overdue', () => {
    expect(motionFor(grave(RISING_MS + 1)).hand).toBe(false);
    expect(motionFor(grave(RISING_MS))).toMatchObject({ level: 'rising', hand: true, dirt: true });
    expect(motionFor(grave(-5 * MS_PER_HOUR))).toMatchObject({ level: 'rising', intensity: 1 });
  });
  it('shows a ghost for kept and nothing for cancelled', () => {
    expect(motionFor({ kind: 'ghost', monthlyCents: 100 })).toMatchObject({ level: 'ghost', ghost: true });
    expect(motionFor({ kind: 'tombstone', epitaph: 'x', savedCents: 1 })).toMatchObject({
      level: 'calm',
      ghost: false,
    });
  });
});

describe('motionFor properties', () => {
  it('P-M1 intensity is within [0, 1]', () => {
    fc.assert(fc.property(arbRemainingMs, (r) => {
      const { intensity } = motionFor(grave(r));
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    }));
  });
  it('P-M2 kept is ghost and cancelled is calm', () => {
    fc.assert(fc.property(fc.nat(), fc.string(), (cents, text) => {
      expect(motionFor({ kind: 'ghost', monthlyCents: cents }).level).toBe('ghost');
      expect(motionFor({ kind: 'tombstone', epitaph: text, savedCents: cents }).level).toBe('calm');
    }));
  });
  it('P-M3 less time never means a calmer grave', () => {
    fc.assert(fc.property(arbRemainingMs, arbRemainingMs, (a, b) => {
      const [near, far] = a <= b ? [a, b] : [b, a];
      expect(RANK[motionFor(grave(near)).level]).toBeGreaterThanOrEqual(RANK[motionFor(grave(far)).level]);
      expect(motionFor(grave(near)).intensity).toBeGreaterThanOrEqual(motionFor(grave(far)).intensity);
    }));
  });
  it('P-M4 hand and dirt imply glow, cracks and tremble', () => {
    fc.assert(fc.property(arbRemainingMs, (r) => {
      const m = motionFor(grave(r));
      if (m.hand || m.dirt) expect(m.glow && m.cracks && m.tremble).toBe(true);
      expect(m.hand).toBe(m.dirt);
    }));
  });
  it('P-M5 level follows the thresholds', () => {
    fc.assert(fc.property(arbRemainingMs, (r) => {
      const expected = r <= RISING_MS ? 'rising' : r <= RESTLESS_MS ? 'restless' : 'calm';
      expect(motionFor(grave(r)).level).toBe(expected);
    }));
  });
  it('P-M6 churning, zombie and overdue are never calm; sealed and cracked always are', () => {
    fc.assert(fc.property(arbRemainingMs, (r) => {
      const calm = motionFor(grave(r)).level === 'calm';
      const stage = stageForRemaining(r);
      expect(calm).toBe(stage === 'sealed' || stage === 'cracked');
    }));
  });
  it('P-M7 motion is allowed only without OS reduction and without calm', () => {
    fc.assert(fc.property(fc.boolean(), fc.boolean(), (os, calm) => {
      expect(isMotionAllowed(os, calm)).toBe(!os && !calm);
    }));
  });
});
