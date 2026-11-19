import { trialKey } from '../../domain/duplicates'
import type { Grave } from '../../domain/trial'
import { parseReceipt } from '../parse'
import { emailSignals } from './signals'
import type { Candidate, EmailMessage, ScanProgress } from './types'

export function receiptSnippet(source: string, dateSource: string, limit = 160) {
  const compact = source.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim()
  if (compact.length <= limit) return compact
  const dateIndex = compact.indexOf(dateSource)
  const before = dateIndex > 0 ? compact.lastIndexOf('. ', dateIndex) + 1 : 0
  const shortened = before > 0 ? compact.slice(before).trimStart() : compact
  if (shortened.length <= limit) return shortened
  const boundary = shortened.lastIndexOf(' ', limit - 1)
  return (boundary > 0 ? shortened.slice(0, boundary) : '') + '…'
}

function candidateFor(message: EmailMessage, now: Date): Candidate | undefined {
  const { domain, sender, match, distractor } = emailSignals(message.subject, message.from)
  if (distractor) return
  const refDate = Number.isFinite(Date.parse(message.date)) ? new Date(message.date) : now
  const parsed = parseReceipt(message.text, refDate)
  if (!parsed.chargeAt) return
  const name = (parsed.name && parsed.name.confidence >= .75 ? parsed.name.value : undefined) ?? sender
    ?? domain.split('.')[0].replace(/^./, character => character.toUpperCase())
  if (!name) return
  const fields = {
    name, chargeAt: parsed.chargeAt.value, priceCents: parsed.priceCents?.value ?? NaN,
    currency: parsed.currency?.value ?? 'USD', cadence: parsed.cadence?.value ?? 'monthly', cancelUrl: parsed.cancelUrl?.value,
  } as const
  const mean = ((parsed.name?.confidence ?? 0) + (parsed.priceCents?.confidence ?? 0) + parsed.chargeAt.confidence) / 3
  return {
    key: trialKey(fields), fields, messageId: message.id, snippet: receiptSnippet(message.text, parsed.chargeAt.source),
    confidence: Math.min(1, .6 * mean + (match ? .25 : 0) + (sender ? .15 : 0)),
    signals: [... (match ? [`subject:${match}`] : []), ... (sender ? [`sender:${domain}`] : [])],
  }
}

export async function scanEmails(messages: AsyncIterable<EmailMessage>, existing: readonly Grave[], now: Date,
  onProgress?: (progress: ScanProgress, candidates: Candidate[]) => void,
): Promise<Candidate[]> {
  const known = new Set(existing.map(trialKey))
  const candidates = new Map<string, { candidate: Candidate; sentAt: number }>()
  const sorted = () => Array.from(candidates.values(), item => item.candidate).sort((a, b) =>
    Date.parse(a.fields.chargeAt) - Date.parse(b.fields.chargeAt) || a.fields.name.localeCompare(b.fields.name))
  let read = 0
  for await (const message of messages) {
    const candidate = candidateFor(message, now)
    if (candidate && !known.has(candidate.key)) {
      const old = candidates.get(candidate.key)
      const sentAt = Date.parse(message.date) || +now
      if (!old || candidate.confidence > old.candidate.confidence
        || candidate.confidence === old.candidate.confidence && sentAt < old.sentAt) candidates.set(candidate.key, { candidate, sentAt })
    }
    read++
    onProgress?.({ read, found: candidates.size }, sorted())
  }
  return sorted()
}
