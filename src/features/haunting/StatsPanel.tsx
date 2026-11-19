import { formatMoney } from '../../domain/savings';
import { deriveStats } from '../../domain/stats';
import type { Grave } from '../../domain/trial';
import styles from './haunting.module.css';

export interface StatsPanelProps {
  graves: readonly Grave[];
  now: Date;
}

/** The trial-hacker stats, all derived from the graves. */
export function StatsPanel({ graves, now }: StatsPanelProps) {
  const stats = deriveStats(graves, now);
  const dodged =
    stats.dodged.length === 0
      ? formatMoney(0, 'USD')
      : stats.dodged.map((t) => formatMoney(t.cents, t.currency)).join(', ');
  const avg = stats.avgDaysUsed === null ? 'None yet' : `${stats.avgDaysUsed.toFixed(1)} days`;
  const items: Array<[string, string]> = [
    ['Trials survived', String(stats.survived)],
    ['Dollars dodged this year', dodged],
    ['Average days used before cancelling', avg],
    ['Trials that escaped', String(stats.escaped)],
  ];
  return (
    <section className={styles.stats} aria-labelledby="stats-heading">
      <h2 id="stats-heading">Trial hacker stats</h2>
      <dl className={styles.statList}>
        {items.map(([label, value]) => (
          <div key={label} className={styles.stat}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
