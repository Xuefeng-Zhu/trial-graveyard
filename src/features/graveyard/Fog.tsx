import { useEffect, useRef } from 'react';
import styles from './graveyard.module.css';

/** Hard cap on drifting fog particles, to keep low-end phones smooth. */
export const MAX_FOG_PARTICLES = 40;

export interface FogParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

/** Creates at most `MAX_FOG_PARTICLES` particles, however many are requested. */
export function createParticles(
  count: number,
  width: number,
  height: number,
  random: () => number = Math.random,
): FogParticle[] {
  const n = Math.min(Math.max(0, Math.floor(count)), MAX_FOG_PARTICLES);
  return Array.from({ length: n }, (_, i) => {
    const layer = i % 3;
    return {
      x: random() * width,
      y: height * (0.45 + 0.55 * random()),
      radius: 50 + layer * 30 + random() * 40,
      speed: (0.12 + layer * 0.1) * (0.6 + random() * 0.8),
      alpha: 0.05 + layer * 0.02,
    };
  });
}

export interface FogProps {
  /** Requested particle count. It is clamped to `MAX_FOG_PARTICLES`. */
  count?: number;
  reduced: boolean;
}

/**
 * Layered fog. Two static gradient layers always render; a canvas of drifting particles
 * sits on top unless motion is reduced. The loop stops while the tab is hidden.
 */
export function Fog({ count = MAX_FOG_PARTICLES, reduced }: FogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleCount = Math.min(Math.max(0, Math.floor(count)), MAX_FOG_PARTICLES);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (reduced || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const width = canvas.width;
    const height = canvas.height;
    const particles = createParticles(particleCount, width, height);
    let raf = 0;

    const frame = (): void => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.speed;
        if (p.x - p.radius > width) p.x = -p.radius;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        g.addColorStop(0, `rgba(190, 200, 225, ${p.alpha})`);
        g.addColorStop(1, 'rgba(190, 200, 225, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = (): void => {
      if (raf === 0 && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const stop = (): void => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const onVisibility = (): void => (document.hidden ? stop() : start());

    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [reduced, particleCount]);

  return (
    <div className={styles.fog} aria-hidden="true" data-testid="fog" data-motion={reduced ? 'still' : 'animated'}>
      <div className={styles.fogBack} />
      <div className={styles.fogFront} />
      {!reduced && (
        <canvas
          ref={canvasRef}
          className={styles.fogCanvas}
          width={640}
          height={320}
          data-particle-count={particleCount}
        />
      )}
    </div>
  );
}
