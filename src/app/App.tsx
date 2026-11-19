import { useEffect, useState } from 'react'
import { buildIcs } from '../domain/ics'
import type { Grave, TrialInput } from '../domain/trial'
import { useGraveyard } from '../state/store'
import { useNow } from '../state/useNow'
import { Scene } from '../features/cemetery/Scene'
import { DetailsPanel, type GraveActions } from '../features/cemetery/DetailsPanel'
import { DaylightList } from '../features/daylight/DaylightList'
import { downloadIcs } from '../features/daylight/downloadIcs'
import { Dialog } from '../features/dialog/Dialog'
import { GraveForm } from '../features/editor/GraveForm'
import { PasteBox } from '../features/editor/PasteBox'
import { emptyValues, mergeParsed } from '../features/editor/formValues'
import { Mausoleum } from '../features/graveyard/Mausoleum'
import { useReducedMotion } from '../features/graveyard/useReducedMotion'
import type { ParseResult } from '../lib/parse'
import { Landing } from '../features/landing/Landing'
import { playSound, setSoundEnabled } from '../design/sounds'
import styles from './app.module.css'

type Screen = 'graveyard' | 'add' | 'savings' | 'settings'
const screens: Record<Screen, string> = { graveyard: 'Graveyard', add: 'Add trial', savings: 'Savings', settings: 'Settings' }
const getScreen = () => Object.keys(screens).find(key => key === location.hash.slice(1)) as Screen | undefined ?? 'graveyard'
type Modal = { kind: 'details' | 'edit' | 'delete'; id: string }

export function App() {
  const state = useGraveyard()
  const { graves, settings, undoEntry } = state
  const now = useNow()
  const reduced = useReducedMotion()
  const [screen, setScreen] = useState(getScreen)
  const [modal, setModal] = useState<Modal>()
  const [values, setValues] = useState(emptyValues)
  const [dateSource, setDateSource] = useState<string>()
  const [message, announce] = useState('')
  const selected = graves.find(grave => grave.id === modal?.id)
  const active = graves.filter(grave => grave.status === 'active')

  useEffect(() => {
    const changed = () => setScreen(getScreen())
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])
  useEffect(() => {
    if (!undoEntry) return
    const timer = window.setTimeout(state.dismissUndo, Math.max(0, undoEntry.until - Date.now()))
    return () => window.clearTimeout(timer)
  }, [undoEntry, state.dismissUndo])

  useEffect(() => setSoundEnabled(settings.soundOn), [settings.soundOn])

  const close = () => setModal(undefined)
  function open(grave: Grave) { setModal({ kind: 'details', id: grave.id }) }
  function navigate(target: Screen) { setScreen(target); location.hash = target; close() }
  function prefill(parsed: ParseResult) {
    setValues(previous => mergeParsed(previous, parsed))
    if (parsed.chargeAt) setDateSource(parsed.chargeAt.source)
  }
  function bury(input: TrialInput) {
    if (!state.addGrave(input, new Date())) return
    playSound('creak')
    setValues(emptyValues)
    setDateSource(undefined)
    announce('Trial buried. Its charge is tracked.')
    navigate('graveyard')
  }
  const actions: GraveActions = {
    edit: grave => setModal({ id: grave.id, kind: 'edit' }),
    remove: grave => setModal({ id: grave.id, kind: 'delete' }),
    cancel: grave => { state.cancelGrave(grave.id, new Date()); playSound('thunder'); close() },
    keep: grave => { state.keepGrave(grave.id, new Date()); close() },
    announce,
  }
  const exportCalendar = () => { downloadIcs(buildIcs(active, now), 'graveyard-reminders'); announce('Calendar file downloaded.') }
  return <div className={styles.app} data-daylight={settings.daylight} data-motion={!settings.daylight && !settings.calm && !reduced}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="#graveyard" onClick={() => navigate('graveyard')}>☠ Trial Graveyard</a>
        <nav aria-label="Main navigation">{Object.entries(screens).map(([key, label]) => <a key={key}
          href={`#${key}`} aria-current={screen === key ? 'page' : undefined} onClick={() => navigate(key as Screen)}>{label}</a>)}</nav>
        <button aria-pressed={settings.daylight} onClick={() => state.toggle('daylight')}>Daylight mode: {settings.daylight ? 'ON' : 'OFF'}</button>
        <button aria-pressed={settings.soundOn} onClick={() => state.toggle('soundOn')}>Sound: {settings.soundOn ? 'ON' : 'OFF'}</button>
      </header>
      <main className="stack">
        {state.notice && <p role="alert" className="panel">{state.notice}</p>}
        {!state.ready ? <p role="status">Opening the graveyard…</p> : <>
          {screen === 'graveyard' && (graves.length ? <>
            <h1>Your graveyard</h1>
            {settings.daylight ? <DaylightList graves={graves} now={now} actions={actions} /> : <Scene graves={graves} now={now} onOpen={open} />}
            <div className="actions"><button disabled={!active.length} onClick={exportCalendar}>Export all active to calendar</button></div>
            <Mausoleum graves={graves} />
          </> : <Landing daylight={settings.daylight} reduced={reduced || settings.calm}
              onSummon={() => state.loadDemo(new Date())} onAdd={() => navigate('add')} />)}
          {screen === 'add' && <section className="panel stack"><h1>Add a trial</h1>
            <GraveForm values={values} change={setValues} onSave={bury} dateSource={dateSource} />
            <PasteBox now={now} onParsed={prefill} /></section>}
          {screen === 'savings' && <><h1>Savings</h1><Mausoleum graves={graves} /></>}
          {screen === 'settings' && <section className="panel stack"><h1>Settings</h1>
            <p className="muted">Your graves stay in this browser.</p>
            <button aria-pressed={settings.calm} onClick={() => state.toggle('calm')}>Calm mode: {settings.calm ? 'ON' : 'OFF'}</button>
            <div className="actions"><button onClick={() => { state.loadDemo(new Date()); navigate('graveyard') }}>Summon demo graveyard</button>
              <button disabled={!active.length} onClick={exportCalendar}>Export all active to calendar</button></div></section>}
        </>}
        <p role="status" className="status">{message}</p>
        {undoEntry && <div className={styles.toast}>
          <p role="status">{undoEntry.previous.name} {undoEntry.action}.</p><button onClick={() => { state.undo(new Date()); announce('Grave restored.') }}>Undo</button>
        </div>}
      </main>
    </div>
    {modal && selected && <Dialog key={modal.kind} title={modal.kind === 'details' ? selected.name : modal.kind === 'edit' ? 'Edit trial' : 'Delete trial?'} onClose={close}>
      {modal.kind === 'details' && <DetailsPanel grave={selected} now={now} actions={actions} />}
      {modal.kind === 'edit' && <GraveForm grave={selected} onSave={input => { state.updateGrave(selected.id, input); close(); announce('Trial updated.') }} />}
      {modal.kind === 'delete' && <div className="stack"><p>Remove {selected.name} from your graveyard?</p>
        <div className="actions"><button onClick={close}>Keep grave</button><button className="danger" onClick={() => { state.deleteGrave(selected.id, new Date()); close() }}>Delete grave</button></div></div>}
    </Dialog>}
  </div>
}
