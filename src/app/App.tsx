import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { DaylightList, downloadHauntingIcs, downloadIcs } from '../features/daylight';
import { Celebration } from '../features/atmosphere';
import { useReducedMotion } from '../features/graveyard';
import {
  BottomHud,
  Cemetery,
  CollectionView,
  DataTools,
  downloadBackup,
  QuestsView,
  SavingsView,
  SettingsView,
  TopNav,
  NAV_ITEMS,
} from '../features/cemetery';
import type { View } from '../features/cemetery';
import { PixelButton, PixelPanel, pixelLinkClass } from '../design/pixel';
import { formatMoney, totalSavedByCurrency } from '../domain/savings';
import { progressFor } from '../domain/xp';
import { isMotionAllowed } from '../domain/motion';
import { GraveForm, PasteBox, EMPTY_VALUES, prefillFromParse, valuesFromGrave } from '../features/editor';
import type { FormValues } from '../features/editor';
import { Seance } from '../features/seance';
import { Landing } from '../features/landing';
import { ShareButton } from '../features/share';
import { ExorcismPanel } from '../features/haunting';
import type { Grave, ValidTrial } from '../domain/trial';
import { findDuplicate } from '../domain/dedupe';
import { BACKUP_FILENAME, exportBackup } from '../state/backup';
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

export const VIEW_STORAGE_KEY = 'trial-graveyard:view';
const VIEWS: readonly View[] = NAV_ITEMS.map((i) => i.view);

/** The last open tab, so a reload returns there. Falls back to the graveyard if storage is blocked or stale. */
function readStoredView(): View {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEWS.find((x) => x === v) ?? 'graveyard';
  } catch {
    return 'graveyard';
  }
}

