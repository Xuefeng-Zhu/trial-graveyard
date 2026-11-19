import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { DaylightList, downloadIcs } from '../features/daylight';
import { Scene, useReducedMotion } from '../features/graveyard';
import { Hud } from '../features/hud';
import { Intro, MoonlitBackdrop, introSeen, markIntroSeen } from '../features/moonlit';
import { isMotionAllowed } from '../domain/motion';
import { GraveForm, PasteBox, EMPTY_VALUES, prefillFromParse, valuesFromGrave } from '../features/editor';
import type { FormValues } from '../features/editor';
import { Seance } from '../features/seance';
import { Landing } from '../features/landing';
import { ShareButton } from '../features/share';
import type { Grave, ValidTrial } from '../domain/trial';
import type { ParseResult } from '../lib/parse';
import { setSoundEnabled, playSound } from '../design/sounds';
import { graveStore } from '../state/store';
import type { GraveStore } from '../state/store';
import { useNow } from '../state/useNow';
import { UndoToast } from './UndoToast';
import styles from './app.module.css';

export interface AppProps {
  store?: GraveStore;
  /** Clock for user actions. Tests inject their own. */
  clock?: () => Date;
}

const defaultClock = (): Date => new Date();
const NO_GRAVES: Grave[] = [];

export function App({ store = graveStore, clock = defaultClock }: AppProps) {
  const s = useStore(store, (state) => state);
  const tick = useNow();
  // Re-read the injected clock whenever the ticker fires or the data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => clock(), [tick, s.graves]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Partial<FormValues>>();
  const [prefillVersion, setPrefillVersion] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);

  const { daylight, soundOn, calm } = s.settings;
  const osReduced = useReducedMotion();
  const motionAllowed = isMotionAllowed(osReduced, calm);
  const osReducedRef = useRef(osReduced);
  osReducedRef.current = osReduced;

  // Saved graves arrive after mount. Hold the scene back until then so the intro can stagger them in.
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());
  const [introOn, setIntroOn] = useState(false);
  useEffect(() => {
    const ready = (): void => {
      const { graves, settings } = store.getState();
      const play =
        graves.length > 0 && !settings.daylight && isMotionAllowed(osReducedRef.current, settings.calm) && !introSeen();
      if (play) markIntroSeen();
      setIntroOn(play);
      setHydrated(true);
    };
    const unsubscribe = store.persist.onFinishHydration(ready);
    if (store.persist.hasHydrated()) ready();
    return unsubscribe;
  }, [store]);
  const endIntro = useCallback(() => setIntroOn(false), []);

  useEffect(() => {
    document.documentElement.dataset.theme = daylight ? 'daylight' : 'night';
  }, [daylight]);
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const lastChange = s.lastChange;
  useEffect(() => setToastOpen(lastChange !== null), [lastChange]);
  const expireToast = useCallback(() => setToastOpen(false), []);

  const editing = editingId ? s.graves.find((g) => g.id === editingId) : undefined;
  const changed = lastChange ? s.graves.find((g) => g.id === lastChange.id) : undefined;

  const onParsed = (result: ParseResult): void => {
    setPrefill(prefillFromParse(result));
    setPrefillVersion((v) => v + 1);
  };

  const status = (id: string, kind: 'cancel' | 'keep'): void => {
    if (kind === 'cancel') s.cancelGrave(id, clock());
    else s.keepGrave(id, clock());
    playSound(kind === 'cancel' ? 'thunder' : 'keep');
  };

  const bury = (trial: ValidTrial): void => {
    s.addGrave(trial, clock());
    playSound('creak');
  };

  const deleteGrave = (id: string): void => {
    if (editingId === id) setEditingId(null);
    s.deleteGrave(id);
  };
  const exportGraves = (graves: Grave[], filename: string): void => downloadIcs(graves, clock(), filename);

  const empty = s.graves.length === 0;
  const summon = (): void => {
    s.loadDemo(clock());
    playSound('creak');
  };

  const toastMessage = changed
    ? changed.status === 'cancelled'
      ? `${changed.name} is now a tombstone.`
      : `${changed.name} is now a ghost.`
    : '';

  const addPanel = (
    <section aria-labelledby="editor-heading" className={styles.editor}>
      <h2 id="editor-heading">{editing ? `Edit ${editing.name}` : 'Add a trial'}</h2>
      {editing ? (
        <GraveForm
          key={editing.id}
          initial={valuesFromGrave(editing)}
          submitLabel="Save changes"
          onSubmit={(trial) => {
            s.updateGrave(editing.id, trial);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <>
          <PasteBox
            now={clock}
            onParsed={onParsed}
            onManual={() =>
              document.querySelector<HTMLElement>('form[aria-label="Grave details"] [name="name"]')?.focus()
            }
          />
          <Seance existing={s.graves} clock={clock} onBury={bury} />
          <GraveForm
            initial={EMPTY_VALUES}
            prefill={prefill}
            prefillVersion={prefillVersion}
            autoFocus={!empty}
            onSubmit={bury}
          />
        </>
      )}
    </section>
  );

  return (
    <div className={styles.shell}>
      <MoonlitBackdrop motion={motionAllowed} />
      {introOn && <Intro onDone={endIntro} />}
      <header className={styles.header}>
        <h1>Trial Graveyard</h1>
      </header>

      {s.notice && (
        <div role="alert" className={styles.notice}>
          <span>{s.notice}</span>
          <button type="button" className={styles.button} onClick={s.dismissNotice}>
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.layout}>
        <main>
          {empty && !editing && <Landing daylight={daylight} onSummon={summon} />}
          {daylight ? (
            <DaylightList
              graves={s.graves}
              now={now}
              onCancelled={(id) => status(id, 'cancel')}
              onKeep={(id) => status(id, 'keep')}
              onEdit={setEditingId}
              onDelete={deleteGrave}
              onExport={exportGraves}
            />
          ) : (
            <Scene
              graves={hydrated ? s.graves : NO_GRAVES}
              now={now}
              reducedMotion={!motionAllowed}
              intro={introOn}
              summonNew={hydrated}
              onCancelled={(id) => status(id, 'cancel')}
              onKeep={(id) => status(id, 'keep')}
              onEdit={setEditingId}
              onDelete={deleteGrave}
              onExport={exportGraves}
            />
          )}
        </main>
        <Hud
          graves={s.graves}
          now={now}
          daylight={daylight}
          soundOn={soundOn}
          calm={calm}
          motion={motionAllowed}
          onBury={(id) => status(id, 'cancel')}
          onToggleDaylight={s.toggleDaylight}
          onToggleSound={s.toggleSound}
          onToggleCalm={s.toggleCalm}
          onSummon={empty ? undefined : summon}
          addPanel={addPanel}
          share={<ShareButton graves={s.graves} className={styles.button} />}
        />
      </div>

      {toastOpen && lastChange && changed && (
        <UndoToast
          changeKey={lastChange.atMs}
          message={toastMessage}
          onUndo={() => {
            s.undo(clock());
            playSound('undo');
          }}
          onExpire={expireToast}
        />
      )}
    </div>
  );
}
