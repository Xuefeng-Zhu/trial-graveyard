import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { DaylightList, downloadHauntingIcs, downloadIcs } from '../features/daylight';
import { Celebration } from '../features/atmosphere';
import { useReducedMotion } from '../features/graveyard';
import {
  BottomHud,
  Cemetery,
  CollectionView,
  QuestsView,
  SavingsView,
  SettingsView,
  TopNav,
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
  const [view, setView] = useState<View>('graveyard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  const { daylight, soundOn, calm } = s.settings;
  const osReduced = useReducedMotion();
  const motionAllowed = isMotionAllowed(osReduced, calm);
  useEffect(() => {
    document.documentElement.dataset.theme = daylight ? 'daylight' : 'night';
  }, [daylight]);
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const lastChange = s.lastChange;
  useEffect(() => setToastOpen(lastChange !== null), [lastChange]);
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

  const bury = (trial: ValidTrial): void => {
    s.addGrave(trial, clock());
    playSound('creak');
    setView('graveyard');
  };

  const deleteGrave = (id: string): void => {
    if (editingId === id) setEditingId(null);
    if (selectedId === id) setSelectedId(null);
    s.deleteGrave(id);
  };
  const edit = (id: string): void => {
    setEditingId(id);
    setSelectedId(null);
    setView('add');
  };
  const exportGraves = (graves: Grave[], filename: string): void => downloadIcs(graves, clock(), filename);

  const empty = s.graves.length === 0;
  const summon = (): void => {
    s.loadDemo(clock());
    playSound('creak');
    setView('graveyard');
  };
  const hauntGraves = (graves: Grave[], filename: string): void => downloadHauntingIcs(graves, clock(), filename);
  const confirmExorcism = (id: string): void => {
    s.exorcise(id, clock());
    setExorcisingId(null);
    playSound('cancel');
    celebrate(id);
  };

  const toastMessage = changed
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
          <GraveForm initial={EMPTY_VALUES} prefill={prefill} prefillVersion={prefillVersion} onSubmit={bury} />
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
          />
        )}
      </main>

      {exorcising && (
        <ExorcismPanel grave={exorcising} onExorcised={confirmExorcism} onClose={() => setExorcisingId(null)} />
      )}

      {celebration && <Celebration amount={celebration} motion={motionAllowed} onDone={clearCelebration} />}

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
