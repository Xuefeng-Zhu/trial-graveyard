import { get, set } from 'idb-keyval'
import fc from 'fast-check'
import { expect, it, vi } from 'vitest'
import { graveArb, reference, trial } from '../domain/arbitraries'
import { defaultSettings, readState, createStorage } from './storage'
import { createGraveyardStore } from './store'

async function readyStore(key: string) {
  const store = createGraveyardStore(key)
  await vi.waitFor(() => expect(store.getState().ready).toBe(true))
  return store
}

it('P-X1 serializes and restores valid state', () => {
  fc.assert(fc.property(fc.uniqueArray(graveArb, { selector: grave => grave.id }), graves => {
    const state = { graves, settings: defaultSettings }
    expect(JSON.parse(JSON.stringify(readState(JSON.parse(JSON.stringify(state)))))).toEqual(state)
  }))
})
it('seeds the demo once, persists it, and keeps the original dates after reseeding', async () => {
  const store = await readyStore('demo-test')
  store.getState().loadDemo(reference)
  const original = store.getState().graves
  store.getState().loadDemo(new Date())
  expect(store.getState().graves).toEqual(original)
  expect(original).toHaveLength(8)
  store.getState().toggle('soundOn')
  await vi.waitFor(async () => expect(JSON.parse((await get<string>('demo-test'))!).state.settings.soundOn).toBe(true))
  const reloaded = await readyStore('demo-test')
  expect(reloaded.getState().settings.soundOn).toBe(true)
  expect(reloaded.getState().graves.map(grave => grave.id)).toEqual(original.map(grave => grave.id))
})
it('validates on add, edits, and can undo cancel, keep and delete', async () => {
  const store = await readyStore('undo-test')
  expect(store.getState().addGrave(trial({ name: '' }), reference)).toBeUndefined()
  const grave = store.getState().addGrave(trial(), reference)!
  store.getState().updateGrave(grave.id, trial({ name: 'Edited' }))
  store.getState().cancelGrave(grave.id, reference)
  expect(store.getState().graves[0].status).toBe('cancelled')
  store.getState().undo(reference)
  expect(store.getState().graves[0].status).toBe('active')
  store.getState().keepGrave(grave.id, reference)
  store.getState().undo(reference)
  store.getState().deleteGrave(grave.id, reference)
  expect(store.getState().graves).toHaveLength(0)
  store.getState().undo(reference)
  expect(store.getState().graves[0].name).toBe('Edited')
  store.getState().deleteGrave(grave.id, reference)
  store.getState().undo(new Date(+reference + 11_000))
  expect(store.getState().graves).toHaveLength(0)
})
it('migrates old settings and gives a notice for corrupt storage', async () => {
  await set('old-store', JSON.stringify({ version: 0, state: { graves: [trial()], settings: { daylight: true } } }))
  expect((await readyStore('old-store')).getState().settings).toEqual({ ...defaultSettings, daylight: true })
  await set('corrupt-store', '{wrong')
  expect((await readyStore('corrupt-store')).getState().notice).toMatch(/reset/)
})
it('falls back to memory when IndexedDB is blocked', async () => {
    const notice = vi.fn()
    const storage = createStorage(notice, () => { throw new Error('blocked') })
    await storage.setItem('key', 'value')
    expect(await storage.getItem('key')).toBe('value')
    await storage.removeItem('key')
    expect(await storage.getItem('key')).toBeNull()
    expect(notice).toHaveBeenCalledOnce()
})
