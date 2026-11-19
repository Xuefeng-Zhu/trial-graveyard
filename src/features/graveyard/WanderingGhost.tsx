import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import styles from './graveyard.module.css';

type Phase = 'hidden' | 'drift' | 'flee';

/** Random wait before the ghost shows up, 8 to 20 seconds. */
function randomDelay(): number {
  return 8000 + Math.random() * 12000;
}

/**
 * Easter egg: a pale ghost drifts across the scene now and then. Clicking it makes it flee.
 * Pointer-only and hidden from assistive tech, because it carries no information.
 */
export function WanderingGhost({ delayMs }: { delayMs?: number }) {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (phase !== 'hidden') return undefined;
    const id = setTimeout(() => setPhase('drift'), delayMs ?? randomDelay());
    return () => clearTimeout(id);
  }, [phase, round, delayMs]);

  if (phase === 'hidden') return null;
  const fleeing = phase === 'flee';
  return (
    <motion.div
      key={round}
      className={styles.wanderer}
      data-testid="wandering-ghost"
      data-phase={phase}
      data-motion="animated"
      initial={{ left: '-12%', opacity: 0 }}
      animate={fleeing ? { left: '125%', opacity: 0, scale: 0.7 } : { left: '112%', opacity: [0, 0.75, 0.75, 0] }}
      transition={fleeing ? { duration: 0.7, ease: 'easeIn' } : { duration: 18, ease: 'linear' }}
      onClick={() => setPhase('flee')}
      onAnimationComplete={() => {
        setRound((r) => r + 1);
        setPhase('hidden');
      }}
    >
      <svg viewBox="0 0 70 90" focusable="false">
        <path className={styles.sheet} d="M8 86 V34 a27 27 0 0 1 54 0 V86 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 Z" />
        <ellipse className={styles.ghostEye} cx="26" cy="36" rx="4" ry="6" />
        <ellipse className={styles.ghostEye} cx="44" cy="36" rx="4" ry="6" />
        <ellipse className={styles.ghostEye} cx="35" cy="52" rx="4" ry="5" />
      </svg>
    </motion.div>
  );
}
