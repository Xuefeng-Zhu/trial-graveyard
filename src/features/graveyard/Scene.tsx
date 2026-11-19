import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { getViewState, stageLabel } from '../../domain/stage';
import type { ViewState } from '../../domain/stage';
import { formatMoney } from '../../domain/savings';
import type { Grave as GraveData } from '../../domain/trial';
import { BURY_FX_MS, BuryFx } from './BuryFx';
import type { BuryEffect } from './BuryFx';
import { CADENCE_SUFFIX, Stone } from './Stone';
import { WanderingGhost } from './WanderingGhost';
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
  onHaunt: (graves: GraveData[], filename: string) => void;
  onExorcise: (id: string) => void;
  /** Overrides the OS setting. Tests and Storybook-style callers use this. */
  reducedMotion?: boolean;
  /** Graves rise out of the ground one after another, after the intro overlay. */
  intro?: boolean;
  /** Delay before the wandering ghost first drifts across. Defaults to a random 8 to 20 seconds. */
  wanderDelayMs?: number;
  /** False while saved graves are still loading, so they are not all "summoned" at start-up. */
  summonNew?: boolean;
}

/** How long a freshly added grave plays its summon animation. */
export const SUMMON_MS = 2200;

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

function Actions({ grave, onCancelled, onKeep, onEdit, onDelete, onExport, onHaunt, onExorcise, onDone }: {
  grave: GraveData;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: GraveData[], filename: string) => void;
  onHaunt: (graves: GraveData[], filename: string) => void;
  onExorcise: (id: string) => void;
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
          <button type="button" className={styles.button} onClick={() => onHaunt([grave], `${grave.name}-haunting.ics`)}>
            Add haunting to calendar<span className={styles.srOnly}> for {grave.name}</span>
          </button>
          <button type="button" className={styles.button} onClick={() => onExorcise(grave.id)}>
            Exorcise<span className={styles.srOnly}> {grave.name}</span>
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
  summoning: boolean;
  /** Position in keyboard order, used to stagger the intro. */
  index: number;
  intro: boolean;
  onToggle: (id: string) => void;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: GraveData[], filename: string) => void;
  onHaunt: (graves: GraveData[], filename: string) => void;
  onExorcise: (id: string) => void;
  onClose: () => void;
}

function Item({ entry, reduced, tabbable, open, summoning, index, intro, onToggle, onCancelled, onKeep, onEdit, onDelete, onExport, onHaunt, onExorcise, onClose }: ItemProps) {
  const { grave, view } = entry;
  const present = useIsPresent();
  const urgent = isUrgent(view);
  const showActions = open || (grave.status === 'active' && urgent);
  const [hot, setHot] = useState(false);

  const rise = summoning || intro;
  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        layout: 'position' as const,
        initial:
          view.kind === 'tombstone'
            ? { opacity: 0, y: -70, scale: 1.15 }
            : view.kind === 'ghost'
              ? { opacity: 0, y: 50, scale: 0.7 }
              : { opacity: 0, y: rise ? 90 : 20 },
        animate: { opacity: 1, y: 0, scale: 1 },
        // Sinking into the soil is the "stone sinks" half of the bury animation.
        exit: { opacity: 0, y: 70, scale: 0.9, transition: { duration: 0.8, ease: 'easeIn' as const } },
        transition: intro
          ? { type: 'spring' as const, stiffness: 70, damping: 16, delay: 1.8 + index * 0.12 }
          : { type: 'spring' as const, stiffness: 160, damping: 18 },
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
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHot(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-art]')) {
          onToggle(grave.id);
        }
      }}
    >
      <div data-art="">
        <Stone grave={grave} view={view} motionOn={!reduced} hot={hot} summoning={summoning} />
      </div>
      {showActions && <Actions
          grave={grave}
          onCancelled={onCancelled}
          onKeep={onKeep}
          onEdit={onEdit}
          onDelete={onDelete}
          onExport={onExport}
          onHaunt={onHaunt}
          onExorcise={onExorcise}
          onDone={onClose}
        />}
    </motion.li>
  );
}

