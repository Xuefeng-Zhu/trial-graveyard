import { cadenceSuffix, formatMoney } from '../../domain/savings'
import { urgency } from '../../domain/hero'
import { countdown, remainingTime } from '../../domain/stage'
import { dailyQuest, decorations, levelForXp, totalXp, xpProgress } from '../../domain/xp'
import type { Grave } from '../../domain/trial'
import type { ProgressState } from '../../state/storage'
import type { summarize } from '../../domain/selectors'
import { PixelIcon } from '../../design/pixel/PixelIcon'
import { displayTotals } from '../exorcism/StatsPanel'
import styles from './scene.module.css'

export function Hud({ now, progress, summary, urgent, onExorcise }: {
  now: Date; progress: ProgressState; summary: ReturnType<typeof summarize>; urgent: number; onExorcise: (grave: Grave) => void;
}) {
  const xp = totalXp(progress.ledger)
  const level = levelForXp(xp)
  const next = summary.next ?? summary.overdue[0]
  const quest = dailyQuest(progress.ledger, now)
  return <footer className={styles.hud}>
    <section className={styles.quest} aria-label="Graveyard progress">
      <div className={styles.questIcon}><PixelIcon name="quest" size={3} /></div>
      <div className={styles.questInfo}>
        <div><strong>Daily Quest</strong><span>Cancel 1 trial ({quest}/1)</span></div>
        <div><strong>Lv. {level}</strong><progress value={xpProgress(xp)} max={1} aria-label={`Level progress, ${xp} XP`} /></div>
      </div>
    </section>
    {decorations.filter(item => level >= item.level).length > 0 && <div className={styles.decorations}>
      {decorations.filter(item => level >= item.level).map(item => <PixelIcon key={item.id} name={item.id} size={3} />)}
    </div>}
    <img className={`pixel ${styles.reaper}`} src={`${import.meta.env.BASE_URL}pixel/reaper.png`} width="98" height="112" alt="" />
    <div className={styles.charge}>
      <dl aria-live="polite" data-urgency={summary.next ? urgency(summary.next, now) : undefined}>
        <dt>Next charge</dt>
        <dd>{summary.next ? <>
          {summary.next.name} · {countdown(remainingTime(summary.next, now))}
          <span className={styles.nextPrice}> · {formatMoney(summary.next.priceCents, summary.next.currency)}{cadenceSuffix[summary.next.cadence]}</span>
        </> : 'None upcoming'}</dd>
      </dl>
      <button type="button" className="primary" disabled={!next} onClick={() => { if (next) onExorcise(next) }}>
        <PixelIcon name="sword" />{urgent ? `Exorcise Trials (${urgent})` : 'Exorcise next trial'}
      </button>
    </div>
  </footer>
}

export function SceneTotals({ summary }: { summary: ReturnType<typeof summarize> }) {
  return <div className={styles.totals}>
    <p className={styles.risk}>At risk this week <strong>{displayTotals(summary.atRisk)}</strong>{summary.overdue.length > 0 && <span>{summary.overdue.length} overdue</span>}</p>
    <p className={styles.coins} aria-live="polite"><PixelIcon name="coin" /><strong>{displayTotals(summary.saved)}</strong> saved</p>
  </div>
}
