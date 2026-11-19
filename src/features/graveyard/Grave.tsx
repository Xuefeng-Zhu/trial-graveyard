import { stageLabel } from '../../domain/stage';
import type { Stage } from '../../domain/stage';
import { formatMoney } from '../../domain/savings';
import type { Grave as GraveData } from '../../domain/trial';
import styles from './graveyard.module.css';

export const CADENCE_SUFFIX = { 'one-time': '', weekly: '/wk', monthly: '/mo', yearly: '/yr' } as const;

export type BuriedStage = Extract<Stage, 'sealed' | 'cracked' | 'churning'>;

export interface GraveProps {
  grave: GraveData;
  stage: BuriedStage;
  remainingMs: number;
  reduced: boolean;
}

/** An active grave that is not yet urgent: sealed, cracked, or churning with a green glow. */
export function Grave({ grave, stage, remainingMs, reduced }: GraveProps) {
  const churning = stage === 'churning';
  return (
    <div className={`${styles.figure} ${styles[stage]}`} data-stage={stage}>
      <svg viewBox="0 0 80 100" className={styles.art} aria-hidden="true" focusable="false">
        <path className={styles.stone} d="M10 98 V38 a30 30 0 0 1 60 0 V98 Z" />
        <path className={styles.stoneShade} d="M10 98 V38 a30 30 0 0 1 8 -21 V98 Z" />
        <path className={styles.cross} d="M40 30 v26 M31 40 h18" />
        {stage !== 'sealed' && (
          <g className={styles.cracks} data-testid="cracks">
            <path d="M44 14 L38 30 L47 40 L36 56 L44 70" />
            <path d="M47 40 L58 46" />
            {churning && <path d="M30 98 L34 82 L27 72 M58 98 L55 84 L63 76" />}
          </g>
        )}
        <ellipse className={styles.mound} cx="40" cy="98" rx="42" ry={churning ? 9 : 6} />
        {churning && (
          <g
            className={styles.dirt}
            data-motion={reduced ? 'still' : 'animated'}
            data-testid="dirt"
          >
            <circle cx="20" cy="88" r="2.2" />
            <circle cx="40" cy="85" r="2.8" />
            <circle cx="60" cy="89" r="2" />
            <circle cx="49" cy="82" r="1.6" />
          </g>
        )}
      </svg>
      <p className={styles.name}>{grave.name}</p>
      <p className={styles.stageText}>{stageLabel(stage, remainingMs)}</p>
      <p className={styles.price}>
        {formatMoney(grave.priceCents, grave.currency)}
        {CADENCE_SUFFIX[grave.cadence]}
      </p>
    </div>
  );
}
