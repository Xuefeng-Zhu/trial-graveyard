import { expect, it } from 'vitest'
import fc from 'fast-check'
import { reference, trial } from '../../domain/arbitraries'
import { format } from 'date-fns'
import { buildFixtures, senders } from './providers/fixtures'
import { receiptSnippet, scanEmails } from './scanner'
import type { EmailMessage } from './types'

async function* stream(messages: EmailMessage[]) { yield* messages }

it('recognizes eight trials and two renewals while skipping unrelated mail', async () => {
  const messages = buildFixtures(reference)
  const checkpoints: [number, number][] = []
  const results = await scanEmails(stream(messages), [], reference, ({ read, found }) => checkpoints.push([read, found]))
  expect(results.map(candidate => candidate.fields.name)).toEqual(Object.values(senders))
  expect(results.map(candidate => format(candidate.fields.chargeAt, 'yyyy-MM-dd')).slice(0, 2)).toEqual(['2026-11-22', '2026-11-24'])
  expect(checkpoints.at(-1)).toEqual([13, 10])
  expect(results[0].signals).toEqual(['subject:trial', 'sender:phantomflix.example'])
  expect(results[8].signals[0]).toBe('subject:renews on')
})
it('dedupes existing trials and keeps the most confident or earliest email', async () => {
  const [mail] = buildFixtures(reference)
  const less = { ...mail, id: 'less', from: 'a@unknown.example', subject: 'Greeting' }
  const earlier = { ...mail, id: 'earlier', date: '2026-11-15T01:00:00Z' }
  const messages = [less, mail, earlier]
  const candidates = await scanEmails(stream(messages), [], reference)
  expect(candidates).toHaveLength(1)
  expect(candidates[0].messageId).toBe('earlier')
  expect(candidates[0].confidence).toBeGreaterThan((await scanEmails(stream([less]), [], reference))[0].confidence)
  expect(await scanEmails(stream(messages), [trial({ ...candidates[0].fields, name: 'PHANTOMFLIX' })], reference)).toEqual([])
})
it('drops URLs and truncates at whole words', () => {
  expect(receiptSnippet('Charge 12/18/2026. Manage your plan: https://demo.example/' + 'x'.repeat(190), '12/18/2026')).toBe('Charge 12/18/2026. Manage your plan:')
  expect(receiptSnippet('Charge today. This longer phrase continues after the boundary', 'today', 25)).toBe('Charge today. This…')
})
it('always produces unique, dated, deterministic candidates', async () => {
  const fixtures = buildFixtures(reference)
  await fc.assert(fc.asyncProperty(fc.array(fc.record({
    index: fc.integer({ min: 0, max: fixtures.length - 1 }), suffix: fc.string(), erase: fc.boolean(),
  })), async trials => {
    const messages = trials.map(({ index, suffix, erase }, i) => ({
      ...fixtures[index], id: String(i), text: erase ? 'No charge date.' : fixtures[index].text + suffix,
    }))
    const results = await scanEmails(stream(messages), [], reference)
    expect(results).toEqual(await scanEmails(stream(messages), [], reference))
    expect(new Set(results.map(candidate => candidate.key)).size).toBe(results.length)
    expect(results.every(candidate => Number.isFinite(Date.parse(candidate.fields.chargeAt)) && candidate.confidence >= 0 && candidate.confidence <= 1)).toBe(true)
  }))
})
