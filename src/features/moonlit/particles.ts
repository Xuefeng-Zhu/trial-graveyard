/** Pure, pooled particle simulation for the atmosphere canvas. No DOM access. */

export const MAX_FIREFLIES = 28;
export const MAX_FOG_BANDS = 6;
export const MAX_DPR = 2;
/** Mean seconds between shooting stars. */
export const STAR_INTERVAL_S = 14;

export interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

export interface FogBand {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  alpha: number;
}

export interface ShootingStar {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Atmosphere {
  width: number;
  height: number;
  time: number;
  fireflies: Firefly[];
  fog: FogBand[];
  star: ShootingStar;
  nextStarAt: number;
}

export type Random = () => number;

/** Scales the counts down for small screens and clamps to the pool caps. */
export function counts(width: number): { fireflies: number; fog: number } {
  const small = width < 640;
  return { fireflies: small ? 12 : MAX_FIREFLIES, fog: small ? 3 : MAX_FOG_BANDS };
}

export function clampDpr(dpr: number): number {
  return Math.min(MAX_DPR, Math.max(1, dpr || 1));
}

export function createAtmosphere(width: number, height: number, random: Random = Math.random): Atmosphere {
  const n = counts(width);
  return {
    width,
    height,
    time: 0,
    fireflies: Array.from({ length: n.fireflies }, () => ({
      x: random() * width,
      y: height * (0.35 + 0.6 * random()),
      vx: (random() - 0.5) * 12,
      vy: (random() - 0.5) * 8,
      phase: random() * Math.PI * 2,
      size: 1 + random() * 1.8,
    })),
    fog: Array.from({ length: n.fog }, (_, i) => ({
      x: random() * width,
      y: height * (0.55 + 0.4 * (i / Math.max(1, n.fog - 1))),
      w: width * (0.6 + random() * 0.5),
      h: height * (0.12 + random() * 0.1),
      speed: (6 + random() * 14) * (i % 2 === 0 ? 1 : -1),
      alpha: 0.05 + random() * 0.07,
    })),
    star: { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 },
    nextStarAt: 3 + random() * STAR_INTERVAL_S,
  };
}

const wrap = (v: number, max: number): number => ((v % max) + max) % max;

/** Advances the simulation by `dt` seconds (clamped to 0.1 so a tab switch cannot teleport things). */
export function step(a: Atmosphere, dtSeconds: number, random: Random = Math.random): void {
  const dt = Math.min(Math.max(dtSeconds, 0), 0.1);
  a.time += dt;
  for (const f of a.fireflies) {
    f.x = wrap(f.x + f.vx * dt + Math.sin(a.time + f.phase) * 6 * dt, a.width);
    f.y = wrap(f.y + f.vy * dt + Math.cos(a.time * 0.7 + f.phase) * 5 * dt, a.height);
  }
  for (const b of a.fog) {
    b.x += b.speed * dt;
    if (b.x > a.width) b.x = -b.w;
    if (b.x < -b.w) b.x = a.width;
  }
  const s = a.star;
  if (s.active) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0) s.active = false;
  } else if (a.time >= a.nextStarAt) {
    s.active = true;
    s.x = a.width * (0.2 + random() * 0.6);
    s.y = a.height * (0.05 + random() * 0.2);
    s.vx = -(a.width * 0.6);
    s.vy = a.height * 0.25;
    s.life = 0.9;
    a.nextStarAt = a.time + STAR_INTERVAL_S * (0.6 + random() * 0.8);
  }
}

/** Firefly brightness in [0, 1]. */
export function twinkle(f: Firefly, time: number): number {
  return 0.5 + 0.5 * Math.sin(time * 2 + f.phase);
}
