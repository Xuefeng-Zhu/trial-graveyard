import { useState } from 'react'
import { exportGraveyard, importGraveyard } from '../../state/backup'
import type { PersistedState } from '../../state/storage'
import { useGraveyard } from '../../state/store'
import { downloadFile } from '../daylight/downloadIcs'
import { Dialog } from '../dialog/Dialog'

export function DataControls({ announce }: { announce: (message: string) => void }) {
  const [incoming, setIncoming] = useState<PersistedState>()
  const [clear, setClear] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const state = useGraveyard()
  async function read(file: File) {
    setError('')
    try {
      const backup = importGraveyard(await file.text())
      if (backup) { setIncoming(backup); return }
    } catch { /* Show the schema error for inaccessible files too. */ }
    setError('This file is not a valid Trial Graveyard backup.')
  }
  function exportData() {
    const json = exportGraveyard(state.snapshot())
    downloadFile(new Blob([json], { type: 'application/json' }), 'trial-graveyard.json')
    announce('Graveyard backup downloaded.')
  }
  return <section className="stack" aria-label="Graveyard data">
    <h2>Graveyard data</h2>
    <div className="actions"><button onClick={exportData}>Export graveyard (JSON)</button>
      <label className="button fileButton">Import graveyard (JSON)
        <input aria-label="Import graveyard (JSON)" type="file" accept=".json,application/json" onChange={event => {
          const file = event.currentTarget.files?.[0]
          if (file) void read(file)
          event.currentTarget.value = ''
        }} /></label>
      <button className="danger" onClick={() => { setConfirmation(''); setClear(true) }}>Clear all data</button></div>
    {error && <p role="alert" className="danger">{error}</p>}
    {incoming && <Dialog title="Import graveyard" onClose={() => setIncoming(undefined)}>
      <div className="stack"><p>This backup contains {incoming.graves.length} {incoming.graves.length === 1 ? 'grave' : 'graves'}. Merge to add missing graves and keep local preferences, or replace all graves and preferences.</p>
        <div className="actions">
          <button className="primary" onClick={() => { state.restore(incoming, 'merge'); setIncoming(undefined); announce('Graveyard merged.') }}>Merge graves</button>
          <button className="danger" onClick={() => { state.restore(incoming, 'replace'); setIncoming(undefined); announce('Graveyard replaced.') }}>Replace all data</button></div>
      </div>
    </Dialog>}
    {clear && <Dialog title="Clear all graveyard data?" onClose={() => setClear(false)}>
      <div className="stack"><p>This removes every trial and resets your preferences. Type <strong>CLEAR</strong> to confirm.</p>
        <label className="stack">Confirmation<input value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        <div><button className="danger" disabled={confirmation !== 'CLEAR'} onClick={() => {
          state.clearData()
          setClear(false)
          announce('All graveyard data cleared.')
        }}>Clear everything</button></div>
      </div>
    </Dialog>}
  </section>
}
