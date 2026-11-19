import { PixelIcon } from '../../design/pixel/PixelIcon'
import { useState } from 'react'
import { findDuplicate, trialKey } from '../../domain/duplicates'
import { validateTrial, type TrialInput } from '../../domain/trial'
import type { Candidate } from '../../lib/email'
import { useGraveyard } from '../../state/store'
import { Dialog } from '../dialog/Dialog'
import { formToTrial, fromGrave } from '../editor/formValues'
import { ReviewRow, type Row } from './ReviewRow'
import { foundMessage, scanMessage, useSeance } from './useSeance'
import styles from './seance.module.css'

function makeRow(candidate: Candidate): Row {
  const form = fromGrave(candidate.fields)
  return { candidate, selected: candidate.confidence >= .5, values: {
    ...form, priceCents: Number.isFinite(candidate.fields.priceCents) ? form.priceCents : '',
  } }
}

function Review({ candidates, onBury }: { candidates: Candidate[]; onBury: (trials: TrialInput[]) => void }) {
  const [rows, setRows] = useState(() => candidates.map(makeRow))
  const [attempted, setAttempted] = useState(false)
  const [notice, setNotice] = useState('')
  const selected = rows.filter(row => row.selected)
  const valid = selected.map(row => formToTrial(row.values)).filter(trial => !Object.keys(validateTrial(trial)).length)
  const duplicate = (trial: TrialInput) => !!findDuplicate(useGraveyard.getState().graves, trial)
    || valid.filter(other => trialKey(other) === trialKey(trial)).length > 1

  function submit() {
    setAttempted(true)
    if (selected.length !== valid.length || valid.some(duplicate)) {
      setNotice('Review the highlighted fields before burying the selected trials.')
      return
    }
    onBury(valid)
  }

  if (!rows.length) return <p>The inbox is quiet. No restless trials found.</p>
  return <div className="stack">
    <p role="status">{foundMessage(rows.length)}. Review the fields before saving.</p>
    {rows.map((row, index) => <ReviewRow key={row.candidate.key} row={row} attempted={attempted} onDuplicate={duplicate}
      onChange={next => setRows(previous => previous.map((current, at) => at === index ? next : current))} />)}
    <div><button className="primary" disabled={!selected.length} onClick={submit}>Bury selected ({selected.length})</button></div>
    {notice && <p role="alert">{notice}</p>}
  </div>
}

export function SeancePanel({ now, onClose, makeProvider, onBury }: {
  now: Date; onClose: () => void; makeProvider?: Parameters<typeof useSeance>[2]; onBury: (trials: TrialInput[]) => void;
}) {
  const graves = useGraveyard(state => state.graves)
  const seance = useSeance(now, graves, makeProvider)
  return <Dialog title="Inbox Séance" onClose={onClose}>
    <div className="stack">
      {seance.phase === 'idle' && <>
        <p><strong>Haunted Demo Inbox</strong> uses fictional receipt emails.</p>
        <div className="actions"><button className="primary" onClick={seance.ask}>Connect</button>
          <button disabled aria-disabled="true">Gmail, coming soon</button><button disabled aria-disabled="true">Outlook, coming soon</button></div>
      </>}
      {seance.phase === 'consent' && <section className="panel stack" aria-label="Demo inbox consent">
        <p>Allow the Haunted Demo Inbox to read its sample receipts?</p>
        <div className="actions"><button className="primary" onClick={() => void seance.scan()}>Allow</button><button onClick={seance.disconnect}>Decline</button></div>
      </section>}
      {seance.phase === 'scanning' && <>
        <span className={styles.orb} aria-hidden="true"><PixelIcon name="crystal" size={4} /></span>
        <p role="status">{scanMessage(seance.progress)}</p>
      </>}
      {seance.phase === 'error' && <p role="alert">The connection went quiet. You can review any trials already found.</p>}
      {(seance.phase === 'review' || seance.phase === 'error') && <Review candidates={seance.candidates} onBury={trials => {
        seance.disconnect()
        onBury(trials)
      }} />}
      {['scanning', 'review', 'error'].includes(seance.phase) && <div><button onClick={seance.disconnect}>Disconnect</button></div>}
      <p className="muted"><strong>What the spirits can see.</strong> Receipt mail is read on this device. Only trials you confirm are kept. Email bodies are never saved.</p>
    </div>
  </Dialog>
}
