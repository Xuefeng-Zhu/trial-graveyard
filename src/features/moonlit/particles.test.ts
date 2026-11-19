import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MAX_DPR,
  MAX_FIREFLIES,
  MAX_FOG_BANDS,
  STAR_INTERVAL_S,
  clampDpr,
  counts,
  createAtmosphere,
  step,
  twinkle,
} from './particles';

const fixed = (): (() => number) => {
  let i = 0;
  return () => ((i++ * 0.37) % 1);
};

describe('particles', () => {
  it('caps counts and scales down on small screens', () => {
    expect(counts(1400)).toEqual({ fireflies: MAX_FIREFLIES, fog: MAX_FOG_BANDS });
    expect(counts(360).fireflies).toBeLessThan(MAX_FIREFLIES);
  });

  it('clamps the pixel ratio', () => {
    expect(clampDpr(3)).toBe(MAX_DPR);
    expect(clampDpr(0)).toBe(1);
    expect(clampDpr(1.5)).toBe(1.5);
  });

  it('keeps fireflies inside the canvas and never grows the pools', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: -1, max: 5, noNaN: true }), { maxLength: 60 }), (dts) => {
        const a = createAtmosphere(800, 600, fixed());
        const nf = a.fireflies.length;
        const nb = a.fog.length;
        for (const dt of dts) step(a, dt, fixed());
        expect(a.fireflies).toHaveLength(nf);
        expect(a.fog).toHaveLength(nb);
        for (const f of a.fireflies) {
          expect(f.x).toBeGreaterThanOrEqual(0);
          expect(f.x).toBeLessThan(800);
          expect(f.y).toBeGreaterThanOrEqual(0);
          expect(f.y).toBeLessThan(600);
        }
      }),
    );
  });

  it('wraps fog bands in both directions', () => {
    const a = createAtmosphere(800, 600, fixed());
    a.fog = [
      { x: 799, y: 0, w: 100, h: 10, speed: 100, alpha: 0.1 },
      { x: -99, y: 0, w: 100, h: 10, speed: -100, alpha: 0.1 },
    ];
    step(a, 0.1, fixed());
    expect(a.fog[0]?.x).toBe(-100);
    expect(a.fog[1]?.x).toBe(800);
  });

  it('launches one shooting star, moves it and retires it', () => {
    const a = createAtmosphere(800, 600, fixed());
    a.nextStarAt = 0.05;
    step(a, 0.1, fixed());
    expect(a.star.active).toBe(true);
    expect(a.nextStarAt).toBeGreaterThan(a.time);
    expect(a.nextStarAt - a.time).toBeLessThanOrEqual(STAR_INTERVAL_S * 1.4);
    const x = a.star.x;
    step(a, 0.1, fixed());
    expect(a.star.x).toBeLessThan(x);
    for (let i = 0; i < 10; i++) step(a, 0.1, fixed());
    expect(a.star.active).toBe(false);
  });

  it('twinkle stays in [0, 1]', () => {
    const a = createAtmosphere(800, 600, fixed());
    for (const f of a.fireflies) {
      for (const t of [0, 1, 7.5]) {
        expect(twinkle(f, t)).toBeGreaterThanOrEqual(0);
        expect(twinkle(f, t)).toBeLessThanOrEqual(1);
      }
    }
  });
});
