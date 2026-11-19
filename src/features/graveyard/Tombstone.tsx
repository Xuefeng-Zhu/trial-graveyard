import { formatMoney } from '../../domain/savings';
import type { Grave as GraveData } from '../../domain/trial';
import styles from './graveyard.module.css';

export interface TombstoneProps {
  grave: GraveData;
  epitaph: string;
  savedCents: number;
}

/** A cancelled trial resting in peace, with its epitaph and the money saved. */
export function Tombstone({ grave, epitaph, savedCents }: TombstoneProps) {
  return (
    <div className={`${styles.figure} ${styles.tombstone}`} data-stage="tombstone">
      <svg viewBox="0 0 80 100" className={styles.art} aria-hidden="true" focusable="false">
        <path className={styles.stoneMossy} d="M8 98 V40 a32 32 0 0 1 64 0 V98 Z" />
        <text className={styles.rip} x="40" y="36" textAnchor="middle">
          RIP
        </text>
        <path className={styles.engrave} d="M24 48 h32 M28 56 h24 M32 64 h16" />
        <path className={styles.moss} d="M8 98 q6 -10 12 -4 q6 -12 14 -2 q8 -8 14 0 q8 -10 12 2 q6 -6 12 4 Z" />
      </svg>
      <p className={styles.name}>{grave.name}</p>
      <p className={styles.epitaph}>{epitaph}</p>
      <p className={styles.srOnly}>Saved {formatMoney(savedCents, grave.currency)}</p>
    </div>
  );
}
