import { isHttpUrl } from '../../domain/trial';
import type { Field } from './types';

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const PREFERRED = /cancel|manage|account|subscription|billing/i;
const TRAILING = '.,;:!?';
const MAX_URLS = 100;

export function findUrls(text: string): string[] {
  const urls: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    if (urls.length >= MAX_URLS) break;
    let url = m[0];
    // Manual loop: a `[.,]+$` regex is quadratic on long runs of dots.
    let end = url.length;
    while (end > 0 && TRAILING.includes(url.charAt(end - 1))) end--;
    url = url.slice(0, end);
    if (isHttpUrl(url)) urls.push(url);
  }
  return urls;
}

export function stripUrls(text: string): string {
  return text.replace(URL_RE, ' ');
}

export function extractCancelUrl(urls: string[]): Field<string> | undefined {
  const preferred = urls.find((u) => PREFERRED.test(u));
  const url = preferred ?? urls[0];
  if (url === undefined) return undefined;
  return { value: url, confidence: preferred ? 0.8 : 0.3, source: url };
}
