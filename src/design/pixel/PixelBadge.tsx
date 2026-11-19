import type { ReactNode } from 'react';
import styles from './pixel.module.css';

export type BadgeTone = 'neutral' | 'warning' | 'critical' | 'success' | 'info';

/** Small label. The words carry the meaning; the tone only adds colour. */
export function PixelBadge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[`tone-${tone}`]}`}>{children}</span>;
}
