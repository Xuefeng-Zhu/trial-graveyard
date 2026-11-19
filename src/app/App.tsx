import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { buildHauntingIcs } from '../domain/haunting'
import { buildIcs } from '../domain/ics'
import { summarize } from '../domain/selectors'
import { pixelStateFor, statusText } from '../domain/pixelState'
import { findDuplicate } from '../domain/duplicates'
import type { Grave, TrialInput } from '../domain/trial'
import { useGraveyard } from '../state/store'
import { useNow } from '../state/useNow'
import { PixelIcon } from '../design/pixel/PixelIcon'
import { useMediaQuery } from '../design/useMediaQuery'
import { playSound, setSoundEnabled } from '../design/sounds'
import { Celebration } from '../features/atmosphere/Fireflies'
import { Scene } from '../features/cemetery/Scene'
import { DetailsPanel, type GraveActions } from '../features/cemetery/DetailsPanel'
import { monogram, monogramColor } from '../features/cemetery/Gravestone'
import { TopNav, screens, type Screen } from '../features/cemetery/TopNav'
import { Collection, Quests } from '../features/cemetery/ProgressScreens'
import { DaylightList } from '../features/daylight/DaylightList'
import { downloadIcs } from '../features/daylight/downloadIcs'
import { Dialog } from '../features/dialog/Dialog'
import { GraveForm } from '../features/editor/GraveForm'
import { PasteBox } from '../features/editor/PasteBox'
import { emptyValues, mergeParsed } from '../features/editor/formValues'
import { ExorcismPanel } from '../features/exorcism/ExorcismPanel'
import { StatsPanel, displayTotals } from '../features/exorcism/StatsPanel'
import { Mausoleum } from '../features/graveyard/Mausoleum'
import { useReducedMotion } from '../features/graveyard/useReducedMotion'
import { CountdownHero } from '../features/hero/CountdownHero'
import { Landing } from '../features/landing/Landing'
import { SeanceButton } from '../features/seance/SeanceButton'
import { SeancePanel } from '../features/seance/SeancePanel'
import { DataControls } from '../features/settings/DataControls'
import type { ParseResult } from '../lib/parse'
import styles from './app.module.css'
import menus from '../features/cemetery/menus.module.css'

function getScreen(): Screen {
  const hash = location.hash.slice(1)
  return Object.hasOwn(screens, hash) ? hash as Screen : 'graveyard'
}

type Modal = { kind: 'details' | 'edit' | 'delete' | 'exorcise'; id: string }
const modalTitles = { edit: 'Edit trial', delete: 'Delete trial?' } as const

