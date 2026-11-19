import { expect, it, vi } from 'vitest'
import fc from 'fast-check'
import { graveArb, reference, trial } from '../domain/arbitraries'
import { exportGraveyard, importGraveyard, mergeGraveyards } from './backup'
import { defaultSettings } from './storage'
import { createGraveyardStore } from './store'

it('exports and imports the same graves and settings for arbitrary valid backups', () => {
  fc.assert(fc.property(fc.uniqueArray(graveArb, { selector: grave => grave.id }), fc.boolean(), fc.boolean(), (graves, daylight, calm) => {
    const state = { graves, settings: { ...defaultSettings, daylight, calm } }
    expect(importGraveyard(exportGraveyard(state))).toStrictEqual(state)
  }))
})
it('rejects malformed, incompatible, unsafe or duplicate data', () => {
  const good = { version: 1, graves: [trial()], settings: defaultSettings }
  for (const input of [
    {}, { ...good, version: 2 }, { ...good, graves: [trial(), trial()] }, { ...good, settings: { calm: 'maybe' } },
    { ...good, graves: [trial({ cancelUrl: 'javascript:alert(0)' })] },
  ]) expect(importGraveyard(JSON.stringify(input))).toBeUndefined()
  expect(importGraveyard('{invalid-json')).toBeUndefined()
})
it('merges by ID with local settings and supports replace and reset', async () => {
  const store = createGraveyardStore('backup-test')
  await vi.waitFor(() => expect(store.getState().ready).toBe(true))
  const local = { graves: [trial()], settings: defaultSettings }
  const imported = { graves: [trial({ name: 'Same ID' }), trial({ id: 'different' })], settings: { ...defaultSettings, calm: true } }
  const merged = mergeGraveyards(local, imported)
  expect(merged.graves).toEqual([local.graves[0], imported.graves[1]])
  expect(merged.settings).toEqual(defaultSettings)
  store.getState().restore(local, 'replace')
  store.getState().restore(imported, 'merge')
  expect(store.getState().snapshot()).toEqual(merged)
  store.getState().restore(imported, 'replace')
  expect(store.getState().snapshot()).toEqual(imported)
  store.getState().clearData()
  expect(store.getState().snapshot()).toEqual({ graves: [], settings: defaultSettings })
})
it('keeps exorcism confirmation reversible', async () => {
  const store = createGraveyardStore('exorcise-test')
  await vi.waitFor(() => expect(store.getState().ready).toBe(true))
  const grave = store.getState().addGrave(trial(), reference)!
  store.getState().exorcise(grave.id, reference)
  expect(store.getState().graves[0].status).toBe('cancelled')
  store.getState().undo(reference)
  expect(store.getState().graves[0].status).toBe('active')
})
