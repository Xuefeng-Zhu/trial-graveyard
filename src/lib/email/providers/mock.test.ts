import { expect, it } from 'vitest'
import { subDays } from 'date-fns'
import { reference } from '../../../domain/arbitraries'
import { createMockProvider } from './mock'

it('requires consent, then streams recent relative-date messages until disconnected', async () => {
  let confirmed = false
  const provider = createMockProvider({ now: reference, confirm: () => confirmed, delayMs: 0 })
  const collect = async (since: Date) => {
    const messages = []
    for await (const message of provider.searchReceipts({ since })) messages.push(message)
    return messages
  }
  await expect(collect(reference)).rejects.toThrow('Connect')
  await expect(provider.connect()).rejects.toThrow('declined')
  expect(provider.isConnected()).toBe(false)
  confirmed = true
  await provider.connect()
  expect(provider.isConnected()).toBe(true)
  const all = await collect(subDays(reference, 30))
  expect(all).toHaveLength(13)
  expect(all.every(message => Date.parse(message.date) < +reference)).toBe(true)
  expect(await collect(subDays(reference, 2))).toEqual(all.slice(0, 2))
  const active = provider.searchReceipts({ since: subDays(reference, 30) })[Symbol.asyncIterator]()
  expect((await active.next()).done).toBe(false)
  await provider.disconnect()
  expect((await active.next()).done).toBe(true)
  expect(provider.isConnected()).toBe(false)
})
