import { uniqueXp } from '../domain/xp'
import { defaultProgress, isRecord, readState, type PersistedState } from './storage'

export const schemaVersion = 1

export function exportGraveyard(state: PersistedState) {
  return JSON.stringify({ version: schemaVersion, ...state }, null, 2)
}

export function importGraveyard(text: string): PersistedState | undefined {
  try {
    const value: unknown = JSON.parse(text)
    return isRecord(value) && value.version === schemaVersion ? readState(value) : undefined
  } catch { return undefined }
}

export function mergeGraveyards(local: PersistedState, imported: PersistedState): PersistedState {
  const ids = new Set(local.graves.map(grave => grave.id))
  const progress = local.progress ?? defaultProgress
  const ledger = uniqueXp([...progress.ledger, ...(imported.progress?.ledger.filter(entry => !ids.has(entry.graveId)) ?? [])])
  return { settings: local.settings, graves: [...local.graves, ...imported.graves.filter(grave => !ids.has(grave.id))],
    progress: { ...progress, ledger } }
}
