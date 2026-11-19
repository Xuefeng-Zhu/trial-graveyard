import { PixelIcon } from '../../design/pixel/PixelIcon'
import menus from '../cemetery/menus.module.css'
import { deriveStats, formatDaysUsed } from '../../domain/stats'
import { formatMoney } from '../../domain/savings'
import type { Grave } from '../../domain/trial'

export const displayTotals = (totals: Record<string, number>) =>
  Object.keys(totals).length ? Object.keys(totals).sort().map(currency => formatMoney(totals[currency], currency)).join(' · ') : formatMoney(0)

export function StatsPanel({ graves, now }: { graves: Grave[]; now: Date }) {
  const stats = deriveStats(graves, now)
  return <section className={menus.card} aria-label="Trial hacker stats">
    <div className={menus.art}><PixelIcon name="quest" size={5} /></div>
    <h2>Trial hacker stats</h2>
    <dl className="facts">
      <div><dt>Confirmed cancellations</dt><dd>{stats.confirmedCancellations}</dd></div>
      <div><dt>Trials survived before charge</dt><dd>{stats.survived}</dd></div>
      <div><dt>First charges dodged this year</dt><dd>{displayTotals(stats.dodged)}</dd></div>
      <div><dt>Average days used before cancelling</dt><dd>{formatDaysUsed(stats.avgDaysUsed)}</dd></div>
      <div><dt>Overdue active trials</dt><dd>{stats.overdue}</dd></div>
    </dl>
  </section>
}
