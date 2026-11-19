import { useReducedMotion } from '../graveyard';
import { BACKDROP_URL, CrystalBall } from '../../design/pixel';
import styles from './landing.module.css';

export const LANDING_PITCH = 'Every free trial is a grave. Cancel before it rises.';

export interface LandingProps {
  daylight: boolean;
  onSummon: () => void;
  /** Overrides the OS setting. Tests use this. */
  reducedMotion?: boolean;
}

/** First screen when there are no graves. A framed card over the pixel graveyard. Daylight mode drops the moon artwork. */
export function Landing({ daylight, onSummon, reducedMotion }: LandingProps) {
  const osReduced = useReducedMotion();
  const reduced = reducedMotion ?? osReduced;
  return (
    <section
      className={`${styles.landing} ${daylight ? styles.plain : ''}`}
      style={daylight ? undefined : { backgroundImage: `url(${BACKDROP_URL})` }}
      aria-labelledby="landing-heading"
      data-motion={reduced ? 'still' : 'animated'}
    >
      {!daylight && (
        <div className={styles.art} aria-hidden="true" data-testid="landing-art">
          <CrystalBall scale={6} className={`${styles.moon} ${reduced ? '' : styles.glow}`} />
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
