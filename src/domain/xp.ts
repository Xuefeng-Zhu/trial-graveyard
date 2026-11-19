/**
 * Cosmetic graveyard progress. Purely derived from a ledger of events.
 * This module must never import savings or stats: XP cannot touch money.
 */

export type XpKind = 'add' | 'review' | 'cancel';

export interface XpEntry {
  kind: XpKind;
  graveId: string;
  /** ISO 8601 instant of the event. */
  at: string;
}

export const XP_VALUES: Record<XpKind, number> = { add: 10, review: 5, cancel: 25 };
export const MAX_LEVEL = 20;
const LEVEL_STEP = 100;

export interface Unlock {
  id: string;
  label: string;
  level: number;
}

export const DECORATIONS: readonly Unlock[] = [
  { id: 'lantern', label: 'Lantern', level: 2 },
  { id: 'pumpkin', label: 'Pumpkin', level: 3 },
  { id: 'flowers', label: 'Flower bed', level: 5 },
  { id: 'raven', label: 'Raven', level: 8 },
];

export const GRAVESTONE_STYLES: readonly Unlock[] = [
  { id: 'classic', label: 'Classic', level: 1 },
  { id: 'mossy', label: 'Mossy', level: 3 },
  { id: 'obsidian', label: 'Obsidian', level: 6 },
  { id: 'rose', label: 'Rose quartz', level: 10 },
];

export const DEFAULT_STYLE = 'classic';

/** Total XP needed to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  return (LEVEL_STEP * level * (level - 1)) / 2;
}

/** Keeps one entry per (kind, graveId), the earliest first seen. Repeated actions earn nothing more. */
export function dedupe(ledger: readonly XpEntry[]): XpEntry[] {
  const seen = new Set<string>();
  const out: XpEntry[] = [];
  for (const e of ledger) {
    const key = `${e.kind}:${e.graveId}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

export function totalXp(ledger: readonly XpEntry[]): number {
  return dedupe(ledger).reduce((sum, e) => sum + XP_VALUES[e.kind], 0);
}

export interface LevelInfo {
  level: number;
  xp: number;
  /** Fraction of the way to the next level, in [0, 1]. Always 1 at the maximum level. */
  progress: number;
}

export function levelFor(xp: number): LevelInfo {
  const safe = Math.max(0, xp);
  let level = 1;
  while (level < MAX_LEVEL && safe >= xpForLevel(level + 1)) level += 1;
  if (level === MAX_LEVEL) return { level, xp: safe, progress: 1 };
  const from = xpForLevel(level);
  return { level, xp: safe, progress: (safe - from) / (xpForLevel(level + 1) - from) };
}

export const unlockedDecorations = (level: number): Unlock[] => DECORATIONS.filter((d) => d.level <= level);
export const unlockedStyles = (level: number): Unlock[] => GRAVESTONE_STYLES.filter((s) => s.level <= level);

/** A style id is selectable when it exists and is unlocked at `level`. */
export function isStyleUnlocked(id: string, level: number): boolean {
  return unlockedStyles(level).some((s) => s.id === id);
}

export interface DailyQuest {
  label: string;
  done: number;
  goal: number;
  complete: boolean;
}

/** Local calendar day (`YYYY-MM-DD`) of an ISO string written with a local offset. */
const dayOf = (iso: string): string => iso.slice(0, 10);

/** "Cancel 1 trial (0/1)" for the day of `todayIso`. Resets daily with no penalty and no streak. */
export function dailyQuest(ledger: readonly XpEntry[], todayIso: string): DailyQuest {
  const today = dayOf(todayIso);
  const goal = 1;
  const done = Math.min(
    goal,
    dedupe(ledger).filter((e) => e.kind === 'cancel' && dayOf(e.at) === today).length,
  );
  return { label: `Cancel ${goal} trial (${done}/${goal})`, done, goal, complete: done >= goal };
}

export interface Progress extends LevelInfo {
  decorations: Unlock[];
  styles: Unlock[];
}

export function progressFor(ledger: readonly XpEntry[]): Progress {
  const info = levelFor(totalXp(ledger));
  return { ...info, decorations: unlockedDecorations(info.level), styles: unlockedStyles(info.level) };
}
