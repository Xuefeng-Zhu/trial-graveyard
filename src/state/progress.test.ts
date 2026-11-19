import { get, set } from 'idb-keyval'
import { expect, it, vi } from 'vitest'
import { reference, trial } from '../domain/arbitraries'
import { dailyQuest, totalXp, type XpEntry } from '../domain/xp'
import { exportGraveyard, importGraveyard } from './backup'
import { defaultProgress, defaultSettings, readState } from './storage'
import { createGraveyardStore } from './store'

it('earns XP with real actions and removes cancellation XP on undo', async () => {
  const store = createGraveyardStore('xp-actions')
  await vi.waitFor(() => expect(store.getState().ready).toBe(true))
  const grave = store.getState().addGrave(trial(), reference)!
  store.getState().reviewGrave('missing', reference)
  store.getState().reviewGrave(grave.id, reference)
  store.getState().reviewGrave(grave.id, reference)
  expect(totalXp(store.getState().progress.ledger)).toBe(15)
  store.getState().exorcise(grave.id, reference)
  store.getState().exorcise(grave.id, reference)
  expect(totalXp(store.getState().progress.ledger)).toBe(40)
  expect(dailyQuest(store.getState().progress.ledger, reference)).toBe(1)
  store.getState().undo(reference)
  expect(totalXp(store.getState().progress.ledger)).toBe(15)
  expect(dailyQuest(store.getState().progress.ledger, reference)).toBe(0)
})
it('persists selected, unlocked styles and loads old archives with defaults', async () => {
  const key = 'style-persistence'
  const ledger = Array.from({ length: 12 }, (_, index): XpEntry => ({ kind: 'cancel', graveId: String(index), at: reference.toISOString() }))
  await set(key, JSON.stringify({ version: 1, state: { graves: [], settings: defaultSettings } }))
  const store = createGraveyardStore(key)
  await vi.waitFor(() => expect(store.getState().ready).toBe(true))
  expect(store.getState().progress).toEqual(defaultProgress)
  store.getState().selectStyle('mossy')
  expect(store.getState().progress.styleId).toBe('classic')
  store.getState().restore({ graves: [], settings: defaultSettings, progress: { ledger, styleId: 'classic' } }, 'replace')
  store.getState().selectStyle('mossy')
  expect(store.getState().progress.styleId).toBe('mossy')
  await vi.waitFor(async () => {
    const value = JSON.parse((await get<string>(key))!)
    expect(value.state.progress.styleId).toBe('mossy')
  })
  const snapshot = store.getState().snapshot()
  expect(importGraveyard(exportGraveyard(snapshot))).toStrictEqual(snapshot)
  expect(readState({ ...snapshot, progress: { ledger, styleId: 'custom' } })).toBeUndefined()
  expect(readState({ ...snapshot, progress: { ledger: [null], styleId: 'classic' } })).toBeUndefined()
})

it('undoes a cancellation without overwriting a later edit', async () => {
  const store = createGraveyardStore('keep-edits-on-undo')
  await vi.waitFor(() => expect(store.getState().ready).toBe(true))
  const grave = store.getState().addGrave({ ...trial(), cancelUrl: 'https://service.example/cancel' }, reference)!
  store.getState().exorcise(grave.id, reference)
  store.getState().updateGrave(grave.id, trial({ name: 'Updated', priceCents: 2599 }))
  store.getState().undo(reference)
  expect(store.getState().graves[0]).toMatchObject({ status: 'active', name: 'Updated', priceCents: 2599 })
  expect(store.getState().graves[0]).not.toHaveProperty('cancelUrl')
  expect(store.getState().graves[0]).not.toHaveProperty('cancelledAt')
})
