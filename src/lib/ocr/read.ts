import { parseReceipt } from '../parse'
import { normaliseOcrText } from './normalise'
import type { OcrEngine, OcrOptions } from './types'

export function parseText(rawText: string, now: Date, confidence = 100) {
  const text = normaliseOcrText(rawText)
  const parsed = parseReceipt(text, now)
  const hint = confidence >= 70 ? 'clear' : confidence >= 40 ? 'partial' : 'poor'
  const problem = !text ? 'no-text' : confidence < 40 ? 'low-confidence' : !Object.keys(parsed).length ? 'no-fields' : undefined
  return { text, confidence, parsed, hint, problem } as const
}

export async function readImageReceipt(engine: OcrEngine, image: Blob | HTMLCanvasElement, now: Date, options: OcrOptions) {
  const { text, confidence } = await engine.recognize(image, options)
  options.signal?.throwIfAborted()
  return parseText(text, now, confidence)
}
