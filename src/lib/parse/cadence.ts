import type { Cadence } from '../../domain/trial'

const phrases: [Cadence, RegExp][] = [
  ['weekly', /\/\s*w(?:ee)?k\b|\b(?:weekly|per\s+week|each\s+week)\b/i],
  ['monthly', /\/\s*mo(?:nth)?\b|\b(?:monthly|per\s+month|each\s+month)\b/i],
  ['yearly', /\/\s*(?:yr|year)\b|\b(?:yearly|annually|annual|per\s+year|each\s+year)\b/i],
  ['one-time', /\bone[ -]time\b/i],
]

export function extractCadence(text: string) {
  for (const [value, pattern] of phrases) {
    const match = pattern.exec(text)
    if (match) return { value, source: match[0], confidence: 0.92 }
  }
}