function storeView(view: View): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage can be blocked; the tab just will not persist.
  }
}

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
  const [exorcisingId, setExorcisingId] = useState<string | null>(null);
  const [view, setViewState] = useState<View>(readStoredView);
  const [downloadNote, setDownloadNote] = useState('');
  const setView = useCallback((next: View): void => {
    setViewState(next);
    storeView(next);
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ trial: ValidTrial; existing: Grave } | null>(null);

  const { daylight, soundOn, calm } = s.settings;
  const osReduced = useReducedMotion();
  const motionAllowed = isMotionAllowed(osReduced, calm);
  useEffect(() => {
    document.documentElement.dataset.theme = daylight ? 'daylight' : 'night';
  }, [daylight]);
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const lastChange = s.lastChange;
  const lastDelete = s.lastDelete;
  useEffect(() => setToastOpen(lastChange !== null || lastDelete !== null), [lastChange, lastDelete]);
  const clearCelebration = useCallback(() => setCelebration(null), []);
  const expireToast = useCallback(() => setToastOpen(false), []);

  const exorcising = exorcisingId ? s.graves.find((g) => g.id === exorcisingId) : undefined;
  const editing = editingId ? s.graves.find((g) => g.id === editingId) : undefined;
  const changed = lastChange ? s.graves.find((g) => g.id === lastChange.id) : undefined;

  const onParsed = (result: ParseResult): void => {
    setPrefill(prefillFromParse(result));
    setPrefillVersion((v) => v + 1);
  };

  const celebrate = (id: string): void => {
    const grave = s.graves.find((g) => g.id === id);
    if (grave) setCelebration(formatMoney(grave.priceCents, grave.currency));
    playSound('celebrate');
  };

  const status = (id: string, kind: 'cancel' | 'keep'): void => {
    if (kind === 'cancel') {
      s.cancelGrave(id, clock());
      celebrate(id);
    } else s.keepGrave(id, clock());
    playSound(kind === 'cancel' ? 'thunder' : 'keep');
  };

  const go = (next: View): void => {
    if (next !== 'add') setEditingId(null);
    setSelectedId(null);
    setView(next);
  };

  /** Opening a trial counts as reviewing it (cosmetic XP, once per trial). */
  const select = (id: string | null): void => {
    setSelectedId(id);
    if (id) {
      s.reviewGrave(id, clock());
      playSound('select');
    }
  };

  /** Form submit: warns first when a grave with the same name and charge date exists. */
  const submitTrial = (trial: ValidTrial): void => {
    const existing = findDuplicate(s.graves, trial);
    if (existing) setDuplicate({ trial, existing });
    else bury(trial);
  };

  const bury = (trial: ValidTrial): void => {
    setDuplicate(null);
    s.addGrave(trial, clock());
    playSound('creak');
    // The pasted receipt has been consumed; do not replay it when the form remounts.
    setPrefill(undefined);
    setPrefillVersion(0);
    setView('graveyard');
  };

  const deleteGrave = (id: string): void => {
    if (editingId === id) setEditingId(null);
    if (selectedId === id) setSelectedId(null);
    s.deleteGrave(id, clock());
  };
  const openExisting = (id: string): void => {
    setDuplicate(null);
    setPrefill(undefined);
    setPrefillVersion(0);
    setSelectedId(id);
    setView('graveyard');
  };
  const edit = (id: string): void => {
    setEditingId(id);
    setSelectedId(null);
    setView('add');
  };
  const exportGraves = (graves: Grave[], filename: string): void => {
    downloadIcs(graves, clock(), filename);
    announceDownload();
  };

  // Alternate a trailing space so a repeat download is announced again.
  const announceDownload = (): void =>
    setDownloadNote((n) => (n === 'Calendar file downloaded' ? 'Calendar file downloaded ' : 'Calendar file downloaded'));

  const empty = s.graves.length === 0;
  const summon = (): void => {
    s.loadDemo(clock());
    playSound('creak');
    setView('graveyard');
  };
  const hauntGraves = (graves: Grave[], filename: string): void => {
    downloadHauntingIcs(graves, clock(), filename);
    announceDownload();
  };
  const confirmExorcism = (id: string): void => {
    s.exorcise(id, clock());
    setExorcisingId(null);
    playSound('cancel');
    celebrate(id);
  };

  const toastMessage = lastDelete
    ? `${lastDelete.grave.name} was deleted.`
    : changed
    ? changed.status === 'cancelled'
      ? `${changed.name} is now a tombstone.`
      : `${changed.name} is now a ghost.`
    : '';

  const progress = progressFor(s.progress.ledger);
  const [primary] = totalSavedByCurrency(s.graves);
  const saved = `${primary ? formatMoney(primary.cents, primary.currency) : formatMoney(0, 'USD')} saved`;

  const addPanel = (
    <PixelPanel aria-labelledby="editor-heading" className={styles.editor}>
      <h2 id="editor-heading">{editing ? `Edit ${editing.name}` : 'Add a trial'}</h2>
      {editing ? (
        <GraveForm
          key={editing.id}
          initial={valuesFromGrave(editing)}
          submitLabel="Save changes"
          onSubmit={(trial) => {
            s.updateGrave(editing.id, trial);
            setEditingId(null);
            setView('graveyard');
          }}
          onCancel={() => {
            setEditingId(null);
            setView('graveyard');
          }}
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
          {duplicate && (
            <div role="alertdialog" aria-labelledby="dup-heading" aria-describedby="dup-text" className={styles.notice}>
              <div>
                <strong id="dup-heading">Already buried?</strong>
                <p id="dup-text">
                  {duplicate.existing.name} already has a grave with this charge date. Bury a second one anyway?
                </p>
              </div>
              <PixelButton onClick={() => bury(duplicate.trial)}>Bury anyway</PixelButton>
              <PixelButton onClick={() => openExisting(duplicate.existing.id)}>Open existing</PixelButton>
            </div>
          )}
          <GraveForm initial={EMPTY_VALUES} prefill={prefill} prefillVersion={prefillVersion} onSubmit={submitTrial} />
        </>
      )}
    </PixelPanel>
  );

  const actions = {
    onCancelled: (id: string) => status(id, 'cancel'),
    onKeep: (id: string) => status(id, 'keep'),
    onEdit: edit,
    onDelete: deleteGrave,
    onExport: exportGraves,
    onHaunt: hauntGraves,
    onExorcise: setExorcisingId,
  };

  const graveyard = empty ? (
    <Landing daylight={daylight} onSummon={summon} reducedMotion={!motionAllowed} />
  ) : daylight ? (
    <DaylightList graves={s.graves} now={now} {...actions} />
  ) : (
    <Cemetery
      graves={s.graves}
      now={now}
      styleId={s.progress.styleId}
      motion={motionAllowed}
      selectedId={selectedId}
      onSelect={select}
      {...actions}
    >
      <BottomHud
        graves={s.graves}
        now={now}
        ledger={s.progress.ledger}
        onOpenQuests={() => go('quests')}
        onExorcise={setExorcisingId}
      />
    </Cemetery>
  );

  return (
    <div className={styles.shell}>
      <TopNav view={view} onView={go} level={progress.level} saved={saved} />

      {s.notice && (
        <div role="alert" className={styles.notice}>
          <span>{s.notice}</span>
          <PixelButton onClick={s.dismissNotice}>Dismiss</PixelButton>
        </div>
      )}

      <main className={styles.main}>
        {view === 'graveyard' && graveyard}
        {view === 'quests' && (
          <QuestsView progress={progress} ledger={s.progress.ledger} graves={s.graves} now={now} onExorcise={setExorcisingId} />
        )}
        {view === 'collection' && (
          <CollectionView progress={progress} styleId={s.progress.styleId} onSelectStyle={s.selectStyle} />
        )}
        {view === 'add' && addPanel}
        {view === 'savings' && (
          <SavingsView
            graves={s.graves}
            now={now}
            motion={motionAllowed}
            onExport={exportGraves}
            onHaunt={hauntGraves}
            share={<ShareButton graves={s.graves} className={pixelLinkClass()} />}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            daylight={daylight}
            soundOn={soundOn}
            calm={calm}
            onToggleDaylight={s.toggleDaylight}
            onToggleSound={s.toggleSound}
            onToggleCalm={s.toggleCalm}
            onSummon={summon}
            dataTools={
              <DataTools
                onExport={() =>
                  downloadBackup(
                    exportBackup({ graves: s.graves, settings: s.settings, progress: s.progress }, clock()),
                    BACKUP_FILENAME,
                  )
                }
                onImport={s.importData}
                onClear={() => {
                  s.clearAll();
                  setSelectedId(null);
                  setEditingId(null);
                }}
              />
            }
          />
        )}
      </main>

      <p className={styles.downloadNote} role="status" data-testid="download-status">
        {downloadNote}
      </p>

      {exorcising && (
        <ExorcismPanel grave={exorcising} onExorcised={confirmExorcism} onClose={() => setExorcisingId(null)} />
      )}

      {celebration && <Celebration amount={celebration} motion={motionAllowed} onDone={clearCelebration} />}

      {toastOpen && (lastDelete || (lastChange && changed)) && (
        <UndoToast
          changeKey={lastDelete ? lastDelete.atMs : (lastChange?.atMs ?? 0)}
          message={toastMessage}
          onUndo={() => {
            if (lastDelete) s.undoDelete(clock());
            else s.undo(clock());
            playSound('undo');
          }}
          onExpire={expireToast}
        />
      )}
    </div>
  );
}
