import { useEffect } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import type { MotionValue } from 'framer-motion';

export interface ParallaxInput {
  /** Horizontal offset in [-1, 1] (pointer and tilt). */
  x: MotionValue<number>;
  /** Vertical offset in [-1, 1] (pointer, tilt and scroll). */
  y: MotionValue<number>;
}

const SPRING = { stiffness: 60, damping: 20, mass: 0.6 } as const;
const clamp = (v: number): number => Math.max(-1, Math.min(1, v));

/**
 * Feeds pointer, scroll and device tilt into spring motion values. Listeners are
 * passive, results are written at most once per animation frame and nothing reads
 * layout. When `enabled` is false no listeners are attached and the values stay at 0.
 */
export function useParallaxInput(enabled: boolean): ParallaxInput {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    if (!enabled) {
      rawX.set(0);
      rawY.set(0);
      return undefined;
    }
    let pointerX = 0;
    let pointerY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let scroll = 0;
    let frame = 0;
    // Viewport size is cached; it changes only on resize.
    let w = window.innerWidth || 1;
    let h = window.innerHeight || 1;

    const flush = (): void => {
      frame = 0;
      rawX.set(clamp(pointerX + tiltX));
      rawY.set(clamp(pointerY + tiltY + scroll));
    };
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(flush);
    };
    const onPointer = (e: PointerEvent): void => {
      pointerX = (e.clientX / w) * 2 - 1;
      pointerY = (e.clientY / h) * 2 - 1;
      schedule();
    };
    const onScroll = (): void => {
      scroll = clamp(window.scrollY / h);
      schedule();
    };
    const onTilt = (e: DeviceOrientationEvent): void => {
      if (e.gamma === null || e.beta === null) return;
      tiltX = clamp(e.gamma / 30);
      tiltY = clamp((e.beta - 45) / 30);
      schedule();
    };
    const onResize = (): void => {
      w = window.innerWidth || 1;
      h = window.innerHeight || 1;
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if ('DeviceOrientationEvent' in window) window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [enabled, rawX, rawY]);

  return { x, y };
}
