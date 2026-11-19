import type { TrialInput } from '../../domain/trial'
import { extractMoney } from './money'
import { extractCadence } from './cadence'
import { extractDate } from './date'
import { extractUrl } from './url'
import { extractName } from './name'

export type Field<T> = { value: T; confidence: number; source: string }
export type ParseResult = { [K in keyof TrialInput]?: Field<NonNullable<TrialInput[K]>> }

export function parseReceipt(raw: string, refDate: Date): ParseResult {
  const text = raw.slice(0, 50_000).normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ')
  if (!/\d/.test(text) || !Number.isFinite(+refDate)) return {}
  const result: ParseResult = {}
  const money = extractMoney(text)
  if (money) {
    result.priceCents = { value: money.cents, source: money.source, confidence: 0.94 }
    result.currency = { value: money.currency, source: money.source, confidence: 0.94 }
  }
  const name = extractName(text)
  const cadence = extractCadence(text)
  const chargeAt = extractDate(text, refDate)
  const cancelUrl = extractUrl(text)
  if (name) result.name = name
  if (cadence) result.cadence = cadence
  if (chargeAt) result.chargeAt = chargeAt
  if (cancelUrl) result.cancelUrl = cancelUrl
  return result
}

export async function parseWithFallback(text: string, now: Date, enabled: boolean) {
  const result = parseReceipt(text, now)
  if (!enabled || !navigator.onLine || Object.keys(result).length >= 3) return result
  const { suggestFields } = await import('./llmFallback')
  return { ...await suggestFields(), ...result }
}
