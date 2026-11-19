import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { getViewState, stageLabel } from '../../domain/stage';
import type { ViewState } from '../../domain/stage';
import { formatMoney } from '../../domain/savings';
import type { Grave as GraveData } from '../../domain/trial';
import { Fog } from './Fog';
import { CADENCE_SUFFIX, Grave } from './Grave';
import { Ghost } from './Ghost';
import { Mausoleum } from './Mausoleum';
import { Tombstone } from './Tombstone';
import { Zombie } from './Zombie';
import { useReducedMotion } from './useReducedMotion';
import styles from './graveyard.module.css';

export const NO_CANCEL_URL_TEXT = 'No cancel link saved. Edit this grave to add one.';

export interface SceneProps {
  graves: readonly GraveData[];
  now: Date;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: GraveData[], filename: string) => void;
  /** Overrides the OS setting. Tests and Storybook-style callers use this. */
  reducedMotion?: boolean;
}

interface Entry {
  grave: GraveData;
  view: ViewState;
}

type Row = 'ghosts' | 'back' | 'stones' | 'front';

const ROW_LABEL: Record<Row, string> = {
  ghosts: 'Ghosts of kept subscriptions',
  back: 'Graves in the back rows',
  stones: 'Tombstones of cancelled trials',
  front: 'Zombies shambling to the front',
};

export function isUrgent(view: ViewState): boolean {
  return view.kind === 'grave' && (view.stage === 'zombie' || view.stage === 'overdue');
}

/** Splits entries into rows. Zombies and overdue graves go to the front row, most urgent first. */
export function arrange(entries: readonly Entry[]): Record<Row, Entry[]> {
  const byCharge = (a: Entry, b: Entry): number =>
    Date.parse(a.grave.chargeAt) - Date.parse(b.grave.chargeAt) || a.grave.name.localeCompare(b.grave.name, 'en');
  const rows: Record<Row, Entry[]> = { ghosts: [], back: [], stones: [], front: [] };
  for (const e of entries) {
    if (e.view.kind === 'ghost') rows.ghosts.push(e);
    else if (e.view.kind === 'tombstone') rows.stones.push(e);
    else if (isUrgent(e.view)) rows.front.push(e);
    else rows.back.push(e);
  }
  rows.ghosts.sort(byCharge);
  rows.back.sort(byCharge);
  rows.stones.sort(byCharge);
  rows.front.sort(byCharge);
  return rows;
}

function describe(grave: GraveData, view: ViewState): string {
  const price = `${formatMoney(grave.priceCents, grave.currency)}${CADENCE_SUFFIX[grave.cadence]}`;
  if (view.kind === 'grave') return `${grave.name}, ${stageLabel(view.stage, view.remainingMs)}, ${price}`;
  if (view.kind === 'tombstone') return `${grave.name}, tombstone, ${view.epitaph}`;
  return `${grave.name}, ghost, haunting you for ${formatMoney(view.monthlyCents, grave.currency)}/mo`;
}

function announcement(grave: GraveData, view: ViewState): string {
  if (view.kind === 'grave') return `${grave.name} is now ${stageLabel(view.stage, view.remainingMs)}.`;
  if (view.kind === 'tombstone') return `${grave.name} is now a tombstone. Saved ${formatMoney(view.savedCents, grave.currency)}.`;
  return `${grave.name} is now a ghost.`;
}

