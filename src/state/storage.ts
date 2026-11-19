import { del, get, set } from 'idb-keyval';
import type { PersistStorage, StateStorage } from 'zustand/middleware';
import { isCadence, isHttpUrl } from '../domain/trial';
import type { Grave, Status } from '../domain/trial';

export const STORAGE_KEY = 'trial-graveyard';
export const SCHEMA_VERSION = 1;

export interface Settings {
  daylight: boolean;
  soundOn: boolean;
  llmFallback: boolean;
}

export interface PersistedState {
  version: 1;
  graves: Grave[];
  settings: Settings;
}

/** The slice of store state that is written to storage. */
export type PersistedSlice = Pick<PersistedState, 'graves' | 'settings'>;

export const DEFAULT_SETTINGS: Settings = { daylight: false, soundOn: false, llmFallback: false };

export const NOTICE_CORRUPT = 'The crypt records were damaged, so the graveyard was reset. Fresh start.';
export const NOTICE_UNAVAILABLE =
  'This browser will not let us store data. Your graves will vanish when you close the tab.';

const STATUSES: readonly Status[] = ['active', 'cancelled', 'kept'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isOptionalString = (v: unknown): boolean => v === undefined || typeof v === 'string';

export function isValidGrave(v: unknown): v is Grave {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    v.id !== '' &&
    typeof v.name === 'string' &&
    typeof v.chargeAt === 'string' &&
    Number.isFinite(Date.parse(v.chargeAt)) &&
    typeof v.priceCents === 'number' &&
    Number.isSafeInteger(v.priceCents) &&
    v.priceCents >= 0 &&
    typeof v.currency === 'string' &&
    /^[A-Z]{3}$/.test(v.currency) &&
    typeof v.cadence === 'string' &&
    isCadence(v.cadence) &&
    (v.cancelUrl === undefined || (typeof v.cancelUrl === 'string' && isHttpUrl(v.cancelUrl))) &&
    typeof v.status === 'string' &&
    (STATUSES as readonly string[]).includes(v.status) &&
    isOptionalString(v.cancelledAt) &&
    isOptionalString(v.keptAt) &&
    typeof v.createdAt === 'string'
  );
}

export function isValidSettings(v: unknown): v is Settings {
  return (
    isRecord(v) &&
    typeof v.daylight === 'boolean' &&
    typeof v.soundOn === 'boolean' &&
    typeof v.llmFallback === 'boolean'
  );
}

export function isValidPersistedState(v: unknown): v is PersistedState {
  return (
    isRecord(v) &&
    v.version === SCHEMA_VERSION &&
    Array.isArray(v.graves) &&
    v.graves.every(isValidGrave) &&
    isValidSettings(v.settings)
  );
}

/**
 * Upgrades older stored shapes to the current schema.
 * Version 0 (no `version` field) held `{ graves }` and had no settings.
 * Returns the input unchanged when it is not an older shape; the validator then judges it.
 */
export function migrate(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const version = data.version ?? 0;
  if (version === 0) {
    return { version: SCHEMA_VERSION, graves: data.graves, settings: { ...DEFAULT_SETTINGS } };
  }
  return data;
}

export function serialize(state: PersistedState): string {
  return JSON.stringify(state);
}

export type DeserializeResult = { ok: true; state: PersistedState } | { ok: false };

/** Parses, migrates and validates stored text. Never throws. */
export function deserialize(raw: string): DeserializeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  const migrated = migrate(parsed);
  return isValidPersistedState(migrated) ? { ok: true, state: migrated } : { ok: false };
}

/**
 * StateStorage over idb-keyval. When IndexedDB throws on any call, it switches to
 * an in-memory map for the rest of the session and calls `onUnavailable` once.
 */
export function createIdbStorage(onUnavailable: () => void): StateStorage {
  const memory = new Map<string, string>();
  let useMemory = false;
  const fail = (): void => {
    if (!useMemory) {
      useMemory = true;
      onUnavailable();
    }
  };
  return {
    getItem: async (name) => {
      if (!useMemory) {
        try {
          return (await get<string>(name)) ?? null;
        } catch {
          fail();
        }
      }
      return memory.get(name) ?? null;
    },
    setItem: async (name, value) => {
      memory.set(name, value);
      if (!useMemory) {
        try {
          await set(name, value);
        } catch {
          fail();
        }
      }
    },
    removeItem: async (name) => {
      memory.delete(name);
      if (!useMemory) {
        try {
          await del(name);
        } catch {
          fail();
        }
      }
    },
  };
}

/**
 * Zustand `PersistStorage` that stores a versioned `PersistedState` as JSON.
 * Corrupt or unrecognized data is removed and reported through `onCorrupt`.
 */
export function createPersistStorage(
  backend: StateStorage,
  onCorrupt: () => void,
): PersistStorage<PersistedSlice> {
  return {
    getItem: async (name) => {
      const raw = await backend.getItem(name);
      if (raw === null) return null;
      const result = deserialize(raw);
      if (!result.ok) {
        await backend.removeItem(name);
        onCorrupt();
        return null;
      }
      const { graves, settings } = result.state;
      return { state: { graves, settings }, version: SCHEMA_VERSION };
    },
    setItem: async (name, value) => {
      await backend.setItem(name, serialize({ version: SCHEMA_VERSION, ...value.state }));
    },
    removeItem: async (name) => {
      await backend.removeItem(name);
    },
  };
}
