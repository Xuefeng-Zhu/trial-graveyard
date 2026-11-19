import styles from './atmosphere.module.css';

const FIREFLIES = [8, 22, 37, 51, 66, 80, 91] as const;
const LANTERNS = [12, 88] as const;

/**
 * Decorative night layers drawn over the pixel backdrop: flickering
 * lanterns, low fog and fireflies. Pure CSS keyframes. Renders nothing when motion is not allowed,
 * so reduced motion and Calm mode get the still backdrop.
 */
export function Atmosphere({ motion }: { motion: boolean }) {
  if (!motion) return null;
  return (
    <div className={styles.atmosphere} aria-hidden="true" data-testid="atmosphere">
      {LANTERNS.map((left) => (
        <span key={left} className={styles.lantern} style={{ left: `${left}%` }} />
      ))}
      <span className={styles.fog} />
      {FIREFLIES.map((left, i) => (
        <span
          key={left}
          className={styles.firefly}
          style={{ left: `${left}%`, animationDelay: `${i * 0.7}s`, bottom: `${12 + ((i * 11) % 30)}%` }}
        />
      ))}
    </div>
  );
}
