import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE,
  MAX_LEVEL,
  XP_VALUES,
  dailyQuest,
  dedupe,
  isStyleUnlocked,
  levelFor,
  progressFor,
  totalXp,
  unlockedDecorations,
  unlockedStyles,
  xpForLevel,
} from './xp';
import type { XpEntry } from './xp';

const e = (kind: XpEntry['kind'], graveId: string, at = '2026-10-30T09:00:00-07:00'): XpEntry => ({
  kind,
  graveId,
  at,
});

describe('xp', () => {
  it('awards XP per event and ignores repeats', () => {
    expect(totalXp([])).toBe(0);
    expect(totalXp([e('add', 'a'), e('review', 'a'), e('cancel', 'a')])).toBe(
      XP_VALUES.add + XP_VALUES.review + XP_VALUES.cancel,
    );
    expect(dedupe([e('add', 'a'), e('add', 'a'), e('add', 'b')])).toHaveLength(2);
    expect(totalXp([e('cancel', 'a'), e('cancel', 'a')])).toBe(XP_VALUES.cancel);
  });

  it('computes levels and progress', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(levelFor(0)).toEqual({ level: 1, xp: 0, progress: 0 });
    expect(levelFor(-5).xp).toBe(0);
    expect(levelFor(50)).toEqual({ level: 1, xp: 50, progress: 0.5 });
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(299).level).toBe(2);
    expect(levelFor(300).level).toBe(3);
    expect(levelFor(1e9)).toEqual({ level: MAX_LEVEL, xp: 1e9, progress: 1 });
  });

  it('unlocks cosmetics by level', () => {
    expect(unlockedDecorations(1)).toEqual([]);
    expect(unlockedDecorations(2).map((d) => d.id)).toEqual(['lantern']);
    expect(unlockedStyles(1).map((s) => s.id)).toEqual([DEFAULT_STYLE]);
    expect(isStyleUnlocked('mossy', 2)).toBe(false);
    expect(isStyleUnlocked('mossy', 3)).toBe(true);
    expect(isStyleUnlocked('nope', 20)).toBe(false);
  });

  it('tracks the daily quest without streaks', () => {
    const today = '2026-10-30T20:00:00-07:00';
    expect(dailyQuest([], today)).toEqual({ label: 'Cancel 1 trial (0/1)', done: 0, goal: 1, complete: false });
    const yesterday = e('cancel', 'a', '2026-10-29T10:00:00-07:00');
    expect(dailyQuest([yesterday], today).done).toBe(0);
    const q = dailyQuest([yesterday, e('cancel', 'b'), e('cancel', 'c')], today);
    expect(q).toEqual({ label: 'Cancel 1 trial (1/1)', done: 1, goal: 1, complete: true });
    expect(dailyQuest([e('add', 'a')], today).done).toBe(0);
  });

  it('summarises progress', () => {
    const p = progressFor([e('cancel', 'a'), e('cancel', 'b'), e('cancel', 'c'), e('cancel', 'd')]);
    expect(p.level).toBe(2);
    expect(p.decorations.map((d) => d.id)).toEqual(['lantern']);
    expect(p.styles).toHaveLength(1);
  });
});
