import { createStore, type StoreApi } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { useStore } from 'zustand';
import type { Mutate } from 'zustand';
import { createGrave, toLocalIso } from '../domain/trial';
import type { Grave, ValidTrial } from '../domain/trial';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  NOTICE_CORRUPT,
  NOTICE_UNAVAILABLE,
  SCHEMA_VERSION,
  STORAGE_KEY,
  createIdbStorage,
  createPersistStorage,
} from './storage';
import type { PersistedSlice, Settings } from './storage';
import { isStyleUnlocked, progressFor } from '../domain/xp';
import type { XpKind } from '../domain/xp';
import type { StateStorage } from 'zustand/middleware';

export const UNDO_WINDOW_MS = 10_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

interface LastChange {
  id: string;
  /** Status fields before the change. */
  previous: Pick<Grave, 'status' | 'cancelledAt' | 'keptAt'>;
  atMs: number;
}

export interface GraveState extends PersistedSlice {
  persistenceAvailable: boolean;
  notice: string | null;
  lastChange: LastChange | null;

  addGrave: (trial: ValidTrial, now: Date) => Grave;
  /** Editing moves a cancelled or kept grave back to active. */
  updateGrave: (id: string, trial: ValidTrial) => void;
  deleteGrave: (id: string) => void;
  cancelGrave: (id: string, now: Date) => void;
  /** Confirms an exorcism: buries the trial like a cancellation, so it counts as souls saved and can be undone. */
  exorcise: (id: string, now: Date) => void;
  keepGrave: (id: string, now: Date) => void;
  /** Reverts the last status change if it happened within 10 s of `now`. Returns whether it did. */
  undo: (now: Date) => boolean;
  /** Records that the user looked at a trial. Earns XP once per trial. Cosmetic only. */
  reviewGrave: (id: string, now: Date) => void;
  /** Picks a gravestone style if it is unlocked at the current level. Returns whether it was applied. */
  selectStyle: (styleId: string) => boolean;
  toggleDaylight: () => void;
  toggleSound: () => void;
  toggleCalm: () => void;
  dismissNotice: () => void;
  /** Appends about 8 sample graves covering every stage, one cancelled and one kept. */
  loadDemo: (now: Date) => void;
}

export type GraveStore = Mutate<StoreApi<GraveState>, [['zustand/persist', PersistedSlice]]>;

export interface StoreOptions {
  backend?: StateStorage;
  newId?: () => string;
}

type Mutable = Pick<Grave, 'status' | 'cancelledAt' | 'keptAt'>;

function statusOf(g: Grave): Mutable {
  const s: Mutable = { status: g.status };
  if (g.cancelledAt !== undefined) s.cancelledAt = g.cancelledAt;
  if (g.keptAt !== undefined) s.keptAt = g.keptAt;
  return s;
}

function withStatus(g: Grave, status: Mutable): Grave {
  const { cancelledAt: _c, keptAt: _k, status: _s, ...rest } = g;
  return { ...rest, ...status };
}

const demoTrials = (now: Date): Array<[ValidTrial, 'active' | 'cancelled' | 'kept']> => {
  const at = (offsetMs: number): string => toLocalIso(new Date(now.getTime() + offsetMs));
  const t = (
    name: string,
    offsetMs: number,
    priceCents: number,
    cadence: ValidTrial['cadence'],
    cancelUrl?: string,
  ): ValidTrial => ({
    name,
    chargeAt: at(offsetMs),
    priceCents,
    currency: 'USD',
    cadence,
    ...(cancelUrl ? { cancelUrl } : {}),
  });
  return [
    [t('Phantomflix', 20 * DAY, 1549, 'monthly', 'https://www.phantomflix.example/cancelplan'), 'active'],
    [t('Necro Audiobooks', 5 * DAY, 1495, 'monthly', 'https://www.necroaudiobooks.example/account/membership'), 'active'],
    [t('Cryptic Cloud', 60 * HOUR, 5999, 'monthly'), 'active'],
    [t('Moonnotes Plus', 20 * HOUR, 9600, 'yearly', 'https://www.moonnotes.example/billing'), 'active'],
    [t('Wraithwave Premium', 3 * HOUR, 1199, 'monthly', 'https://www.wraithwave.example/account/subscription/'), 'active'],
    [t('Hollowtv', -2 * HOUR, 799, 'monthly'), 'active'],
    [t('Banshee Box', -3 * DAY, 1199, 'monthly'), 'cancelled'],
    [t('Grimoire+', 10 * DAY, 6999, 'yearly'), 'kept'],
  ];
};