export function Scene({ graves, now, onCancelled, onKeep, onEdit, onDelete, onExport, onHaunt, onExorcise, reducedMotion, intro = false, wanderDelayMs, summonNew = true }: SceneProps) {
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
  const sceneRef = useRef<HTMLElement>(null);
  const known = useRef<Set<string> | null>(null);
  const [summoning, setSummoning] = useState<ReadonlySet<string>>(new Set());
  const [effects, setEffects] = useState<BuryEffect[]>([]);
  const effectKey = useRef(0);
  const pendingFocus = useRef<{ id: string; kind?: ViewState['kind'] } | null>(null);
  const previous = useRef<Map<string, string>>(new Map());

  const tabbableId = activeId !== null && order.includes(activeId) ? activeId : (order[0] ?? null);

  // Announce stage and status changes for graves that were already on screen.
  useEffect(() => {
    const next = new Map<string, string>();
    const changes: string[] = [];
    const fx: BuryEffect[] = [];
    // The old stone is still mounted while it sinks, so its position is where the soil gets scooped.
    const whereWas = (id: string): { x: number; y: number } => {
      const scene = sceneRef.current?.getBoundingClientRect();
      const old = Array.from(sceneRef.current?.querySelectorAll<HTMLElement>('[data-item-id]') ?? []).find(
        (n) => n.dataset.itemId === id && n.dataset.kind === 'grave',
      );
      const box = old?.getBoundingClientRect();
      if (!scene || !box) return { x: 50, y: 50 };
      return { x: box.left - scene.left + box.width / 2, y: box.top - scene.top + box.height * 0.6 };
    };
    for (const { grave, view } of entries) {
      const key = view.kind === 'grave' ? `grave:${view.stage}` : view.kind;
      next.set(grave.id, key);
      const before = previous.current.get(grave.id);
      if (before !== undefined && before !== key) changes.push(announcement(grave, view));
      if (before?.startsWith('grave:') && view.kind === 'tombstone' && !reduced) {
        fx.push({ id: effectKey.current++, ...whereWas(grave.id), text: `+${formatMoney(view.savedCents, grave.currency)} saved` });
      }
    }
    previous.current = next;
    if (changes.length > 0) setMessage(changes.join(' '));
    if (fx.length > 0) {
      const keys = new Set(fx.map((f) => f.id));
      setEffects((list) => [...list, ...fx]);
      setTimeout(() => setEffects((list) => list.filter((f) => !keys.has(f.id))), BURY_FX_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // Graves added after the first render are "summoned": soil bursts, the stone rises, the engraving writes in.
  useEffect(() => {
    const ids = entries.map((e) => e.grave.id);
    const before = known.current;
    known.current = new Set(ids);
    if (before === null || reduced || !summonNew) return undefined;
    const fresh = ids.filter((id) => !before.has(id));
    if (fresh.length === 0) return undefined;
    setSummoning((cur) => new Set([...cur, ...fresh]));
    // Not cleared on re-run: entry updates inside the window must not strand these ids in `summoning`.
    setTimeout(() => setSummoning((cur) => new Set([...cur].filter((id) => !fresh.includes(id)))), SUMMON_MS);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <AnimatePresence initial={intro}>
        {rows[row].map((entry) => (
          <Item
            key={`${entry.grave.id}:${entry.view.kind}`}
            entry={entry}
            reduced={reduced}
            tabbable={entry.grave.id === tabbableId}
            open={openId === entry.grave.id}
            summoning={summoning.has(entry.grave.id)}
            index={Math.max(0, order.indexOf(entry.grave.id))}
            intro={intro}
            onToggle={(id) => {
              setActiveId(id);
              setOpenId((o) => (o === id ? null : id));
            }}
            onCancelled={act(onCancelled, 'tombstone')}
            onKeep={act(onKeep, 'ghost')}
            onEdit={onEdit}
            onDelete={onDelete}
            onExport={onExport}
            onHaunt={onHaunt}
            onExorcise={(id) => {
              // The panel confirms later; once the grave becomes a tombstone, focus lands on it.
              pendingFocus.current = { id, kind: 'tombstone' };
              setActiveId(id);
              onExorcise(id);
            }}
            onClose={() => setOpenId(null)}
          />
        ))}
      </AnimatePresence>
    </ul>
  );

  return (
    <section
      ref={sceneRef}
      className={styles.scene}
      aria-label="Haunted graveyard"
      data-motion={reduced ? 'still' : 'animated'}
    >
      <div aria-live="polite" aria-atomic="true" className={styles.srOnly} data-testid="scene-live">
        {message}
      </div>
      <p className={styles.srOnly}>
        Use the arrow keys to move between graves. Press Enter to open the actions for a grave and Escape to close them.
      </p>
      {graves.some((g) => g.status === 'active') && (
        <button
          type="button"
          className={styles.button}
          onClick={() => onExport(graves.filter((g) => g.status === 'active'), 'trial-graveyard.ics')}
        >
          Export all active to calendar
        </button>
      )}
      {graves.some((g) => g.status === 'active') && (
        <button
          type="button"
          className={styles.button}
          onClick={() => onHaunt(graves.filter((g) => g.status === 'active'), 'trial-graveyard-hauntings.ics')}
        >
          Export all hauntings
        </button>
      )}
      <div ref={rootRef} className={styles.field} onKeyDown={onKeyDown}>
        {renderRow('ghosts')}
        {renderRow('back')}
        {renderRow('stones')}
        {renderRow('front')}
      </div>
      {!reduced && (
        <div className={styles.fxLayer} aria-hidden="true">
          {effects.map((f) => (
            <BuryFx key={f.id} effect={f} />
          ))}
          <WanderingGhost delayMs={wanderDelayMs} />
        </div>
      )}
    </section>
  );
}
