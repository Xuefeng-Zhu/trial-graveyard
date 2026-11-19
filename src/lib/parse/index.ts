import { extractCadence } from './cadence';
import { extractDate } from './date';
import { extractMoney } from './money';
import { extractName } from './name';
import { extractCancelUrl, findUrls, stripUrls } from './url';
import type { ParseResult } from './types';

export type { Field, ParseResult } from './types';

/** Input beyond this many characters is ignored (P-P9). */
export const MAX_INPUT_CHARS = 50 * 1024;

export function normalizeText(text: string): string {
  return text.slice(0, MAX_INPUT_CHARS).normalize('NFKC').slice(0, MAX_INPUT_CHARS).replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic, offline receipt parser. Pure: `refDate` resolves year-less dates.
 * Dates like 10/31/2026 are read in US order (month first).
 */
export function parseReceipt(text: string, refDate: Date): ParseResult {
  const normalized = normalizeText(text);
  if (!/\d/.test(normalized)) return {};

  const urls = findUrls(normalized);
  const body = stripUrls(normalized);
  const result: ParseResult = {};

  const name = extractName(body, urls);
  if (name) result.name = name;
  const money = extractMoney(body);
  if (money) {
    result.priceCents = money.priceCents;
    result.currency = money.currency;
  }
  const cadence = extractCadence(body);
  if (cadence) result.cadence = cadence;
  const chargeAt = extractDate(body, refDate);
  if (chargeAt) result.chargeAt = chargeAt;
  const cancelUrl = extractCancelUrl(urls);
  if (cancelUrl) result.cancelUrl = cancelUrl;
  return result;
}

export const LLM_FALLBACK_MIN_FIELDS = 3;

export interface FallbackOptions {
  /** Settings flag, off by default. */
  llmFallback?: boolean;
}

/**
 * Runs the deterministic parser and, only when the flag is on and fewer than
 * 3 fields were found, lazily loads the LLM fallback to fill gaps.
 */
export async function parseReceiptWithFallback(
  text: string,
  refDate: Date,
  options: FallbackOptions = {},
): Promise<ParseResult> {
  const result = parseReceipt(text, refDate);
  if (!options.llmFallback || Object.keys(result).length >= LLM_FALLBACK_MIN_FIELDS) return result;
  const { llmParse } = await import('./llmFallback');
  return { ...(await llmParse(normalizeText(text))), ...result };
}
