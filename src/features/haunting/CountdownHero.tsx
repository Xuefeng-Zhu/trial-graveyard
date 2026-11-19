import { formatMoney } from '../../domain/savings';
import { heroCountdown, pickHero, urgency } from '../../domain/hero';
import { remainingMs } from '../../domain/stage';
import type { Grave } from '../../domain/trial';
import { useReducedMotion } from '../graveyard/useReducedMotion';
import styles from './haunting.module.css';

const MOOD = {
  calm: 'Still sleeping. Plenty of time.',
  uneasy: 'The grave is stirring.',
  restless: 'The grave is restless. Act soon.',
  rising: 'It is rising. Kill it before it bites!',
} as const;

export interface CountdownHeroProps {
  graves: readonly Grave[];
  now: Date;
  /** Overrides the OS setting. Tests use this. */
  reducedMotion?: boolean;
}

/** Features the trial closest to charging, with a live "turns in Xd Yh" countdown. */
export function CountdownHero({ graves, now, reducedMotion }: CountdownHeroProps) {
  const osReduced = useReducedMotion();
  const reduced = reducedMotion ?? osReduced;
  const hero = pickHero(graves, now);
  if (!hero) return null;
  const remaining = remainingMs(hero, now);
  const level = urgency(remaining);
  const { text } = heroCountdown(remaining);
  return (
    <section
      className={styles.hero}
      aria-labelledby="hero-heading"
      data-urgency={level}
      data-motion={reduced ? 'still' : 'animated'}
    >
      <h2 id="hero-heading" className={styles.heroHeading}>
        Next to bite
      </h2>
      <p className={styles.heroName}>{hero.name}</p>
      <p className={styles.heroCountdown} data-testid="hero-countdown">
        {text}
      </p>
      <p className={styles.heroAmount}>
        Charges <strong>{formatMoney(hero.priceCents, hero.currency)}</strong>
      </p>
      <p className={styles.heroMood}>{MOOD[level]}</p>
    </section>
  );
}