function Actions({ grave, onCancelled, onKeep, onEdit, onDelete, onExport, onDone }: {
  grave: GraveData;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: GraveData[], filename: string) => void;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const active = grave.status === 'active';
  return (
    <div className={styles.actions} role="group" aria-label={`Actions for ${grave.name}`}>
      {active && (grave.cancelUrl ? (
        <a href={grave.cancelUrl} target="_blank" rel="noopener noreferrer" className={styles.button}>
          Cancel now<span className={styles.srOnly}> {grave.name} (opens in a new tab)</span>
        </a>
      ) : (
        <>
          <button type="button" disabled aria-describedby={`scene-nocancel-${grave.id}`} className={styles.button}>
            Cancel now
          </button>
          <span id={`scene-nocancel-${grave.id}`} className={styles.hint}>
            {NO_CANCEL_URL_TEXT}
          </span>
        </>
      ))}
      {active && (
        <>
          <button type="button" className={styles.button} onClick={() => { onCancelled(grave.id); onDone(); }}>
            I cancelled<span className={styles.srOnly}> {grave.name}</span>
          </button>
          <button type="button" className={styles.button} onClick={() => { onKeep(grave.id); onDone(); }}>
            Keep it<span className={styles.srOnly}> {grave.name}</span>
          </button>
          <button type="button" className={styles.button} onClick={() => onExport([grave], `${grave.name}.ics`)}>
            Add to calendar<span className={styles.srOnly}> for {grave.name}</span>
          </button>
        </>
      )}
      <button type="button" className={styles.button} onClick={() => { onEdit(grave.id); onDone(); }}>
        Edit<span className={styles.srOnly}> {grave.name}</span>
      </button>
      {confirming ? (
        <>
          <button type="button" className={styles.button} onClick={() => { onDelete(grave.id); setConfirming(false); onDone(); }}>
            Confirm delete<span className={styles.srOnly}> {grave.name}</span>
          </button>
          <button type="button" className={styles.button} onClick={() => setConfirming(false)}>
            Keep grave<span className={styles.srOnly}> {grave.name}</span>
          </button>
        </>
      ) : (
        <button type="button" className={styles.button} onClick={() => setConfirming(true)}>
          Delete<span className={styles.srOnly}> {grave.name}</span>
        </button>
      )}
    </div>
  );
}

interface ItemProps {
  entry: Entry;
  reduced: boolean;
  tabbable: boolean;
  open: boolean;
  onToggle: (id: string) => void;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: GraveData[], filename: string) => void;
  onClose: () => void;
}

function Item({ entry, reduced, tabbable, open, onToggle, onCancelled, onKeep, onEdit, onDelete, onExport, onClose }: ItemProps) {
  const { grave, view } = entry;
  const present = useIsPresent();
  const urgent = isUrgent(view);
  const showActions = open || (grave.status === 'active' && urgent);

  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        layout: 'position' as const,
        initial:
          view.kind === 'tombstone'
            ? { opacity: 0, y: -70, scale: 1.15 }
            : view.kind === 'ghost'
              ? { opacity: 0, y: 50, scale: 0.7 }
              : { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 30, scale: 0.85 },
        transition: { type: 'spring' as const, stiffness: 160, damping: 18 },
      };

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>): void => {
    if (e.target !== e.currentTarget) {
      if (e.key === 'Escape' && open) {
        onClose();
        e.currentTarget.focus();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(grave.id);
    } else if (e.key === 'Escape' && open) {
      onClose();
    }
  };

  return (
    <motion.li
      {...motionProps}
      className={`${styles.item} ${urgent ? styles.urgentItem : ''}`}
      data-item-id={grave.id}
      data-kind={view.kind}
      tabIndex={present && tabbable ? 0 : -1}
      aria-label={describe(grave, view)}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-art]')) {
          onToggle(grave.id);
        }
      }}
    >
      <div data-art="">
        {view.kind === 'grave' && (view.stage === 'zombie' || view.stage === 'overdue') && (
          <Zombie grave={grave} overdue={view.stage === 'overdue'} remainingMs={view.remainingMs} reduced={reduced} />
        )}
        {view.kind === 'grave' && view.stage !== 'zombie' && view.stage !== 'overdue' && (
          <Grave grave={grave} stage={view.stage} remainingMs={view.remainingMs} reduced={reduced} />
        )}
        {view.kind === 'tombstone' && <Tombstone grave={grave} epitaph={view.epitaph} savedCents={view.savedCents} />}
        {view.kind === 'ghost' && <Ghost grave={grave} monthlyCents={view.monthlyCents} reduced={reduced} />}
      </div>
      {showActions && <Actions
          grave={grave}
          onCancelled={onCancelled}
          onKeep={onKeep}
          onEdit={onEdit}
          onDelete={onDelete}
          onExport={onExport}
          onDone={onClose}
        />}
    </motion.li>
  );
}