export function App() {
  const state = useGraveyard()
  const { graves, settings, progress, undoEntry } = state
  const now = useNow()
  const reduced = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1080px)')
  const [screen, setScreen] = useState(getScreen)
  const [modal, setModal] = useState<Modal>()
  const [inspector, setInspector] = useState<string | null>()
  const [seance, setSeance] = useState(false)
  const [duplicate, setDuplicate] = useState<{ trial: TrialInput; existing: Grave; editId?: string }>()
  const [values, setValues] = useState(emptyValues)
  const [dateSource, setDateSource] = useState<string>()
  const [message, announce] = useState('')
  const undoFocus = useRef<HTMLButtonElement>(null)
  const inspectorFocus = useRef<HTMLElement>(null)
  const inspectorTrigger = useRef<HTMLElement>()
  const summary = summarize(graves, now)
  const active = graves.filter(grave => grave.status === 'active')
  const selected = graves.find(grave => grave.id === modal?.id)
  const modalState = selected && modal?.kind === 'details' ? pixelStateFor(selected, now) : undefined
  const inlineDetails = wide && !settings.daylight && screen === 'graveyard'
  const inspected = inlineDetails && inspector !== null
    ? graves.find(grave => grave.id === (inspector ?? summary.next?.id ?? summary.overdue[0]?.id ?? graves[0]?.id)) : undefined

  useEffect(() => {
    const changed = () => { setScreen(getScreen()); setModal(undefined); setSeance(false); setDuplicate(undefined) }
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])
  useEffect(() => {
    if (!undoEntry) return
    const frame = requestAnimationFrame(() => undoFocus.current?.focus({ preventScroll: true }))
    const timer = window.setTimeout(state.dismissUndo, Math.max(0, undoEntry.until - Date.now()))
    return () => { window.clearTimeout(timer); cancelAnimationFrame(frame) }
  }, [undoEntry, state.dismissUndo])
  useEffect(() => setSoundEnabled(settings.soundOn), [settings.soundOn])

  const close = () => setModal(undefined)
  function navigate(target: Screen) {
    if (screen !== target) {
      window.history.pushState(null, '', `#${target}`)
      setScreen(target)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    close()
  }
  function open(grave: Grave, forceModal = false) {
    state.reviewGrave(grave.id, new Date())
    if (inlineDetails && !forceModal) {
      if (document.activeElement instanceof HTMLElement) inspectorTrigger.current = document.activeElement
      setInspector(grave.id)
      requestAnimationFrame(() => inspectorFocus.current?.focus({ preventScroll: true }))
    } else setModal({ kind: 'details', id: grave.id })
  }
  function closeInspector() {
    setInspector(null)
    if (inspectorTrigger.current?.isConnected) inspectorTrigger.current.focus()
  }
  function prefill(parsed: ParseResult) {
    setValues(previous => mergeParsed(previous, parsed))
    if (parsed.chargeAt) setDateSource(parsed.chargeAt.source)
  }
  function changeEditor(next: typeof values) {
    if (next.chargeAt !== values.chargeAt) setDateSource(undefined)
    setValues(next)
  }
  function bury(input: TrialInput, force = false) {
    const existing = force ? undefined : findDuplicate(useGraveyard.getState().graves, input)
    if (existing) { setDuplicate({ trial: input, existing }); return }
    if (!state.addGrave(input, new Date())) return
    playSound('creak')
    setValues(emptyValues)
    setDateSource(undefined)
    announce('Trial buried. Its charge is tracked.')
    navigate('graveyard')
  }
  function saveEdit(grave: Grave, input: TrialInput, force = false) {
    const existing = force ? undefined : findDuplicate(useGraveyard.getState().graves, input, grave.id)
    if (existing) { close(); setDuplicate({ trial: input, existing, editId: grave.id }); return }
    state.updateGrave(grave.id, input)
    close()
    announce('Trial updated.')
  }
  function confirmCancellation(grave: Grave) {
    state.exorcise(grave.id, new Date())
    playSound('thunder')
    close()
  }
  function summon() {
    state.loadDemo(now)
    setInspector(undefined)
    navigate('graveyard')
  }

  const actions: GraveActions = {
    edit: grave => setModal({ id: grave.id, kind: 'edit' }),
    remove: grave => setModal({ id: grave.id, kind: 'delete' }),
    cancel: confirmCancellation,
    exorcise: grave => { state.reviewGrave(grave.id, new Date()); setModal({ id: grave.id, kind: 'exorcise' }) },
    keep: grave => { state.keepGrave(grave.id, new Date()); close() },
  }
  function exportCalendar(haunting: boolean) {
    if (haunting) downloadIcs(buildHauntingIcs(active, now), 'graveyard-hauntings')
    else downloadIcs(buildIcs(active, now), 'graveyard-reminders')
    announce(haunting ? 'Haunting calendar file downloaded.' : 'Calendar file downloaded.')
  }

  return <div className={styles.app} data-daylight={settings.daylight} data-motion={!settings.daylight && !settings.calm && !reduced}>
    <a className={styles.skip} href="#main-content" onClick={event => {
      event.preventDefault()
      document.getElementById('main-content')?.focus()
    }}>Skip to content</a>
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="#graveyard" onClick={event => { event.preventDefault(); navigate('graveyard') }}>
          <PixelIcon name="skull" size={3} />Trial Graveyard
        </a>
        <TopNav screen={screen} navigate={navigate} />
        {screen !== 'settings' && <div className={styles.toggles}>
          <button aria-pressed={settings.daylight} onClick={() => state.toggle('daylight')}>Daylight mode: {settings.daylight ? 'ON' : 'OFF'}</button>
          <button aria-pressed={settings.soundOn} onClick={() => state.toggle('soundOn')}>Sound: {settings.soundOn ? 'ON' : 'OFF'}</button>
        </div>}
      </header>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {state.notice && <p role="alert" className="panel">{state.notice}</p>}
        {!state.ready ? <p role="status" className="panel">Opening the graveyard…</p> : <>
          {screen === 'graveyard' && (graves.length ? <>
            <div className={styles.pageTitle}><h1>Your graveyard</h1><span>{graves.length} {graves.length === 1 ? 'grave' : 'graves'}</span></div>
            {settings.daylight ? <>
              <CountdownHero grave={summary.next} now={now} onExorcise={actions.exorcise} />
              <p className="panel">At risk this week <strong>{displayTotals(summary.atRisk)}</strong> · {summary.overdue.length} overdue</p>
              <DaylightList graves={graves} now={now} actions={actions} onOpen={open} />
              <Mausoleum graves={graves} />
            </> : <div className={styles.game} data-inspector={!!inspected}>
              <Scene graves={graves} now={now} progress={progress} summary={summary} selected={inspected?.id ?? (modal?.kind === 'details' ? selected?.id : undefined)}
                onOpen={open} onExorcise={actions.exorcise} />
              {inspected && <aside ref={inspectorFocus} tabIndex={-1} className={styles.inspector} aria-label={`${inspected.name} details`} onKeyDown={event => {
                if (event.key === 'Escape') closeInspector()
              }}>
                <div className={styles.inspectorTitle}>
                  <span className={styles.monogram} aria-hidden="true" style={{ '--brand-color': monogramColor(inspected.name) } as CSSProperties}>{monogram(inspected.name)}</span>
                  <div><h2>{inspected.name}</h2><span className={styles.stateBadge}
                    data-kind={pixelStateFor(inspected, now).kind}>{statusText[pixelStateFor(inspected, now).kind]}</span></div>
                  <button type="button" aria-label="Close grave details" onClick={closeInspector}><PixelIcon name="x" /></button>
                </div>
                <DetailsPanel key={inspected.id} grave={inspected} now={now} actions={actions} />
              </aside>}
            </div>}
            <div className={styles.footerActions}><button disabled={!active.length} onClick={() => exportCalendar(false)}>Export all active to calendar</button>
              <button disabled={!active.length} onClick={() => exportCalendar(true)}>Export all hauntings</button></div>
          </> : <Landing daylight={settings.daylight} reduced={reduced || settings.calm} onSummon={summon} onAdd={() => navigate('add')} />)}
          {screen === 'quests' && <Quests now={now} progress={progress} />}
          {screen === 'collection' && <Collection progress={progress} selectStyle={state.selectStyle} />}
          {screen === 'add' && <section className={menus.menu}><header><h1>Add a trial</h1></header>
            <div className={`${menus.cards} ${styles.editorGrid}`}>
              <div className={menus.card}>
                <h2>Trial details</h2>
                <GraveForm id="trial-editor" values={values} change={changeEditor} onSave={bury} dateSource={dateSource} />
              </div>
              <div className={menus.card}><PasteBox now={now} onParsed={prefill}
                onManual={() => document.querySelector<HTMLInputElement>('#trial-editor input')?.focus()}
                extra={<SeanceButton onOpen={() => setSeance(true)} />} /></div>
            </div>
          </section>}
          {screen === 'savings' && <section className={menus.menu}><header><h1>Savings</h1></header>
            <div className={menus.cards}>
              <Mausoleum graves={graves} />
              <StatsPanel graves={graves} now={now} />
              <CountdownHero grave={summary.next} now={now} onExorcise={actions.exorcise} />
              <section className={menus.card} aria-label="At risk this week">
                <div className={menus.art}><PixelIcon name="coin" size={5} /></div>
                <h2>At risk this week</h2><p><strong>{displayTotals(summary.atRisk)}</strong> in upcoming active charges.</p>
              </section>
            </div>
          </section>}
          {screen === 'settings' && <section className={menus.menu}><header><h1>Settings</h1></header>
            <div className={menus.cards}>
              <section className={menus.card}>
                <div className={menus.art}><PixelIcon name="gear" size={5} /></div>
                <h2>Preferences</h2>
                <div className="actions">
                  <button aria-pressed={settings.daylight} onClick={() => state.toggle('daylight')}>Daylight mode: {settings.daylight ? 'ON' : 'OFF'}</button>
                  <button aria-pressed={settings.calm} onClick={() => state.toggle('calm')}>Calm mode: {settings.calm ? 'ON' : 'OFF'}</button>
                  <button aria-pressed={settings.soundOn} onClick={() => state.toggle('soundOn')}>Sound: {settings.soundOn ? 'ON' : 'OFF'}</button>
                </div>
              </section>
              <section className={menus.card}>
                <div className={menus.art}><PixelIcon name="chest" size={5} /></div>
                <DataControls announce={announce} onClear={() => { setValues(emptyValues); setDateSource(undefined); setInspector(undefined) }} />
                <p className="muted">Your graves stay in this browser.</p>
              </section>
              <section className={menus.card}>
                <h2>Reminders</h2>
                <div className="actions"><button disabled={!active.length} onClick={() => exportCalendar(false)}>Export all active to calendar</button>
                  <button disabled={!active.length} onClick={() => exportCalendar(true)}>Export all hauntings</button></div>
              </section>
              <section className={menus.card}>
                <h2>Demo graveyard</h2>
                <div><button onClick={summon}>Summon demo graveyard</button></div>
              </section>
            </div>
          </section>}
        </>}
        <p role="status" className={message ? styles.notice : 'sr-only'}>{message}</p>
        {undoEntry && <div className={styles.toast}>
          {undoEntry.action === 'cancelled' && <Celebration />}
          <p role="status">{undoEntry.previous.name} {undoEntry.action}.</p>
          <button ref={undoFocus} onClick={() => {
            const restoreTime = new Date()
            const unexpired = +restoreTime <= undoEntry.until
            state.undo(restoreTime)
            announce(unexpired ? 'Grave restored.' : 'The undo window closed.')
            document.getElementById('main-content')?.focus({ preventScroll: true })
          }}>Undo</button>
        </div>}
      </main>
    </div>
    {seance && <SeancePanel now={now} onClose={() => setSeance(false)} onBury={trials => {
      for (const trial of trials) state.addGrave(trial, new Date())
      setSeance(false)
      playSound('creak')
      announce(`${trials.length} ${trials.length === 1 ? 'trial' : 'trials'} buried from the demo inbox.`)
      navigate('graveyard')
    }} />}
    {duplicate && <Dialog title="Grave already found" onClose={() => setDuplicate(undefined)}>
      <div className="stack"><p>{duplicate.existing.name} already has a grave for this charge date.</p>
        <div className="actions"><button className="primary" onClick={() => {
          setDuplicate(undefined); navigate('graveyard'); open(duplicate.existing, true)
        }}>Open existing</button><button onClick={() => {
          setDuplicate(undefined)
          const edit = graves.find(grave => grave.id === duplicate.editId)
          if (edit) saveEdit(edit, duplicate.trial, true)
          else if (!duplicate.editId) bury(duplicate.trial, true)
        }}>Bury anyway</button></div></div>
    </Dialog>}
    {modal && selected && <Dialog key={modal.kind} title={modal.kind === 'details' ? selected.name :
      modal.kind === 'exorcise' ? `Exorcise ${selected.name}` : modalTitles[modal.kind]} onClose={close}
      leading={modalState && <span className={styles.monogram} aria-hidden="true"
        style={{ '--brand-color': monogramColor(selected.name) } as CSSProperties}>{monogram(selected.name)}</span>}
      badge={modalState && <span className={styles.stateBadge} data-kind={modalState.kind}>{statusText[modalState.kind]}</span>}>
      {modal.kind === 'details' && <DetailsPanel grave={selected} now={now} actions={actions} />}
      {modal.kind === 'exorcise' && <ExorcismPanel grave={selected} confirm={() => confirmCancellation(selected)} />}
      {modal.kind === 'edit' && <GraveForm grave={selected} onSave={input => saveEdit(selected, input)} />}
      {modal.kind === 'delete' && <div className="stack"><p>Remove {selected.name} from your graveyard?</p>
        <div className="actions"><button onClick={close}>Keep grave</button>
          <button className="danger" onClick={() => { state.deleteGrave(selected.id, new Date()); close() }}>Delete grave</button></div></div>}
    </Dialog>}
  </div>
}
