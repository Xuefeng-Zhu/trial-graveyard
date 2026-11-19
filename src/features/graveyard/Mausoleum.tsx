import { formatMoney, totalSavedByCurrency } from '../../domain/savings'
import type { Grave } from '../../domain/trial'

export function Mausoleum({ graves }: { graves: Grave[] }) {
  const totals = Object.entries(totalSavedByCurrency(graves))
  return <section className="panel stack" aria-label="Mausoleum">
    <h2>Mausoleum</h2>
    <p aria-live="polite">Souls saved <strong className="status">{totals.length ? totals.map(([currency, cents]) => formatMoney(cents, currency)).join(' · ') : formatMoney(0)}</strong></p>
    {!totals.length && <p className="muted">Confirmed cancellations will rest here.</p>}
  </section>
}
