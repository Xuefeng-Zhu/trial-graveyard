import { formatISO } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { styleUnlocked, totalXp, uniqueXp, type StyleId, type XpKind } from '../domain/xp'
import { createGrave, trialFields, validateTrial, type Grave, type TrialInput } from '../domain/trial'
import { createStorage, defaultProgress, defaultSettings, readState, type PersistedState, type ProgressState, type Settings } from './storage'
import { demoGraves } from './demo'
import { mergeGraveyards, schemaVersion } from './backup'

export const STORAGE_KEY = 'trial-graveyard'
interface Undo { previous: Grave; index: number; until: number; action: 'cancelled' | 'kept' | 'deleted' }
interface GraveyardState extends PersistedState {
  progress: ProgressState
  reviewGrave(id: string, now: Date): void
  selectStyle(id: StyleId): void
  ready: boolean
  notice: string
  undoEntry?: Undo
  snapshot(): PersistedState
  restore(saved: PersistedState, mode: 'merge' | 'replace'): void
  clearData(): void
  exorcise(id: string, now: Date): void
  addGrave(input: TrialInput, now: Date): Grave | undefined
  updateGrave(id: string, input: TrialInput): void
  deleteGrave(id: string, now: Date): void
  cancelGrave(id: string, now: Date): void
  keepGrave(id: string, now: Date): void
  undo(now: Date): void
  dismissUndo(): void
  toggle(key: keyof Settings): void
  loadDemo(now: Date): void
}

export function createGraveyardStore(storageKey = STORAGE_KEY) {
  let storageNotice = ''
  const store = create<GraveyardState>()(persist((set, get) => {
    function earn(progress: ProgressState, kind: XpKind, graveId: string, now: Date): ProgressState {
      if (progress.ledger.some(entry => entry.kind === kind && entry.graveId === graveId)) return progress
      return { ...progress, ledger: [...progress.ledger, { kind, graveId, at: formatISO(now) }] }
    }
    function change(id: string, now: Date, action: Undo['action']) {
      const { graves, progress } = get()
      const index = graves.findIndex(grave => grave.id === id)
      const previous = graves[index]
      if (!previous || action !== 'deleted' && previous.status !== 'active') return
      const next = [...graves]
      if (action === 'deleted') next.splice(index, 1)
      else next[index] = { ...previous, status: action, [action === 'cancelled' ? 'cancelledAt' : 'keptAt']: formatISO(now) }
      set({
        graves: next,
        progress: action === 'cancelled' ? earn(progress, 'cancel', id, now) : progress,
        undoEntry: { previous, index, until: +now + 10_000, action },
      })
    }
    return {
      graves: [], settings: defaultSettings, progress: defaultProgress, ready: false, notice: '',
      snapshot() { const { graves, settings, progress } = get(); return { graves, settings, progress } },
      restore(saved, mode) {
        const merged = mode === 'merge' ? mergeGraveyards(get(), saved) : saved
        set({ ...merged, progress: merged.progress ?? defaultProgress, undoEntry: undefined })
      },
      clearData() { set({ graves: [], settings: defaultSettings, progress: defaultProgress, undoEntry: undefined }) },
      reviewGrave(id, now) {
        const { graves, progress } = get()
        if (!graves.some(grave => grave.id === id)) return
        const next = earn(progress, 'review', id, now)
        if (next !== progress) set({ progress: next })
      },
      selectStyle(id) {
        const { progress } = get()
        if (styleUnlocked(id, totalXp(progress.ledger))) set({ progress: { ...progress, styleId: id } })
      },
      exorcise: (id, now) => change(id, now, 'cancelled'),
      addGrave(input, now) {
        if (Object.keys(validateTrial(input)).length) return
        const grave = createGrave(input, now)
        set(({ graves, progress }) => ({ graves: [...graves, grave], progress: earn(progress, 'add', grave.id, now) }))
        return grave
      },
      updateGrave(id, input) {
        if (Object.keys(validateTrial(input)).length) return
        set(({ graves }) => ({ graves: graves.map(grave => {
          if (grave.id !== id) return grave
          const { cancelUrl: _previousUrl, ...record } = grave
          return { ...record, ...trialFields(input) }
        }) }))
      },
      deleteGrave: (id, now) => change(id, now, 'deleted'),
      cancelGrave: (id, now) => change(id, now, 'cancelled'),
      keepGrave: (id, now) => change(id, now, 'kept'),
      undo(now) {
        const { graves, progress, undoEntry } = get()
        if (!undoEntry) return
        if (+now > undoEntry.until) { set({ undoEntry: undefined }); return }
        const next = [...graves]
        const index = next.findIndex(grave => grave.id === undoEntry.previous.id)
        if (undoEntry.action === 'deleted') {
          if (index >= 0) next[index] = undoEntry.previous
          else next.splice(undoEntry.index, 0, undoEntry.previous)
        } else if (index >= 0) {
          const { cancelledAt: _cancelled, keptAt: _kept, ...record } = next[index]
          const { status, cancelledAt, keptAt } = undoEntry.previous
          next[index] = { ...record, status,
            ...(cancelledAt === undefined ? {} : { cancelledAt }),
            ...(keptAt === undefined ? {} : { keptAt }),
          }
        }
        const ledger = undoEntry.action === 'cancelled'
          ? progress.ledger.filter(entry => entry.kind !== 'cancel' || entry.graveId !== undoEntry.previous.id)
          : progress.ledger
        const styleId = styleUnlocked(progress.styleId, totalXp(ledger)) ? progress.styleId : 'classic'
        set({ graves: next, progress: { ledger, styleId }, undoEntry: undefined })
      },
      dismissUndo: () => set({ undoEntry: undefined }),
      toggle: key => set(({ settings }) => ({ settings: { ...settings, [key]: !settings[key] } })),
      loadDemo(now) {
        const { graves, progress } = get()
        const fresh = demoGraves(now).filter(demo => !graves.some(grave => grave.id === demo.id))
        if (!fresh.length) return
        const ledger = uniqueXp([...progress.ledger, ...fresh.map(grave => ({ kind: 'add' as const, graveId: grave.id, at: formatISO(now) }))])
        set({ graves: [...graves, ...fresh], progress: { ...progress, ledger } })
      },
    }
  }, {
    name: storageKey, version: schemaVersion,
    storage: createJSONStorage(() => createStorage(() => {
      storageNotice = 'Browser storage is unavailable. Changes will be lost on reload.'
      if (store.getState().ready && !store.getState().notice) store.setState({ notice: storageNotice })
    })),
    partialize: ({ graves, settings, progress }) => ({ graves, settings, progress }),
    migrate: (saved, version) => version === 0 ? readState(saved) : null,
    merge(saved, current) {
      if (saved === undefined) return current
      const data = readState(saved)
      return data ? { ...current, ...data, progress: data.progress ?? defaultProgress } : { ...current, notice: 'Damaged graveyard data was reset.' }
    },
    onRehydrateStorage: () => (state, error) => {
      const notice = error ? 'Damaged graveyard data was reset.' : state?.notice || storageNotice
      store.setState({ ready: true, notice })
    },
  }))
  return store
}

export const useGraveyard = createGraveyardStore()
