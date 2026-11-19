import { parseReceipt, normalizeText } from '../parse';
import type { Grave } from '../../domain/trial';
import type { Candidate, EmailMessage, ScanProgress } from './types';
import { domainLabel, isDistractorSubject, knownService, senderDomain, subjectSignals } from './signals';

export const MIN_CONFIDENCE = 0.5;
const SNIPPET_CHARS = 160;
const NAME_CONFIDENT = 0.5;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const dayOf = (iso: string): string => iso.slice(0, 10);

export function candidateKey(name: string, chargeAt: string): string {
  return `${name.trim().toLowerCase()}|${dayOf(chargeAt)}`;
}

function snippetAround(text: string, source: string): string {
  const body = normalizeText(text);
  const at = Math.max(0, body.indexOf(source));
  const start = Math.max(0, at - SNIPPET_CHARS / 2);
  return body.slice(start, start + SNIPPET_CHARS).trim();
}

/** Turns one email into a candidate, or undefined when it is not a trial. */
export function analyzeMessage(msg: EmailMessage, now: Date): Candidate | undefined {
  const sent = new Date(msg.date);
  const parsed = parseReceipt(msg.text, Number.isNaN(sent.getTime()) ? now : sent);
  if (!parsed.chargeAt || Number.isNaN(Date.parse(parsed.chargeAt.value))) return undefined;

  const keywords = subjectSignals(msg.subject);
  if (keywords.length === 0 && isDistractorSubject(msg.subject)) return undefined;

  const domain = senderDomain(msg.from);
  const service = knownService(domain);
  const signals = [...keywords];
  if (service !== undefined && domain !== undefined) signals.push(`sender:${domain}`);

  let name = parsed.name && parsed.name.confidence >= NAME_CONFIDENT ? parsed.name.value : undefined;
  name ??= service ?? parsed.name?.value ?? domainLabel(domain);
  if (name === undefined || name.trim() === '') return undefined;

  const mean =
    ((name === parsed.name?.value ? parsed.name.confidence : service ? 0.7 : 0.3) +
      (parsed.priceCents?.confidence ?? 0) +
      parsed.chargeAt.confidence) /
    3;
  const confidence = clamp01(0.6 * mean + 0.25 * (keywords.length > 0 ? 1 : 0) + 0.15 * (service ? 1 : 0));
  if (confidence < MIN_CONFIDENCE) return undefined;

  const fields: Candidate['fields'] = { name: name.trim(), chargeDate: parsed.chargeAt.value };
  if (parsed.priceCents) fields.priceCents = parsed.priceCents.value;
  if (parsed.currency) fields.currency = parsed.currency.value;
  if (parsed.cadence) fields.cadence = parsed.cadence.value;
  if (parsed.cancelUrl) fields.cancelUrl = parsed.cancelUrl.value;

  return {
    key: candidateKey(fields.name, fields.chargeDate),
    messageId: msg.id,
    fields,
    confidence,
    snippet: snippetAround(msg.text, parsed.chargeAt.source),
    signals,
  };
}

/**
 * Scans a message stream incrementally. Pure apart from `onProgress`:
 * no network, `now` is a parameter. Skips candidates matching an existing
 * grave (same service and charge day) and collapses repeated emails for the
 * same trial, keeping the highest confidence (ties keep the earlier email).
 */
export async function scanEmails(
  messages: AsyncIterable<EmailMessage>,
  existing: readonly Grave[],
  now: Date,
  onProgress?: (p: ScanProgress) => void,
): Promise<Candidate[]> {
  const known = new Set(existing.map((g) => candidateKey(g.name, g.chargeAt)));
  const best = new Map<string, Candidate>();
  let read = 0;
  for await (const msg of messages) {
    read++;
    const c = analyzeMessage(msg, now);
    if (c && !known.has(c.key)) {
      const prev = best.get(c.key);
      if (!prev || c.confidence > prev.confidence) best.set(c.key, c);
    }
    onProgress?.({ read, found: best.size });
  }
  return [...best.values()].sort(
    (a, b) =>
      a.fields.chargeDate.localeCompare(b.fields.chargeDate) || a.fields.name.localeCompare(b.fields.name),
  );
}
