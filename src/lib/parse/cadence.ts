import type { Cadence } from '../../domain/trial';
import type { Field } from './types';

const PATTERNS: ReadonlyArray<readonly [Cadence, RegExp]> = [
  ['monthly', /\bper\s+month\b|\/\s?mo(?:nth)?\b|\bmonthly\b|\ba\s+month\b|\bevery\s+month\b/i],
  ['yearly', /\bper\s+year\b|\/\s?(?:yr|year)\b|\bannual(?:ly)?\b|\byearly\b|\bper\s+annum\b|\ba\s+year\b/i],
  ['weekly', /\bper\s+week\b|\/\s?(?:wk|week)\b|\bweekly\b|\ba\s+week\b|\bevery\s+week\b/i],
  ['one-time', /\bone[- ]time\b/i],
];

/** The earliest cadence phrase in the text wins. */
export function extractCadence(text: string): Field<Cadence> | undefined {
  let best: { cadence: Cadence; index: number; source: string } | undefined;
  for (const [cadence, re] of PATTERNS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.index)) best = { cadence, index: m.index, source: m[0] };
  }
  return best && { value: best.cadence, confidence: 0.8, source: best.source };
}
