import { Fog, useReducedMotion } from '../graveyard';
import styles from './landing.module.css';

export const LANDING_PITCH = 'Every free trial is a grave. Cancel before it rises.';

export interface LandingProps {
  daylight: boolean;
  onSummon: () => void;
  /** Overrides the OS setting. Tests use this. */
  reducedMotion?: boolean;
}

/** First screen when there are no graves. Daylight mode drops the fog and moon artwork. */
export function Landing({ daylight, onSummon, reducedMotion }: LandingProps) {
  const osReduced = useReducedMotion();
  const reduced = reducedMotion ?? osReduced;
  return (
    <section
      className={`${styles.landing} ${daylight ? styles.plain : ''}`}
      aria-labelledby="landing-heading"
      data-motion={reduced ? 'still' : 'animated'}
    >
      {!daylight && (
        <div className={styles.art} aria-hidden="true" data-testid="landing-art">
          <svg className={`${styles.moon} ${reduced ? '' : styles.glow}`} viewBox="0 0 100 100" focusable="false">
            <circle cx="50" cy="50" r="40" fill="#e9e2b8" />
            <circle cx="38" cy="40" r="7" fill="#bdb68c" />
            <circle cx="60" cy="58" r="10" fill="#bdb68c" opacity="0.7" />
          </svg>
          <Fog count={12} reduced={reduced} />
        </div>
      )}
      <div className={styles.content}>
        <h2 id="landing-heading" className={styles.title}>
          Welcome to the graveyard
        </h2>
        <p className={styles.pitch}>{LANDING_PITCH}</p>
        <button type="button" className={styles.summon} onClick={onSummon}>
          Summon demo graveyard
        </button>
      </div>
    </section>
  );
}
