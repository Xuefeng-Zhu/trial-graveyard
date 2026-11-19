import 'fake-indexeddb/auto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGraves, graveWith } from '../domain/arbitraries';
import { applyBackup, exportBackup, parseBackup } from './backup';
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS } from './storage';
import type { PersistedSlice } from './storage';
import { createGraveStore } from './store';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const slice = (graves = [graveWith()]): PersistedSlice => ({
  graves,
  settings: { ...DEFAULT_SETTINGS },
  progress: { ...DEFAULT_PROGRESS, ledger: [] },
});

describe('backup export and import', () => {
  it('round-trips: import(export(x)) deep-equals x', () => {
    const arbSlice = fc.record({
      graves: arbGraves,
      settings: fc.record({ daylight: fc.boolean(), soundOn: fc.boolean(), calm: fc.boolean(), llmFallback: fc.boolean() }),
      progress: fc.record({
        styleId: fc.constantFrom('classic', 'mossy'),
        ledger: fc.array(
          fc.record({
            kind: fc.constantFrom('add' as const, 'review' as const, 'cancel' as const),
            graveId: fc.uuid(),
            at: fc.constant('2026-10-01T12:00:00.000Z'),
          }),
          { maxLength: 6 },
        ),
      }),
    });
    fc.assert(
      fc.property(arbSlice, (x) => {
        const result = parseBackup(exportBackup(x, NOW));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toEqual(x);
      }),
    );
  });

  it('round-trips through the store with replace', () => {
    fc.assert(
      fc.property(arbGraves, (graves) => {
        const a = createGraveStore({ backend: memory() });
        a.setState({ graves });
        const text = exportBackup(
          { graves: a.getState().graves, settings: a.getState().settings, progress: a.getState().progress },
          NOW,
        );
        const b = createGraveStore({ backend: memory() });
        const parsed = parseBackup(text);
        if (!parsed.ok) throw new Error('invalid');
        b.getState().importData(parsed.data, 'replace');
        expect(b.getState().graves).toEqual(graves);
      }),
    );
  });

  it.each([
    ['not json', '{nope'],
    ['wrong shape', '{"version":1,"graves":"x"}'],
    ['bad grave', JSON.stringify({ version: 1, graves: [{ id: 'x' }], settings: DEFAULT_SETTINGS })],
    ['array', '[]'],
  ])('rejects %s', (_n, text) => {
    expect(parseBackup(text).ok).toBe(false);
  });

  it('merge keeps current graves and adds only new ids', () => {
    const mine = slice([graveWith({ id: 'a', name: 'Mine' })]);
    const theirs = slice([graveWith({ id: 'a', name: 'Theirs' }), graveWith({ id: 'b', name: 'New' })]);
    const merged = applyBackup(mine, theirs, 'merge');
    expect(merged.graves.map((g) => [g.id, g.name])).toEqual([
      ['a', 'Mine'],
      ['b', 'New'],
    ]);
  });

  it('replace swaps everything', () => {
    const theirs = slice([graveWith({ id: 'b' })]);
    expect(applyBackup(slice(), theirs, 'replace')).toEqual(theirs);
  });
});

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
