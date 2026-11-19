import { format } from 'date-fns'
import { buildIcs } from '../../domain/ics'
import { countdown, getViewState } from '../../domain/stage'
import { cadenceSuffix, formatMoney } from '../../domain/savings'
import type { Grave } from '../../domain/trial'
import { downloadIcs } from '../daylight/downloadIcs'

export interface GraveActions {
  edit: (grave: Grave) => void; remove: (grave: Grave) => void; cancel: (grave: Grave) => void;
  keep: (grave: Grave) => void; announce: (text: string) => void;
}

export function DetailsPanel({ grave, now, actions }: { grave: Grave; now: Date; actions: GraveActions }) {
  const state = getViewState(grave, now)
  const status = state.kind === 'grave' ? state.stage : grave.status
  return <div className="stack">
    <dl className="facts">
      <div><dt>Charge date</dt><dd>{format(grave.chargeAt, 'MMM d, yyyy')}</dd></div>
      <div><dt>Price</dt><dd>{formatMoney(grave.priceCents, grave.currency)}{cadenceSuffix[grave.cadence]}</dd></div>
      <div><dt>Remaining</dt><dd>{state.kind === 'grave' ? countdown(state.remainingMs) : '—'}</dd></div>
      <div><dt>Status</dt><dd>{status}</dd></div>
    </dl>
    {state.kind === 'tombstone' && <p>{state.epitaph}</p>}
    {state.kind === 'ghost' && <p>{formatMoney(state.monthlyCents, grave.currency)} monthly equivalent</p>}
    <div className="actions">
      {grave.status === 'active' && <>
        {grave.cancelUrl ? <a className="button" href={grave.cancelUrl} target="_blank" rel="noopener noreferrer">Cancel now</a>
          : <button disabled title="No cancellation URL saved">Cancel now (no link)</button>}
        <button className="primary" onClick={() => actions.cancel(grave)}>I cancelled</button>
        <button onClick={() => actions.keep(grave)}>Keep it</button>
      </>}
      <button onClick={() => { downloadIcs(buildIcs([grave], now), 'trial-reminder'); actions.announce('Calendar file downloaded.') }}>Add to calendar</button>
      <button onClick={() => actions.edit(grave)}>Edit</button>
      <button className="danger" onClick={() => actions.remove(grave)}>Delete</button>
    </div>
  </div>
}
