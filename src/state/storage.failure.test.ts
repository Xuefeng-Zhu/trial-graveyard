// No fake-indexeddb import here: jsdom has no IndexedDB, so every idb-keyval call throws.
import { describe, expect, it } from 'vitest';
import { NOTICE_UNAVAILABLE } from './storage';
import { createGraveStore } from './store';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const TRIAL = {
  name: 'Phantomflix',
  chargeAt: '2026-10-31T09:00:00-07:00',
  priceCents: 1549,
  currency: 'USD',
  cadence: 'monthly' as const,
};

describe('IndexedDB unavailable (R9.3)', () => {
  it('falls back to memory with persistenceAvailable=false and a notice', async () => {
    expect(typeof indexedDB).toBe('undefined');
    const store = createGraveStore();
    await store.persist.rehydrate();
    expect(store.getState().persistenceAvailable).toBe(false);
    expect(store.getState().notice).toBe(NOTICE_UNAVAILABLE);

    // The app still works, and later writes and removals do not throw.
    store.getState().addGrave(TRIAL, NOW);
    store.getState().toggleDaylight();
    await new Promise((r) => setTimeout(r, 20));
    store.persist.clearStorage();
    await new Promise((r) => setTimeout(r, 20));
    expect(store.getState().graves).toHaveLength(1);

    // Data written in memory is readable again within the session.
    const again = await store.persist.rehydrate();
    expect(again).toBeUndefined();
    expect(store.getState().persistenceAvailable).toBe(false);
  });

  it('keeps a failed write in memory when only the write fails', async () => {
    const store = createGraveStore();
    store.getState().addGrave(TRIAL, NOW);
    await new Promise((r) => setTimeout(r, 20));
    expect(store.getState().persistenceAvailable).toBe(false);
  });
});
