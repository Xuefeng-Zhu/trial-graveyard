import 'fake-indexeddb/auto';
import { clear, get, set } from 'idb-keyval';
import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import { arbGraves, graveWith } from '../domain/arbitraries';
import { getStage } from '../domain/stage';
import { validateTrial } from '../domain/trial';
import type { ValidTrial } from '../domain/trial';
import {
  DEFAULT_SETTINGS,
  NOTICE_CORRUPT,
  STORAGE_KEY,
  deserialize,
  migrate,
  serialize,
  type PersistedState,
} from './storage';
import { UNDO_WINDOW_MS, createGraveStore } from './store';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms);

const TRIAL: ValidTrial = {
  name: 'Netflix',
  chargeAt: '2026-10-31T09:00:00-07:00',
  priceCents: 1549,
  currency: 'USD',
  cadence: 'monthly',
  cancelUrl: 'https://netflix.com/cancel',
};

function newStore() {
  let n = 0;
  return createGraveStore({ newId: () => `id-${++n}` });
}

beforeEach(async () => {
  await clear();
});

describe('actions', () => {
  it('adds, updates and deletes graves', () => {
    const store = newStore();
    const g = store.getState().addGrave(TRIAL, NOW);
    expect(g).toMatchObject({ id: 'id-1', status: 'active', name: 'Netflix' });
    expect(store.getState().graves).toHaveLength(1);

    store.getState().updateGrave('id-1', { ...TRIAL, name: 'Hulu', cancelUrl: undefined });
    expect(store.getState().graves[0]).toMatchObject({ name: 'Hulu', priceCents: 1549 });
    expect(store.getState().graves[0]?.cancelUrl).toBeUndefined();
    store.getState().updateGrave('missing', TRIAL);
    expect(store.getState().graves).toHaveLength(1);

    store.getState().deleteGrave('id-1');
    expect(store.getState().graves).toEqual([]);
  });

  it('accepts validated form output', () => {
    const result = validateTrial({ name: ' Audible ', chargeAt: '2026-11-14', price: '14.95', cadence: 'monthly' });
    if (!result.ok) throw new Error('expected valid trial');
    const store = newStore();
    expect(store.getState().addGrave(result.value, NOW).name).toBe('Audible');
  });

  it('cancels and keeps with timestamps', () => {
    const store = newStore();
    store.getState().addGrave(TRIAL, NOW);
    store.getState().addGrave(TRIAL, NOW);
    store.getState().cancelGrave('id-1', NOW);
    store.getState().keepGrave('id-2', NOW);
    const [a, b] = store.getState().graves;
    expect(a).toMatchObject({ status: 'cancelled' });
    expect(a?.cancelledAt).toBeDefined();
    expect(b).toMatchObject({ status: 'kept' });
    expect(b?.keptAt).toBeDefined();
    store.getState().cancelGrave('missing', NOW);
    expect(store.getState().graves).toHaveLength(2);
  });

  it('undoes the last status change within 10 s, inclusive', () => {
    const store = newStore();
    store.getState().addGrave(TRIAL, NOW);
    store.getState().cancelGrave('id-1', NOW);
    expect(store.getState().undo(at(UNDO_WINDOW_MS))).toBe(true);
    const g = store.getState().graves[0];
    expect(g?.status).toBe('active');
    expect(g?.cancelledAt).toBeUndefined();
    expect(store.getState().lastChange).toBeNull();
  });

  it('does not undo after the window, with nothing to undo, or after delete', () => {
    const store = newStore();
    expect(store.getState().undo(NOW)).toBe(false);
    store.getState().addGrave(TRIAL, NOW);
    store.getState().keepGrave('id-1', NOW);
    expect(store.getState().undo(at(UNDO_WINDOW_MS + 1))).toBe(false);
    expect(store.getState().graves[0]?.status).toBe('kept');
    expect(store.getState().undo(NOW)).toBe(false);

    store.getState().cancelGrave('id-1', NOW);
    store.getState().deleteGrave('id-1');
    expect(store.getState().lastChange).toBeNull();

    store.getState().addGrave(TRIAL, NOW);
    store.getState().addGrave(TRIAL, NOW);
    store.getState().cancelGrave('id-2', NOW);
    store.getState().deleteGrave('id-3');
    expect(store.getState().lastChange?.id).toBe('id-2');
    store.setState({ graves: [] });
    expect(store.getState().undo(NOW)).toBe(false);
  });

  it('undo restores a previously kept grave to kept', () => {
    const store = newStore();
    store.getState().addGrave(TRIAL, NOW);
    store.getState().keepGrave('id-1', NOW);
    store.getState().cancelGrave('id-1', at(1000));
    store.getState().undo(at(2000));
    const g = store.getState().graves[0];
    expect(g?.status).toBe('kept');
    expect(g?.keptAt).toBeDefined();
    expect(g?.cancelledAt).toBeUndefined();
  });

  it('editing a cancelled grave makes it active again', () => {
    const store = newStore();
    store.getState().addGrave(TRIAL, NOW);
    store.getState().cancelGrave('id-1', NOW);
    store.getState().updateGrave('id-1', TRIAL);
    const g = store.getState().graves[0];
    expect(g?.status).toBe('active');
    expect(g?.cancelledAt).toBeUndefined();
  });

  it('toggles daylight and dismisses notices', () => {
    const store = newStore();
    store.getState().toggleDaylight();
    expect(store.getState().settings.daylight).toBe(true);
    store.getState().toggleDaylight();
    expect(store.getState().settings.daylight).toBe(false);
    store.setState({ notice: 'hi' });
    store.getState().dismissNotice();
    expect(store.getState().notice).toBeNull();
  });

  it('loads a demo covering every stage, one cancelled and one kept', () => {
    const store = newStore();
    store.getState().loadDemo(NOW);
    const graves = store.getState().graves;
    expect(graves).toHaveLength(8);
    const stages = new Set(graves.filter((g) => g.status === 'active').map((g) => getStage(g, NOW)));
    expect([...stages].sort()).toEqual(['churning', 'cracked', 'overdue', 'sealed', 'zombie']);
    expect(graves.filter((g) => g.status === 'cancelled')).toHaveLength(1);
    expect(graves.filter((g) => g.status === 'kept')).toHaveLength(1);
  });
});

