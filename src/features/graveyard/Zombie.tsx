import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { stageLabel } from '../../domain/stage';
import { formatMoney } from '../../domain/savings';
import type { Grave as GraveData } from '../../domain/trial';
import { CADENCE_SUFFIX } from './Grave';
import styles from './graveyard.module.css';

export interface ZombieProps {
  grave: GraveData;
  overdue: boolean;
  remainingMs: number;
  reduced: boolean;
}

const SHAMBLE = {
  x: [0, 5, -3, 4, 0],
  y: [0, -3, 0, -2, 0],
  rotate: [0, 2.5, -1.5, 2, 0],
  scale: [1, 1.03, 1, 1.04, 1],
};

function Art({ rising }: { rising: boolean }): ReactNode {
  return (
    <svg viewBox="0 0 100 120" className={styles.art} aria-hidden="true" focusable="false">
      <ellipse className={styles.mound} cx="50" cy="116" rx="48" ry="8" />
      <g className={rising ? styles.rise : undefined} data-motion={rising ? 'animated' : 'still'}>
        <path className={styles.rags} d="M30 118 V70 q20 -12 40 0 V118 Z" />
        <path className={styles.arm} d="M32 76 L10 48 L16 44 L38 66 Z" />
        <path className={styles.arm} d="M68 76 L90 48 L84 44 L62 66 Z" />
        <circle className={styles.zombieHead} cx="50" cy="52" r="22" />
        <circle className={styles.eye} cx="42" cy="48" r="4.5" />
        <circle className={styles.eye} cx="58" cy="50" r="3.5" />
        <path className={styles.mouth} d="M40 64 l4 -3 l4 3 l4 -3 l4 3 l4 -3" />
        <path className={styles.rags} d="M36 118 l4 -14 l5 14 M60 118 l4 -10 l5 10" />
      </g>
    </svg>
  );
}

/** A grave within 48 hours of its charge: it has risen and shambles toward the front. */
export function Zombie({ grave, overdue, remainingMs, reduced }: ZombieProps) {
  const stage = overdue ? 'overdue' : 'zombie';
  const body = (
    <>
      <Art rising={!reduced} />
      {overdue && <span className={styles.overdueTag}>Overdue</span>}
    </>
  );
  return (
    <div className={`${styles.figure} ${styles[stage]}`} data-stage={stage}>
      {reduced ? (
        <div className={styles.shamble} data-motion="still" data-testid="zombie-pose">
          {body}
        </div>
      ) : (
        <motion.div
          className={styles.shamble}
          data-motion="animated"
          data-testid="zombie-pose"
          animate={SHAMBLE}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {body}
        </motion.div>
      )}
      <p className={styles.name}>{grave.name}</p>
      <p className={styles.stageText}>{stageLabel(stage, remainingMs)}</p>
      <p className={styles.price}>
        {formatMoney(grave.priceCents, grave.currency)}
        {CADENCE_SUFFIX[grave.cadence]}
      </p>
    </div>
  );
}
