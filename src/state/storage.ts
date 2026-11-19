import { del, get, set, type UseStore } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'
import { cadences, trialFields, validIso, validateTrial, type Grave } from '../domain/trial'

import { styles, styleUnlocked, totalXp, uniqueXp, xpByKind, type StyleId, type XpEntry } from '../domain/xp'

export interface Settings { daylight: boolean; soundOn: boolean; llmFallback: boolean; calm: boolean }
export interface ProgressState { ledger: XpEntry[]; styleId: StyleId }
export interface PersistedState { graves: Grave[]; settings: Settings; progress?: ProgressState }
export const defaultProgress: ProgressState = { ledger: [], styleId: 'classic' }
export const defaultSettings: Settings = { daylight: false, soundOn: false, llmFallback: false, calm: false }

export const isRecord = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)

export function isGrave(item: unknown): item is Grave {
  if (!isRecord(item)) return false
  const { id, name, chargeAt, priceCents, currency, cadence, cancelUrl, status, createdAt, cancelledAt, keptAt } = item
  return typeof id === 'string' && !!id && typeof name === 'string' && typeof chargeAt === 'string'
    && typeof priceCents === 'number' && typeof currency === 'string' && typeof cadence === 'string'
    && cadences.some(value => value === cadence) && (cancelUrl === undefined || typeof cancelUrl === 'string')
    && (status === 'active' || status === 'kept' || status === 'cancelled')
    && typeof createdAt === 'string' && validIso(createdAt)
    && (cancelledAt === undefined || typeof cancelledAt === 'string' && validIso(cancelledAt))
    && (keptAt === undefined || typeof keptAt === 'string' && validIso(keptAt))
    && !Object.keys(validateTrial(item as unknown as Grave)).length
}

export function readState(value: unknown): PersistedState | undefined {
  if (!isRecord(value) || !Array.isArray(value.graves) || !value.graves.every(isGrave)
    || new Set(value.graves.map(grave => grave.id)).size !== value.graves.length || !isRecord(value.settings)) return
  const settings = { ...defaultSettings }
  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    const saved = value.settings[key]
    if (saved === undefined) continue
    if (typeof saved !== 'boolean') return
    settings[key] = saved
  }
  const graves = value.graves.map((grave): Grave => ({
    ...trialFields(grave), name: grave.name, id: grave.id, status: grave.status, createdAt: grave.createdAt,
    ...(grave.cancelledAt === undefined ? {} : { cancelledAt: grave.cancelledAt }),
    ...(grave.keptAt === undefined ? {} : { keptAt: grave.keptAt }),
  }))
  if (value.progress === undefined) return { graves, settings }
  const progress = readProgress(value.progress)
  if (progress) return { graves, settings, progress }
}

function isXpEntry(value: unknown): value is XpEntry {
  return isRecord(value) && typeof value.kind === 'string' && Object.hasOwn(xpByKind, value.kind)
    && typeof value.graveId === 'string' && !!value.graveId && typeof value.at === 'string' && validIso(value.at)
}

function readProgress(value: unknown): ProgressState | undefined {
  if (!isRecord(value) || !Array.isArray(value.ledger) || !value.ledger.every(isXpEntry)) return
  const style = styles.find(style => style.id === value.styleId)
  if (!style) return
  const ledger = uniqueXp(value.ledger.map(({ kind, graveId, at }) => ({ kind, graveId, at })))
  return { ledger, styleId: styleUnlocked(style.id, totalXp(ledger)) ? style.id : 'classic' }
}

export function createStorage(onUnavailable: () => void, database?: UseStore): StateStorage {
  const memory = new Map<string, string>()
  let available = true
  let pending = Promise.resolve()
  async function useDatabase<T>(operation: () => Promise<T>, fallback: () => T) {
    if (available) {
      try { return await operation() } catch { available = false; onUnavailable() }
    }
    return fallback()
  }
  return {
    async getItem(key) {
      await pending
      return useDatabase(async () => (await get<string>(key, database)) ?? null, () => memory.get(key) ?? null)
    },
    setItem(key, value) {
      memory.set(key, value)
      pending = pending.then(() => useDatabase(() => set(key, value, database), () => undefined))
      return pending
    },
    removeItem(key) {
      memory.delete(key)
      pending = pending.then(() => useDatabase(() => del(key, database), () => undefined))
      return pending
    },
  }
}
