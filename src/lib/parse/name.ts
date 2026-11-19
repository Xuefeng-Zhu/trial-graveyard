import type { Field } from './types';

const WELCOME = /\bwelcome\s+to\s+([^.,;!:?]{1,40})/gi;
const YOUR = /\byour\s+([^.,;!:?]{1,40}?)\s+(?:free\s+)?(?:trial|subscription|membership)\b/gi;
const CAPITALIZED = /^[A-Z][\w&+'’.-]*$/;
const MAX_WORDS = 4;
/** Words that start the next sentence or describe the offer, never part of a brand name. */
const STOP_WORDS = new Set(
  ['your', 'you', 'free', 'trial', 'subscription', 'membership', 'has', 'is', 'are', 'was', 'the', 'a', 'an', 'and', 'to', 'thanks', 'thank', 'enjoy', 'start', 'started'],
);
const ARTICLES = new Set(['the', 'a', 'an']);
const isStopWord = (w: string): boolean => STOP_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ''));
const MAX_TRIES = 50;

function leadingCapitalized(segment: string): string | undefined {
  const words: string[] = [];
  for (const w of segment.split(' ')) {
    // A leading article is part of the brand ("The New York Times"); elsewhere it ends the name.
    const leadingArticle = words.length === 0 && ARTICLES.has(w.toLowerCase());
    if (words.length >= MAX_WORDS || !CAPITALIZED.test(w) || (isStopWord(w) && !leadingArticle)) break;
    words.push(w);
  }
  return words.length > 0 ? words.join(' ') : undefined;
}

function trailingCapitalized(segment: string): string | undefined {
  const words: string[] = [];
  const all = segment.split(' ');
  for (let i = all.length - 1; i >= 0 && words.length < MAX_WORDS; i--) {
    const w = all[i] ?? '';
    if (!CAPITALIZED.test(w)) break;
    words.unshift(w);
  }
  return words.length > 0 ? words.join(' ') : undefined;
}

function firstName(
  text: string,
  re: RegExp,
  pick: (segment: string) => string | undefined,
): string | undefined {
  let tries = 0;
  for (const m of text.matchAll(re)) {
    if (tries++ >= MAX_TRIES) break;
    const name = pick(m[1] ?? '');
    if (name !== undefined) return name;
  }
  return undefined;
}

function domainName(url: string): Field<string> | undefined {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return undefined;
  }
  const parts = host.replace(/^www\./, '').split('.');
  let label = parts[parts.length - 2] ?? '';
  if ((label === 'co' || label === 'com') && parts.length >= 3) label = parts[parts.length - 3] ?? '';
  if (label === '') return undefined;
  return { value: label.charAt(0).toUpperCase() + label.slice(1), confidence: 0.4, source: host };
}

/** `text` must already have URLs removed; `urls` supplies the domain fallback. */
export function extractName(text: string, urls: string[]): Field<string> | undefined {
  const your = firstName(text, YOUR, trailingCapitalized);
  if (your) return { value: your, confidence: 0.8, source: your };
  const welcome = firstName(text, WELCOME, leadingCapitalized);
  if (welcome) return { value: welcome, confidence: 0.8, source: welcome };
  const first = urls[0];
  return first === undefined ? undefined : domainName(first);
}
