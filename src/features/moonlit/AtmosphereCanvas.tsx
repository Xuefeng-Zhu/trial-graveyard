import { useEffect, useRef } from 'react';
import { clampDpr, createAtmosphere, step, twinkle } from './particles';
import type { Atmosphere } from './particles';
import styles from './moonlit.module.css';

function draw(ctx: CanvasRenderingContext2D, a: Atmosphere): void {
  ctx.clearRect(0, 0, a.width, a.height);
  for (const b of a.fog) {
    const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
    g.addColorStop(0, 'rgba(190,215,235,0)');
    g.addColorStop(0.5, `rgba(190,215,235,${b.alpha})`);
    g.addColorStop(1, 'rgba(190,215,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  for (const f of a.fireflies) {
    ctx.globalAlpha = 0.25 + 0.75 * twinkle(f, a.time);
    ctx.fillStyle = '#7CFFB2';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const s = a.star;
  if (s.active) {
    ctx.strokeStyle = `rgba(236,244,255,${Math.min(1, s.life)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.08, s.y - s.vy * 0.08);
    ctx.stroke();
  }
}

/** Full-viewport particle canvas. Pauses while the tab is hidden. Loaded lazily by `Atmosphere`. */
export default function AtmosphereCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !ctx) return undefined;

    const dpr = clampDpr(window.devicePixelRatio);
    let sim = createAtmosphere(window.innerWidth, window.innerHeight);
    const resize = (): void => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim = createAtmosphere(w, h);
    };
    resize();

    let raf = 0;
    let last = 0;
    const frame = (t: number): void => {
      step(sim, last ? (t - last) / 1000 : 0);
      last = t;
      draw(ctx, sim);
      raf = requestAnimationFrame(frame);
    };
    const start = (): void => {
      if (raf === 0) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = (): void => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = (): void => (document.hidden ? stop() : start());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    if (!document.hidden) start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className={styles.atmosphere} aria-hidden="true" data-testid="atmosphere-canvas" />;
}
