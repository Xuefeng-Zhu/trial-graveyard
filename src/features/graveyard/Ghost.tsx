import { formatMoney } from '../../domain/savings';
import type { Grave as GraveData } from '../../domain/trial';
import styles from './graveyard.module.css';

export interface GhostProps {
  grave: GraveData;
  monthlyCents: number;
  reduced: boolean;
}

/** A kept subscription, drifting above the graves with its monthly cost. */
export function Ghost({ grave, monthlyCents, reduced }: GhostProps) {
  return (
    <div className={`${styles.figure} ${styles.ghost}`} data-stage="ghost">
      <div className={reduced ? undefined : styles.drift} data-motion={reduced ? 'still' : 'animated'}>
        <svg viewBox="0 0 70 90" className={styles.art} aria-hidden="true" focusable="false">
          <path
            className={styles.sheet}
            d="M8 86 V34 a27 27 0 0 1 54 0 V86 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 Z"
          />
          <ellipse className={styles.ghostEye} cx="26" cy="36" rx="4" ry="6" />
          <ellipse className={styles.ghostEye} cx="44" cy="36" rx="4" ry="6" />
          <ellipse className={styles.ghostEye} cx="35" cy="52" rx="4" ry="5" />
        </svg>
      </div>
      <p className={styles.name}>{grave.name}</p>
      <p className={styles.price}>Haunting you for {formatMoney(monthlyCents, grave.currency)}/mo</p>
    </div>
  );
}
