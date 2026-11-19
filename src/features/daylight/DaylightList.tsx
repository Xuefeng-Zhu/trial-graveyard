import { byCharge } from '../../domain/stage'
import type { Grave } from '../../domain/trial'
import { DetailsPanel, type GraveActions } from '../cemetery/DetailsPanel'
import styles from './daylight.module.css'

export function DaylightList({ graves, now, actions }: { graves: Grave[]; now: Date; actions: GraveActions }) {
  return <ul className={styles.list} aria-label="Trials by charge date">
    {[...graves].sort(byCharge).map(grave => <li key={grave.id} className="panel stack">
      <h3>{grave.name}</h3><DetailsPanel grave={grave} now={now} actions={actions} />
    </li>)}
  </ul>
}