/** Builds a store. Tests pass their own backend; the app uses the default IndexedDB one. */
export function createGraveStore(options: StoreOptions = {}): GraveStore {
  const newId = options.newId ?? (() => crypto.randomUUID());
  // Storage callbacks can fire while `createStore` is still running (hydration starts
  // immediately), so patches made before `store` exists are applied right after.
  let store: GraveStore | undefined;
  let pending: Partial<GraveState> = {};
  const patch = (p: Partial<GraveState>): void => {
    if (store) store.setState(p);
    else pending = { ...pending, ...p };
  };
  const backend =
    options.backend ??
    createIdbStorage(() => patch({ persistenceAvailable: false, notice: NOTICE_UNAVAILABLE }));
  const storage = createPersistStorage(backend, () => patch({ notice: NOTICE_CORRUPT }));

  const created: GraveStore = createStore<GraveState>()(
    persist(
      (set, get) => ({
        graves: [],
        settings: { ...DEFAULT_SETTINGS },
        progress: { ...DEFAULT_PROGRESS, ledger: [] },
        persistenceAvailable: true,
        notice: null,
        lastChange: null,

        addGrave: (trial, now) => {
          const grave = createGrave(trial, newId(), now);
          set((s) => ({ graves: [...s.graves, grave] }));
          earn('add', grave.id, now);
          return grave;
        },
        updateGrave: (id, trial) =>
          set((s) => ({
            graves: s.graves.map((g) => {
              if (g.id !== id) return g;
              const { cancelUrl: _u, ...rest } = withStatus(g, { status: 'active' });
              return { ...rest, ...trial };
            }),
          })),
        deleteGrave: (id) =>
          set((s) => ({
            graves: s.graves.filter((g) => g.id !== id),
            lastChange: s.lastChange?.id === id ? null : s.lastChange,
          })),
        cancelGrave: (id, now) => {
          if (changeStatus(id, now, { status: 'cancelled', cancelledAt: toLocalIso(now) })) earn('cancel', id, now);
        },
        reviewGrave: (id, now) => {
          if (created.getState().graves.some((g) => g.id === id)) earn('review', id, now);
        },
        selectStyle: (styleId) => {
          const level = progressFor(get().progress.ledger).level;
          if (!isStyleUnlocked(styleId, level)) return false;
          set((s) => ({ progress: { ...s.progress, styleId } }));
          return true;
        },
        exorcise: (id, now) => get().cancelGrave(id, now),
        keepGrave: (id, now) => changeStatus(id, now, { status: 'kept', keptAt: toLocalIso(now) }),
        undo: (now) => {
          const change = get().lastChange;
          if (!change) return false;
          const withinWindow = now.getTime() - change.atMs <= UNDO_WINDOW_MS;
          const target = get().graves.find((g) => g.id === change.id);
          const reverted = withinWindow && target !== undefined;
          set((s) => ({
            lastChange: null,
            graves: reverted
              ? s.graves.map((g) => (g.id === change.id ? withStatus(g, change.previous) : g))
              : s.graves,
            // An undone cancellation is no longer confirmed, so its XP goes too.
            progress:
              reverted && target.status === 'cancelled'
                ? {
                    ...s.progress,
                    ledger: s.progress.ledger.filter((e) => !(e.kind === 'cancel' && e.graveId === change.id)),
                  }
                : s.progress,
          }));
          return withinWindow && target !== undefined;
        },
        toggleDaylight: () => set((s) => ({ settings: { ...s.settings, daylight: !s.settings.daylight } })),
        toggleSound: () => set((s) => ({ settings: { ...s.settings, soundOn: !s.settings.soundOn } })),
        toggleCalm: () => set((s) => ({ settings: { ...s.settings, calm: !s.settings.calm } })),
        dismissNotice: () => set({ notice: null }),
        loadDemo: (now) => {
          const added = demoTrials(now).map(([trial, status]) => {
            const grave = createGrave(trial, newId(), now);
            if (status === 'cancelled') return { ...grave, status, cancelledAt: toLocalIso(now) };
            if (status === 'kept') return { ...grave, status, keptAt: toLocalIso(now) };
            return grave;
          });
          set((s) => ({ graves: [...s.graves, ...added] }));
        },
      }),
      {
        name: STORAGE_KEY,
        version: SCHEMA_VERSION,
        storage,
        partialize: (s): PersistedSlice => ({ graves: s.graves, settings: s.settings, progress: s.progress }),
      },
    ),
  );

  store = created;
  if (Object.keys(pending).length > 0) created.setState(pending);

  /** Appends a ledger entry unless this kind already exists for the grave. */
  function earn(kind: XpKind, graveId: string, now: Date): void {
    created.setState((s) =>
      s.progress.ledger.some((e) => e.kind === kind && e.graveId === graveId)
        ? s
        : { progress: { ...s.progress, ledger: [...s.progress.ledger, { kind, graveId, at: toLocalIso(now) }] } },
    );
  }

  function changeStatus(id: string, now: Date, next: Mutable): boolean {
    const target = created.getState().graves.find((g) => g.id === id);
    if (!target) return false;
    created.setState((s) => ({
      graves: s.graves.map((g) => (g.id === id ? withStatus(g, next) : g)),
      lastChange: { id, previous: statusOf(target), atMs: now.getTime() },
    }));
    return true;
  }

  return created;
}

/** App-wide store backed by IndexedDB. */
export const graveStore = createGraveStore();

export function useGraveStore<T>(selector: (s: GraveState) => T): T {
  return useStore(graveStore, selector);
}

export type { Settings };
