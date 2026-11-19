import { DEFAULT_PROGRESS, SCHEMA_VERSION, deserialize } from './storage';
import type { PersistedSlice } from './storage';

export const BACKUP_APP = 'trial-graveyard';

export const BACKUP_FILENAME = 'trial-graveyard-backup.json';

export type ImportMode = 'merge' | 'replace';

/** Serializes graves, settings and progress as a self-describing JSON backup. */
export function exportBackup(slice: PersistedSlice, now: Date): string {
  return JSON.stringify(
    {
      app: BACKUP_APP,
      version: SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      graves: slice.graves,
      settings: slice.settings,
      progress: slice.progress,
    },
    null,
    2,
  );
}

export type ParseBackupResult = { ok: true; data: PersistedSlice } | { ok: false; error: string };

export const BACKUP_ERROR = 'That file is not a valid graveyard backup. Nothing was changed.';

/** Validates backup text against the storage schema. Never throws. */
export function parseBackup(text: string): ParseBackupResult {
  const result = deserialize(text);
  if (!result.ok) return { ok: false, error: BACKUP_ERROR };
  const { graves, settings, progress } = result.state;
  return { ok: true, data: { graves, settings, progress: progress ?? { ...DEFAULT_PROGRESS, ledger: [] } } };
}

/**
 * Combines a backup into current data. Replace takes the backup as is.
 * Merge keeps current settings and styles, appends graves whose ids are new,
 * and adds ledger entries (deduplicated by kind and grave) for those graves.
 */
export function applyBackup(current: PersistedSlice, incoming: PersistedSlice, mode: ImportMode): PersistedSlice {
  if (mode === 'replace') return incoming;
  const known = new Set(current.graves.map((g) => g.id));
  const added = incoming.graves.filter((g) => !known.has(g.id));
  const addedIds = new Set(added.map((g) => g.id));
  const ledger = [...current.progress.ledger];
  for (const e of incoming.progress.ledger) {
    if (addedIds.has(e.graveId) && !ledger.some((x) => x.kind === e.kind && x.graveId === e.graveId)) ledger.push(e);
  }
  return {
    graves: [...current.graves, ...added],
    settings: current.settings,
    progress: { ...current.progress, ledger },
  };
}
