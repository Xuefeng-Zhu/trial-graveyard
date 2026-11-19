import type { Grave, ValidTrial } from './trial';

const nameKey = (name: string): string => name.trim().toLowerCase();

/** Calendar day of an ISO string as written (its own offset), so `2026-10-31T09:00:00-07:00` is `2026-10-31`. */
const dayKey = (iso: string): string => iso.slice(0, 10);

/**
 * Finds an existing grave with the same name (case-insensitive, trimmed) and charge date.
 * `ignoreId` skips the grave being edited.
 */
export function findDuplicate(
  graves: readonly Grave[],
  trial: Pick<ValidTrial, 'name' | 'chargeAt'>,
  ignoreId?: string,
): Grave | undefined {
  const name = nameKey(trial.name);
  const day = dayKey(trial.chargeAt);
  return graves.find((g) => g.id !== ignoreId && nameKey(g.name) === name && dayKey(g.chargeAt) === day);
}
