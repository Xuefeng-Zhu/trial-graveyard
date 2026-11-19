import { motion } from 'framer-motion';
import styles from './graveyard.module.css';

export const BURY_FX_MS = 2600;

export interface BuryEffect {
  id: number;
  /** Position inside the scene, in px. */
  x: number;
  y: number;
  text: string;
}

/** Shovel scoops soil, a soul wisp floats up and turns into the saved amount. Decorative only. */
export function BuryFx({ effect }: { effect: BuryEffect }) {
  return (
    <div className={styles.buryFx} style={{ left: effect.x, top: effect.y }} data-testid="bury-fx" data-motion="animated">
      <motion.svg
        className={styles.shovel}
        viewBox="0 0 60 80"
        focusable="false"
        initial={{ rotate: -50, x: -30, opacity: 0 }}
        animate={{ rotate: [-50, 10, -20, 30], x: [-30, 0, 0, 24], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.1, times: [0, 0.35, 0.65, 1] }}
      >
        <path className={styles.shovelHandle} d="M30 2 V46" />
        <path className={styles.shovelBlade} d="M18 46 H42 L36 76 H24 Z" />
      </motion.svg>
      <motion.span
        className={styles.wisp}
        initial={{ y: 0, opacity: 0, scale: 0.6 }}
        animate={{ y: [0, -50, -90], opacity: [0, 0.9, 0], scale: [0.6, 1, 1.4] }}
        transition={{ duration: 1.2, delay: 0.7, times: [0, 0.5, 1] }}
      />
      <motion.span
        className={styles.saved}
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: [-30, -70, -100], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, delay: 0.9, times: [0, 0.4, 1] }}
      >
        {effect.text}
      </motion.span>
    </div>
  );
}
