import { motion } from 'framer-motion';
import { useEffect } from 'react';
import styles from './moonlit.module.css';

export const INTRO_KEY = 'trial-graveyard:intro-seen';
export const INTRO_MS = 3600;

/** True once the intro has played in this browser session. Storage failures count as "seen" so it never loops. */
export function introSeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Private mode: the intro may play again next load, which is harmless.
  }
}

/**
 * Opening shot: the moon rises over a dark sky, then the overlay lifts away like a camera panning
 * down to the graves. Skippable with the button, Escape or a click.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, INTRO_MS);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onDone]);

  return (
    <motion.div
      className={styles.intro}
      data-testid="intro"
      data-motion="animated"
      onClick={onDone}
      initial={{ y: '0%' }}
      animate={{ y: ['0%', '0%', '-100%'] }}
      transition={{ duration: INTRO_MS / 1000, times: [0, 0.55, 1], ease: 'easeInOut' }}
    >
      <motion.div
        className={styles.introMoon}
        aria-hidden="true"
        initial={{ y: '60vh', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      />
      <motion.p
        className={styles.introTitle}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        Trial Graveyard
      </motion.p>
      <button
        type="button"
        className={styles.introSkip}
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        Skip intro
      </button>
    </motion.div>
  );
}
