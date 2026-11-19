import { format } from 'date-fns'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseReceipt, parseWithFallback } from './index'
import { chargePhrases, dateCases, receipts } from './fixtures/receipts'

const now = new Date('2026-11-19T12:00:00Z')

describe('receipt templates across supported date formats', () => {
  for (const [brand, currency, price, cents, cadence, phrase] of receipts) {
    const examples = chargePhrases.flatMap(label => dateCases.map(date => [label, date] as const))
    it.each(examples)(`${brand} · %s %s`, (label, date) => {
      const output = parseReceipt(`Welcome to ${brand}!\n${label} ${date}. ${price} ${phrase}.\nManage at https://plans.example/account`, now)
      expect(output.name?.value).toBe(brand)
      expect(output.currency?.value).toBe(currency)
      expect(output.priceCents?.value).toBe(cents)
      expect(output.cadence?.value).toBe(cadence)
      expect(format(output.chargeAt!.value, 'yyyy-MM-dd')).toBe('2026-12-17')
      expect(output.cancelUrl?.value).toBe('https://plans.example/account')
    })
  }
})

it('P-P1, P-P2 and P-P8 are total, deterministic and valid for arbitrary Unicode', () => {
  fc.assert(fc.property(fc.string({ unit: 'grapheme' }), text => {
    const output = parseReceipt(text, now)
    expect(parseReceipt(text, now)).toEqual(output)
    for (const field of Object.values(output)) {
      expect(field.confidence).toBeGreaterThan(0)
      expect(field.source.length).toBeGreaterThan(0)
    }
    if (output.priceCents) expect(Number.isSafeInteger(output.priceCents.value)).toBe(true)
    if (output.chargeAt) expect(Number.isFinite(Date.parse(output.chargeAt.value))).toBe(true)
    if (output.cancelUrl) expect(output.cancelUrl.value).toMatch(/^https?:/i)
  }))
})
it('P-P3 round trips cents, currency and cadence', () => {
  fc.assert(fc.property(fc.nat(999999), fc.constantFrom(['$', 'USD'], ['£', 'GBP'], ['€', 'EUR']), (cents, [symbol, code]) => {
    const output = parseReceipt(`Special offer: ${symbol}${(cents / 100).toFixed(2)} per month. Cheers!`, now)
    expect(output.priceCents?.value).toBe(cents)
    expect(output.currency?.value).toBe(code)
    expect(output.cadence?.value).toBe('monthly')
  }))
})
it('P-P4 round trips generated calendar dates', () => {
  fc.assert(fc.property(fc.date({ min: new Date(2010, 0, 1), max: new Date(2090, 11, 31), noInvalidDate: true }), date => {
    for (const template of ['yyyy-MM-dd', 'MMM d, yyyy', 'd MMMM yyyy', 'MM/dd/yyyy']) {
      const source = format(date, template)
      const result = parseReceipt(`Mail. Trial ends ${source}.`, now)
      expect(format(result.chargeAt!.value, 'yyyy-MM-dd')).toBe(format(date, 'yyyy-MM-dd'))
    }
  }))
})
it('P-P5 and P-P6 tolerate noise, casing and spacing', () => {
  fc.assert(fc.property(fc.array(fc.constantFrom('Hello', 'Regards', 'Greetings'), { maxLength: 30 }), noise => {
    const receipt = 'Welcome to Phantomflix! Trial ends 2026-12-17. EUR 12.34 per month.'
    const output = parseReceipt(`${noise.join(' ')}. ${receipt.replace('Trial ends', 'TRIAL   ENDS')} ${noise.join(' ')}`, now)
    expect(output).toEqual(parseReceipt(receipt, now))
  }))
})
it('P-P7 leaves digit-free text empty and preserves recognised sources', () => {
  fc.assert(fc.property(fc.string().map(text => text.replace(/\d/g, '')), text => {
    expect(parseReceipt(text, now)).toEqual({})
  }))
  const receipt = 'Your Phantomflix trial ends December 24, 2026. USD 3.95 per month.'
  for (const field of Object.values(parseReceipt(receipt, now))) expect(receipt).toContain(field.source)
})
it('P-P9 bounds processing time on long hostile input', () => {
  const start = performance.now()
  expect(parseReceipt('9 '.repeat(50_000), now)).toEqual({})
  expect(performance.now() - start).toBeLessThan(200)
})
it('prioritizes labelled dates, skips invalid dates and infers a missing year', () => {
  const output = parseReceipt('Order 2026-05-03. First charge on Dec 25. 2026-02-29', now)
  expect(output.chargeAt?.source).toBe('Dec 25')
  expect(format(parseReceipt('Trial ends Nov 1', now).chargeAt!.value, 'yyyy-MM-dd')).toBe('2027-11-01')
  expect(format(parseReceipt('Trial ends in 2 days', now).chargeAt!.value, 'yyyy-MM-dd')).toBe('2026-11-21')
})
it('uses the optional local fallback only as an empty suggestion', async () => {
  expect(await parseWithFallback('Nothing to see', now, false)).toEqual({})
  expect(await parseWithFallback('Nothing to see', now, true)).toEqual({})
  expect(await parseWithFallback('Monthly USD 13.99', now, true)).toEqual(parseReceipt('Monthly USD 13.99', now))
})
