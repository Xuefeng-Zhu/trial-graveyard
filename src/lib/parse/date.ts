import { normalizeChargeAt } from '../../domain/trial';
import type { Field } from './types';

const M =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORD = '(?:st|nd|rd|th)?';
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/gi;
const MDY = new RegExp(`\\b(${M})\\.?\\s+(\\d{1,2})${ORD},?\\s+(\\d{4})\\b`, 'gi');
const DMY = new RegExp(`\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?(${M})\\.?,?\\s+(\\d{4})\\b`, 'gi');
/** US order: month/day/year. */
const US = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/gi;
const MD = new RegExp(`\\b(${M})\\.?\\s+(\\d{1,2})${ORD}\\b(?!,?\\s*\\d{4}\\b)`, 'gi');
const DM = new RegExp(`\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?(${M})\\b(?!\\.?,?\\s*\\d{4}\\b)`, 'gi');

const LABEL =
  /(?:trial\s+(?:ends?|expires?)|(?:ends?|expires?)\s+on|first\s+charge(?:\s+on)?|will\s+be\s+charged|renews?\s+on|(?:next\s+)?billing\s+date|charged\s+on)[^0-9a-z]{0,20}(?:[a-z]+\s+){0,3}$/i;
const LABEL_WINDOW = 60;
const MAX_MATCHES = 200;

interface DateMatch {
  /** `YYYY-MM-DD`, or undefined when the year must be inferred. */
  year?: number;
  month: number;
  day: number;
  index: number;
  source: string;
}

function monthIndex(name: string): number {
  return MONTH_NAMES.indexOf(name.slice(0, 3).toLowerCase());
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (year < 1000) return false;
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

function collect(text: string): DateMatch[] {
  const out: DateMatch[] = [];
  const add = (re: RegExp, build: (m: RegExpExecArray) => Omit<DateMatch, 'index' | 'source'>): void => {
    let count = 0;
    for (const m of text.matchAll(re)) {
      if (count++ >= MAX_MATCHES) break;
      out.push({ ...build(m as RegExpExecArray), index: m.index ?? 0, source: m[0] });
    }
  };
  const n = (s: string | undefined): number => Number(s);
  add(ISO, (m) => ({ year: n(m[1]), month: n(m[2]) - 1, day: n(m[3]) }));
  add(MDY, (m) => ({ year: n(m[3]), month: monthIndex(m[1] ?? ''), day: n(m[2]) }));
  add(DMY, (m) => ({ year: n(m[3]), month: monthIndex(m[2] ?? ''), day: n(m[1]) }));
  add(US, (m) => ({ year: n(m[3]), month: n(m[1]) - 1, day: n(m[2]) }));
  add(MD, (m) => ({ month: monthIndex(m[1] ?? ''), day: n(m[2]) }));
  add(DM, (m) => ({ month: monthIndex(m[2] ?? ''), day: n(m[1]) }));
  return out.sort((a, b) => a.index - b.index);
}

/** Next occurrence of month/day on or after `refDate`'s calendar day. */
function inferYear(month: number, day: number, refDate: Date): number | undefined {
  const start = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
  for (let year = refDate.getFullYear(); year <= refDate.getFullYear() + 8; year++) {
    if (isRealDate(year, month, day) && new Date(year, month, day).getTime() >= start) return year;
  }
  return undefined;
}

const pad = (v: number, w = 2): string => String(v).padStart(w, '0');

/** Labelled dates ("trial ends ...") win over bare dates. */
export function extractDate(text: string, refDate: Date): Field<string> | undefined {
  let bare: Field<string> | undefined;
  for (const m of collect(text)) {
    const year = m.year ?? inferYear(m.month, m.day, refDate);
    if (year === undefined || !isRealDate(year, m.month, m.day)) continue;
    const chargeAt = normalizeChargeAt(`${pad(year, 4)}-${pad(m.month + 1)}-${pad(m.day)}`);
    if (chargeAt === undefined) continue;
    const labelled = LABEL.test(text.slice(Math.max(0, m.index - LABEL_WINDOW), m.index));
    const penalty = m.year === undefined ? 0.1 : 0;
    if (labelled) return { value: chargeAt, confidence: 0.9 - penalty, source: m.source };
    bare ??= { value: chargeAt, confidence: 0.6 - penalty, source: m.source };
  }
  return bare;
}
