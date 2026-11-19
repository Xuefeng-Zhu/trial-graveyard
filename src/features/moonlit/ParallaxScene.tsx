import { motion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { useParallaxInput } from './useParallaxInput';
import styles from './moonlit.module.css';

const base = import.meta.env.BASE_URL;

/** Layers back to front. `depth` is the maximum travel in px at full input. */
export const LAYERS = [
  { id: 'sky', depth: 8 },
  { id: 'hills', depth: 20 },
  { id: 'graves', depth: 36 },
  { id: 'fog', depth: 52 },
  { id: 'foreground', depth: 80 },
] as const;

type LayerId = (typeof LAYERS)[number]['id'];

function Layer({
  id,
  depth,
  x,
  y,
  motionOn,
  children,
}: {
  id: LayerId;
  depth: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  motionOn: boolean;
  children?: ReactNode;
}) {
  const tx = useTransform(x, (v) => -v * depth);
  const ty = useTransform(y, (v) => -v * depth * 0.5);
  const className = `${styles.layer} ${styles[id]}`;
  if (!motionOn) {
    return (
      <div className={className} data-layer={id} data-static="true">
        {children}
      </div>
    );
  }
  return (
    <motion.div className={className} data-layer={id} style={{ x: tx, y: ty }}>
      {children}
    </motion.div>
  );
}

export interface ParallaxSceneProps {
  /** False renders static layers with no listeners and no animation. */
  motion: boolean;
  /** Content for the graves layer. */
  children?: ReactNode;
}

/** Fixed full-viewport scene: sky, hills, graves, fog, foreground. Only transforms move. */
export function ParallaxScene({ motion: motionOn, children }: ParallaxSceneProps) {
  const { x, y } = useParallaxInput(motionOn);
  return (
    <div
      className={styles.scene}
      data-testid="parallax-scene"
      data-motion={motionOn ? 'on' : 'off'}
      aria-hidden={children ? undefined : 'true'}
      style={{
        ['--scene-sky' as string]: `url(${base}scene/sky.webp)`,
        ['--scene-hills' as string]: `url(${base}scene/hills.webp)`,
        ['--scene-foreground' as string]: `url(${base}scene/foreground.webp)`,
      }}
    >
      <div className={`${styles.moonGlow} ${motionOn ? styles.pulse : ''}`} data-testid="moon-glow" />
      {LAYERS.map((l) => (
        <Layer key={l.id} id={l.id} depth={l.depth} x={x} y={y} motionOn={motionOn}>
          {l.id === 'graves' ? children : null}
        </Layer>
      ))}
    </div>
  );
}
