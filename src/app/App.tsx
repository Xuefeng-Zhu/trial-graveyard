import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { DaylightList, downloadIcs } from '../features/daylight';
import { Scene } from '../features/graveyard';
import { GraveForm, PasteBox, EMPTY_VALUES, prefillFromParse, valuesFromGrave } from '../features/editor';
import type { FormValues } from '../features/editor';
import { Seance } from '../features/seance';
import type { Grave } from '../domain/trial';
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

  const { daylight, soundOn } = s.settings;

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
    playSound(kind);
  };

  const deleteGrave = (id: string): void => {
    if (editingId === id) setEditingId(null);
    s.deleteGrave(id);
  };
  const exportGraves = (graves: Grave[], filename: string): void => downloadIcs(graves, clock(), filename);

  const toastMessage = changed
    ? changed.status === 'cancelled'
      ? `${changed.name} is now a tombstone.`
      : `${changed.name} is now a ghost.`
    : '';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1>Trial Graveyard</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.button}
            aria-pressed={daylight}
            onClick={s.toggleDaylight}
          >
            Daylight mode
          </button>
          <button type="button" className={styles.button} onClick={() => s.loadDemo(clock())}>
            Summon demo graveyard
          </button>
        </div>
      </header>

      {s.notice && (
        <div role="alert" className={styles.notice}>
          <span>{s.notice}</span>
          <button type="button" className={styles.button} onClick={s.dismissNotice}>
            Dismiss
          </button>
        </div>
      )}

      <main>
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
              <PasteBox now={clock} onParsed={onParsed} />
              <Seance existing={s.graves} clock={clock} onBury={(trial) => s.addGrave(trial, clock())} />
              <GraveForm
                initial={EMPTY_VALUES}
                prefill={prefill}
                prefillVersion={prefillVersion}
                onSubmit={(trial) => s.addGrave(trial, clock())}
              />
            </>
          )}
        </section>

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
            graves={s.graves}
            now={now}
            onCancelled={(id) => status(id, 'cancel')}
            onKeep={(id) => status(id, 'keep')}
            onEdit={setEditingId}
            onDelete={deleteGrave}
            onExport={exportGraves}
          />
        )}
      </main>

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
