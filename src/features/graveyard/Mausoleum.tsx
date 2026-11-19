import { formatMoney, totalSavedByCurrency } from '../../domain/savings'
import { PixelIcon } from '../../design/pixel/PixelIcon'
import menus from '../cemetery/menus.module.css'
import { Tombstone } from './Tombstone'
import { ShareButton } from '../share/ShareButton'
import type { Grave } from '../../domain/trial'

export function Mausoleum({ graves }: { graves: Grave[] }) {
  const totals = Object.entries(totalSavedByCurrency(graves))
  return <section className={menus.card} aria-label="Mausoleum">
    <div className={menus.art}><PixelIcon name="coin" size={5} /></div>
    <h2>Mausoleum</h2>
    <p aria-live="polite">Souls saved <strong className="status">{totals.length ? totals.map(([currency, cents]) => formatMoney(cents, currency)).join(' · ') : formatMoney(0)}</strong></p>
    {totals.length ? <ul>{graves.filter(grave => grave.status === 'cancelled').map(grave =>
      <li key={grave.id}><Tombstone grave={grave} /></li>)}</ul> : <p className="muted">Confirmed cancellations will rest here.</p>}
    <ShareButton graves={graves} />
  </section>
}
