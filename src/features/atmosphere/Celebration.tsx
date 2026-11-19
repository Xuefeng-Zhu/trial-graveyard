import { useEffect } from 'react';
import { Coin } from '../../design/pixel';
import styles from './atmosphere.module.css';

export const CELEBRATION_MS = 2200;
const COINS = [10, 28, 46, 64, 82] as const;
const SPARKS = [18, 34, 50, 70, 86] as const;

export interface CelebrationProps {
  /** Formatted saved amount, for example "$14.95". */
  amount: string;
  motion: boolean;
  onDone: () => void;
}

/**
 * Cancellation celebration: floating coins, green exorcism particles and a small saved-amount pop.
 * The amount is always announced politely; the coins and particles only draw when motion is allowed.
 */
export function Celebration({ amount, motion, onDone }: CelebrationProps) {
  useEffect(() => {
    const id = window.setTimeout(onDone, CELEBRATION_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className={styles.celebration} data-testid="celebration">
      {motion && (
        <div aria-hidden="true" data-testid="celebration-fx">
          {COINS.map((left, i) => (
            <span key={left} className={styles.coin} style={{ left: `${left}%`, animationDelay: `${i * 0.15}s` }}>
              <Coin scale={3} />
            </span>
          ))}
          {SPARKS.map((left, i) => (
            <span key={left} className={styles.exorcism} style={{ left: `${left}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}
      <p role="status" className={`${styles.pop} ${motion ? styles.popAnimated : ''}`}>
        {amount} saved
      </p>
    </div>
  );
}
