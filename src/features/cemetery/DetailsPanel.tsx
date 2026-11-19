import { useState } from 'react'
import { format } from 'date-fns'
import { buildHauntingIcs } from '../../domain/haunting'
import { buildIcs } from '../../domain/ics'
import { pixelStateFor, statusText } from '../../domain/pixelState'
import { cadenceSuffix, formatMoney, monthlyCents } from '../../domain/savings'
import type { Grave } from '../../domain/trial'
import { PixelIcon } from '../../design/pixel/PixelIcon'
import { Tombstone } from '../graveyard/Tombstone'
import { downloadIcs } from '../daylight/downloadIcs'
import styles from './details.module.css'

export interface GraveActions {
  edit: (grave: Grave) => void; remove: (grave: Grave) => void; cancel: (grave: Grave) => void;
  exorcise: (grave: Grave) => void; keep: (grave: Grave) => void;
}

export function DetailsPanel({ grave, now, actions }: { grave: Grave; now: Date; actions: GraveActions }) {
  const [notice, setNotice] = useState('')
  const state = pixelStateFor(grave, now)
  const active = grave.status === 'active'

  function calendar(haunting: boolean) {
    if (haunting) downloadIcs(buildHauntingIcs([grave], now), 'trial-hauntings')
    else downloadIcs(buildIcs([grave], now), 'trial-reminder')
    setNotice(haunting ? 'Haunting calendar file downloaded.' : 'Calendar file downloaded.')
  }

  return <div className="stack">
    <dl className="facts">
      <div><dt>Charge date</dt><dd>{format(grave.chargeAt, 'MMM d, yyyy')}</dd></div>
      <div><dt>Price</dt><dd>{formatMoney(grave.priceCents, grave.currency)}{cadenceSuffix[grave.cadence]}</dd></div>
      <div><dt>Remaining</dt><dd>{active ? state.label : 'Closed'}</dd></div>
      <div><dt>Status</dt><dd className={styles.state} data-kind={state.kind}>{statusText[state.kind]}</dd></div>
    </dl>
    {state.kind === 'cancelled' && <Tombstone grave={grave} />}
    {state.kind === 'kept' && <p>{formatMoney(monthlyCents(grave), grave.currency)} monthly equivalent</p>}
    <div className={styles.actionGrid}>
      {active && <>
        <button className={`primary ${styles.full}`} onClick={() => actions.exorcise(grave)}><PixelIcon name="sword" /> Exorcise</button>
        {grave.cancelUrl ? <a className={`button ${styles.full}`} href={grave.cancelUrl} target="_blank" rel="noopener noreferrer">Cancel now</a>
          : <button className={styles.full} disabled title="No cancellation URL saved">Cancel now (no link)</button>}
        <button onClick={() => actions.cancel(grave)}>I cancelled</button>
        <button onClick={() => actions.keep(grave)}>Keep it</button>
      </>}
      <button className={styles.full} onClick={() => calendar(false)}>Add to calendar</button>
      <button className={styles.full} onClick={() => calendar(true)}>Add haunting to calendar</button>
      <button onClick={() => actions.edit(grave)}>Edit trial</button>
      <button className="danger" onClick={() => actions.remove(grave)}>Delete</button>
    </div>
    <p role="status" className={notice ? styles.status : 'sr-only'}>{notice}</p>
  </div>
}
