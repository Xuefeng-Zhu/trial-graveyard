import { formatISO } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createGrave, trialFields, validateTrial, type Grave, type TrialInput } from '../domain/trial'
import { createStorage, defaultSettings, readState, type PersistedState, type Settings } from './storage'
import { demoGraves } from './demo'
import { mergeGraveyards, schemaVersion } from './backup'

export const STORAGE_KEY = 'trial-graveyard'
interface Undo { previous: Grave; index: number; until: number; action: 'cancelled' | 'kept' | 'deleted' }
interface GraveyardState extends PersistedState {
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
    function change(id: string, now: Date, action: Undo['action']) {
      const { graves } = get()
      const index = graves.findIndex(grave => grave.id === id)
      const previous = graves[index]
      if (!previous || action !== 'deleted' && previous.status !== 'active') return
      const next = [...graves]
      if (action === 'deleted') next.splice(index, 1)
      else next[index] = { ...previous, status: action, [action === 'cancelled' ? 'cancelledAt' : 'keptAt']: formatISO(now) }
      set({ graves: next, undoEntry: { previous, index, until: +now + 10_000, action } })
    }
    return {
      graves: [], settings: defaultSettings, ready: false, notice: '',
      snapshot() { const { graves, settings } = get(); return { graves, settings } },
      restore(saved, mode) { set({ ...(mode === 'merge' ? mergeGraveyards(get(), saved) : saved), undoEntry: undefined }) },
      clearData() { set({ graves: [], settings: defaultSettings, undoEntry: undefined }) },
      exorcise: (id, now) => change(id, now, 'cancelled'),
      addGrave(input, now) {
        if (Object.keys(validateTrial(input)).length) return
        const grave = createGrave(input, now)
        set(({ graves }) => ({ graves: [...graves, grave] }))
        return grave
      },
      updateGrave(id, input) {
        if (Object.keys(validateTrial(input)).length) return
        set(({ graves }) => ({ graves: graves.map(grave => grave.id === id ? { ...grave, cancelUrl: undefined, ...trialFields(input) } : grave) }))
      },
      deleteGrave: (id, now) => change(id, now, 'deleted'),
      cancelGrave: (id, now) => change(id, now, 'cancelled'),
      keepGrave: (id, now) => change(id, now, 'kept'),
      undo(now) {
        const { graves, undoEntry } = get()
        if (!undoEntry) return
        if (+now > undoEntry.until) { set({ undoEntry: undefined }); return }
        const next = [...graves]
        const index = next.findIndex(grave => grave.id === undoEntry.previous.id)
        if (index >= 0) next[index] = undoEntry.previous
        else next.splice(undoEntry.index, 0, undoEntry.previous)
        set({ graves: next, undoEntry: undefined })
      },
      dismissUndo: () => set({ undoEntry: undefined }),
      toggle: key => set(({ settings }) => ({ settings: { ...settings, [key]: !settings[key] } })),
      loadDemo: now => set(({ graves }) => ({
        graves: [...graves, ...demoGraves(now).filter(demo => !graves.some(grave => grave.id === demo.id))],
      })),
    }
  }, {
    name: storageKey, version: schemaVersion,
    storage: createJSONStorage(() => createStorage(() => {
      storageNotice = 'Browser storage is unavailable. Changes will be lost on reload.'
      if (store.getState().ready && !store.getState().notice) store.setState({ notice: storageNotice })
    })),
    partialize: ({ graves, settings }) => ({ graves, settings }),
    migrate: (saved, version) => version === 0 ? readState(saved) : null,
    merge(saved, current) {
      if (saved === undefined) return current
      const data = readState(saved)
      return data ? { ...current, ...data } : { ...current, notice: 'Damaged graveyard data was reset.' }
    },
    onRehydrateStorage: () => (state, error) => {
      const notice = error ? 'Damaged graveyard data was reset.' : state?.notice || storageNotice
      store.setState({ ready: true, notice })
    },
  }))
  return store
}

export const useGraveyard = createGraveyardStore()
