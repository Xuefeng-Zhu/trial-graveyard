import { expect, it } from 'vitest'
import fc from 'fast-check'
import { reference } from '../../domain/arbitraries'
import { format } from 'date-fns'
import { createFakeEngine } from './fake'
import { normaliseOcrText } from './normalise'
import { fitWithin, toGrayscale } from './preprocess'
import { parseText, readImageReceipt } from './read'

import { sampleText } from './sample.fixture'

it.each([
  [1600, 900, 1600, 900], [4000, 2200, 1600, 880], [800, 2800, 457, 1600], [1, 3500, 1, 1600],
])('fits %i × %i without upscaling or flattening a pixel dimension', (w, h, width, height) => {
  expect(fitWithin(w, h)).toEqual({ width, height })
})
it('uses standard luma and keeps alpha', () => {
  expect([...toGrayscale(new Uint8ClampedArray([255, 0, 0, 100, 0, 255, 0, 5, 0, 0, 255, 255]))])
    .toEqual([76, 76, 76, 100, 150, 150, 150, 5, 29, 29, 29, 255])
  expect(() => fitWithin(0, 1)).toThrow()
})
it('normalizes OCR glyphs and line wraps idempotently', () => {
  expect(normaliseOcrText(' “Re-\nceipt”\r\n\n $1|2   monthly\u200b ')).toBe('"Receipt"\n$112 monthly')
  fc.assert(fc.property(fc.string({ unit: 'grapheme' }), text => {
    expect(normaliseOcrText(normaliseOcrText(text))).toBe(normaliseOcrText(text))
  }))
})
it('reads the sample text without joining the next sentence or rolling over its explicit year', async () => {
  const progress: number[] = []
  const reading = await readImageReceipt(createFakeEngine({ text: sampleText, confidence: 98 }), new Blob(), reference,
    { onProgress: percent => progress.push(percent) })
  expect(progress).toEqual([10, 45, 100])
  expect(reading.hint).toBe('clear')
  expect(reading.parsed.name?.value).toBe('Phantomflix')
  expect(reading.parsed.chargeAt?.source).toBe('December 15, 2026')
  expect(format(reading.parsed.chargeAt!.value, 'yyyy-MM-dd')).toBe('2026-12-15')
  expect(reading.parsed.priceCents?.value).toBe(1399)
})
it.each([
  ['', 100, 'clear', 'no-text'], ['No trial here', 65, 'partial', 'no-fields'], [sampleText, 35, 'poor', 'low-confidence'],
] as const)('returns a useful problem for a receipt with confidence %i', (text, confidence, hint, problem) => {
  expect(parseText(text, reference, confidence)).toMatchObject({ hint, problem })
})
it('forwards cancellation and errors from the engine', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(readImageReceipt(createFakeEngine({ text: '', confidence: 0 }), new Blob(), reference,
    { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  await expect(readImageReceipt(createFakeEngine(new Error('Unavailable')), new Blob(), reference, {})).rejects.toThrow('Unavailable')
})
