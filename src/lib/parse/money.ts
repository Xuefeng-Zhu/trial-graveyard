import type { Field } from './types';

const CODES = 'USD|EUR|GBP|CAD|AUD|JPY|CHF|INR|NZD|SEK|NOK|DKK|MXN|BRL';
// Bounded quantifiers only: no nested unbounded repetition.
const AMT = String.raw`\d{1,3}(?:[.,]\d{3}){1,3}(?:[.,]\d{1,2})?|\d{1,9}(?:[.,]\d{1,2})?`;

const PREFIX = new RegExp(`(?:\\b(${CODES})\\s?|([$€£])\\s?)(${AMT})`, 'gi');
const SUFFIX = new RegExp(`(?<![\\d.,])(${AMT})\\s?(?:(${CODES})\\b|([€£]))`, 'gi');

const SYMBOLS: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP' };
const CHARGE_WORDS = /\b(?:then|charged?|billed?|renews?|after|starting|first)\b/i;
const MAX_MATCHES = 200;

interface MoneyMatch {
  cents: number;
  currency: string;
  source: string;
  index: number;
}

/** Converts "1,234.56", "1.234,56", "9.5" or "15" to integer cents. */
export function parseAmount(raw: string): number {
  const lastSep = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
  let intPart = raw;
  let frac = '';
  if (lastSep >= 0 && raw.length - lastSep - 1 <= 2) {
    intPart = raw.slice(0, lastSep);
    frac = raw.slice(lastSep + 1);
  }
  const whole = Number(intPart.replace(/[.,]/g, ''));
  return whole * 100 + Number(frac.padEnd(2, '0'));
}

function collect(text: string): MoneyMatch[] {
  const found: MoneyMatch[] = [];
  let count = 0;
  for (const m of text.matchAll(PREFIX)) {
    if (count++ >= MAX_MATCHES) break;
    const currency = m[1] ? m[1].toUpperCase() : (SYMBOLS[m[2] ?? ''] ?? 'USD');
    found.push({ cents: parseAmount(m[3] ?? '0'), currency, source: m[0], index: m.index ?? 0 });
  }
  count = 0;
  for (const m of text.matchAll(SUFFIX)) {
    if (count++ >= MAX_MATCHES) break;
    const currency = m[2] ? m[2].toUpperCase() : (SYMBOLS[m[3] ?? ''] ?? 'USD');
    found.push({ cents: parseAmount(m[1] ?? '0'), currency, source: m[0], index: m.index ?? 0 });
  }
  return found.sort((a, b) => a.index - b.index);
}

export interface MoneyFields {
  priceCents: Field<number>;
  currency: Field<string>;
}

/** Prefers an amount that follows a charge word ("then $9.99"), else the first amount. */
export function extractMoney(text: string): MoneyFields | undefined {
  const matches = collect(text);
  const first = matches[0];
  if (!first) return undefined;
  const charged = matches.find((m) => CHARGE_WORDS.test(text.slice(Math.max(0, m.index - 40), m.index)));
  const pick = charged ?? first;
  const confidence = charged ? 0.9 : 0.6;
  return {
    priceCents: { value: pick.cents, confidence, source: pick.source },
    currency: { value: pick.currency, confidence, source: pick.source },
  };
}