export function Scene({ graves, now, onCancelled, onKeep, onEdit, onDelete, onExport, reducedMotion }: SceneProps) {
  const osReduced = useReducedMotion();
  const reduced = reducedMotion ?? osReduced;

  const entries = useMemo<Entry[]>(() => graves.map((grave) => ({ grave, view: getViewState(grave, now) })), [graves, now]);
  const rows = useMemo(() => arrange(entries), [entries]);
  const order = useMemo(
    () => [...rows.ghosts, ...rows.back, ...rows.stones, ...rows.front].map((e) => e.grave.id),
    [rows],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ id: string; kind?: ViewState['kind'] } | null>(null);
  const previous = useRef<Map<string, string>>(new Map());

  const tabbableId = activeId !== null && order.includes(activeId) ? activeId : (order[0] ?? null);

  // Announce stage and status changes for graves that were already on screen.
  useEffect(() => {
    const next = new Map<string, string>();
    const changes: string[] = [];
    for (const { grave, view } of entries) {
      const key = view.kind === 'grave' ? `grave:${view.stage}` : view.kind;
      next.set(grave.id, key);
      const before = previous.current.get(grave.id);
      if (before !== undefined && before !== key) changes.push(announcement(grave, view));
    }
    previous.current = next;
    if (changes.length > 0) setMessage(changes.join(' '));
  }, [entries]);

  // After an action the grave remounts as a tombstone or ghost; move focus to it.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const root = rootRef.current;
    const el = root
      ? Array.from(root.querySelectorAll<HTMLElement>('[data-item-id]')).find(
          (n) => n.dataset.itemId === pending.id && n.tabIndex === 0 && (!pending.kind || n.dataset.kind === pending.kind),
        )
      : undefined;
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  });

  const act = (fn: (id: string) => void, kind: ViewState['kind']) => (id: string): void => {
    pendingFocus.current = { id, kind };
    setActiveId(id);
    fn(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    const id = target.dataset.itemId;
    if (id === undefined || !target.matches('li[data-item-id]')) return;
    const index = order.indexOf(id);
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = Math.min(order.length - 1, index + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = order.length - 1;
    else return;
    e.preventDefault();
    const nextId = order[nextIndex];
    if (nextId === undefined) return;
    setActiveId(nextId);
    setOpenId(null);
    pendingFocus.current = { id: nextId };
  };

  const renderRow = (row: Row) => (
    <ul
      className={`${styles.row} ${styles[`row_${row}`]}`}
      aria-label={ROW_LABEL[row]}
      data-row={row}
    >
      <AnimatePresence initial={false}>
        {rows[row].map((entry) => (
          <Item
            key={`${entry.grave.id}:${entry.view.kind}`}
            entry={entry}
            reduced={reduced}
            tabbable={entry.grave.id === tabbableId}
            open={openId === entry.grave.id}
            onToggle={(id) => {
              setActiveId(id);
              setOpenId((o) => (o === id ? null : id));
            }}
            onCancelled={act(onCancelled, 'tombstone')}
            onKeep={act(onKeep, 'ghost')}
            onEdit={onEdit}
            onDelete={onDelete}
            onExport={onExport}
            onClose={() => setOpenId(null)}
          />
        ))}
      </AnimatePresence>
    </ul>
  );

  return (
    <section className={styles.scene} aria-label="Haunted graveyard" data-motion={reduced ? 'still' : 'animated'}>
      <div className={styles.sky} aria-hidden="true">
        <div className={styles.moon} />
        <div className={styles.stars} />
      </div>
      <Fog reduced={reduced} />
      <div className={styles.hills} aria-hidden="true" />
      <Mausoleum graves={graves} reduced={reduced} />
      <div aria-live="polite" aria-atomic="true" className={styles.srOnly} data-testid="scene-live">
        {message}
      </div>
      <p className={styles.srOnly}>
        Use the arrow keys to move between graves. Press Enter to open the actions for a grave and Escape to close them.
      </p>
      {graves.length === 0 && (
        <p className={styles.emptyScene}>The graveyard is silent. Add a trial above, or summon a demo graveyard.</p>
      )}
      {graves.some((g) => g.status === 'active') && (
        <button
          type="button"
          className={styles.button}
          onClick={() => onExport(graves.filter((g) => g.status === 'active'), 'trial-graveyard.ics')}
        >
          Export all active to calendar
        </button>
      )}
      <div ref={rootRef} className={styles.field} onKeyDown={onKeyDown}>
        {renderRow('ghosts')}
        {renderRow('back')}
        {renderRow('stones')}
        {renderRow('front')}
      </div>
    </section>
  );
}
