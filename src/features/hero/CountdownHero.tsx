import { heroCountdown, urgency } from '../../domain/hero'
import { cadenceSuffix, formatMoney } from '../../domain/savings'
import type { Grave } from '../../domain/trial'
import styles from './hero.module.css'

export function CountdownHero({ grave, now, onExorcise }: { grave?: Grave; now: Date; onExorcise: (grave: Grave) => void }) {
  return <section className={`panel ${styles.hero}`} aria-label="Next to bite" data-urgency={grave ? urgency(grave, now) : undefined}>
    <div className="stack"><h2>Next to bite</h2>
      {grave ? <p><strong>{grave.name}</strong> {heroCountdown(grave, now).text} · {formatMoney(grave.priceCents, grave.currency)}{cadenceSuffix[grave.cadence]}</p>
        : <p className="muted">No upcoming active charges.</p>}</div>
    {grave && <button className="primary" onClick={() => onExorcise(grave)}>Exorcise next trial</button>}
  </section>
}