describe('persistence', () => {
  it('round trips graves and settings through IndexedDB', async () => {
    const a = newStore();
    a.getState().loadDemo(NOW);
    a.getState().toggleDaylight();
    await new Promise((r) => setTimeout(r, 50));
    expect(await get(STORAGE_KEY)).toContain('"version":1');

    const b = newStore();
    await b.persist.rehydrate();
    expect(b.getState().graves).toEqual(a.getState().graves);
    expect(b.getState().settings.daylight).toBe(true);
    expect(b.getState().persistenceAvailable).toBe(true);
    expect(b.getState().notice).toBeNull();

    b.persist.clearStorage();
    await new Promise((r) => setTimeout(r, 20));
    expect(await get(STORAGE_KEY)).toBeUndefined();
  });

  it('migrates a version 0 record', async () => {
    await set(STORAGE_KEY, JSON.stringify({ graves: [graveWith()] }));
    const store = newStore();
    await store.persist.rehydrate();
    expect(store.getState().graves).toEqual([graveWith()]);
    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.getState().notice).toBeNull();
  });

  for (const [label, raw] of [
    ['invalid JSON', '{not json'],
    ['wrong shape', JSON.stringify({ version: 1, graves: 'nope', settings: {} })],
    ['a bad grave', JSON.stringify({ version: 1, graves: [{ id: 'x' }], settings: DEFAULT_SETTINGS })],
    ['a future version', JSON.stringify({ version: 2, graves: [], settings: DEFAULT_SETTINGS })],
    ['a non-object', '42'],
  ] as const) {
    it(`resets with a notice on ${label}`, async () => {
      await set(STORAGE_KEY, raw);
      const store = newStore();
      await store.persist.rehydrate();
      expect(store.getState().graves).toEqual([]);
      expect(store.getState().notice).toBe(NOTICE_CORRUPT);
      // The bad record is replaced by the fresh default state.
      await new Promise((r) => setTimeout(r, 20));
      expect(deserialize((await get<string>(STORAGE_KEY)) ?? '')).toMatchObject({ ok: true, state: { graves: [] } });
      // The app keeps working after a reset.
      store.getState().addGrave(TRIAL, NOW);
      expect(store.getState().graves).toHaveLength(1);
    });
  }
});

describe('migrate and validation', () => {
  it('upgrades version 0 and passes through everything else', () => {
    expect(migrate({ graves: [] })).toEqual({ version: 1, graves: [], settings: DEFAULT_SETTINGS });
    expect(migrate({ version: 1, graves: [] })).toEqual({ version: 1, graves: [] });
    expect(migrate('x')).toBe('x');
    expect(migrate(null)).toBeNull();
  });

  it('rejects subtly invalid graves', () => {
    const bad = [
      graveWith({ priceCents: -1 }),
      graveWith({ priceCents: 1.5 }),
      graveWith({ currency: 'usd' }),
      graveWith({ chargeAt: 'tomorrow' }),
      graveWith({ cancelUrl: 'javascript:alert(1)' }),
      graveWith({ id: '' }),
      { ...graveWith(), status: 'dead' },
      { ...graveWith(), cadence: 'daily' },
      { ...graveWith(), cancelledAt: 5 },
    ];
    for (const g of bad) {
      const raw = JSON.stringify({ version: 1, graves: [g], settings: DEFAULT_SETTINGS });
      expect(deserialize(raw).ok).toBe(false);
    }
    expect(deserialize(JSON.stringify({ version: 1, graves: [], settings: { daylight: 1 } })).ok).toBe(false);
    expect(deserialize(JSON.stringify([]))).toEqual({ ok: false });
  });
});

describe('P-X1 persistence round trip', () => {
  const arbSettings = fc.record({ daylight: fc.boolean(), soundOn: fc.boolean(), llmFallback: fc.boolean() });
  const arbState: fc.Arbitrary<PersistedState> = fc.record({
    version: fc.constant(1 as const),
    graves: arbGraves,
    settings: arbSettings,
  });

  it('serialize then deserialize returns an equal state', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const result = deserialize(serialize(state));
        expect(result).toEqual({ ok: true, state });
      }),
    );
  });
});
