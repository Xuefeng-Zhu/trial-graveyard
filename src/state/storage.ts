import { del, get, set, type UseStore } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'
import { cadences, validIso, validateTrial, type Grave } from '../domain/trial'

export interface Settings { daylight: boolean; soundOn: boolean; llmFallback: boolean; calm: boolean }
export interface PersistedState { graves: Grave[]; settings: Settings }
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
  const graves = value.graves.map(({ id, name, chargeAt, priceCents, currency, cadence, cancelUrl, status, createdAt, cancelledAt, keptAt }) => ({
    id, name, chargeAt, priceCents, currency, cadence, cancelUrl, status, createdAt, cancelledAt, keptAt,
  }))
  return { graves, settings }
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
