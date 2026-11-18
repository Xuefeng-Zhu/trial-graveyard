export type Cadence = 'one-time' | 'weekly' | 'monthly' | 'yearly';
export type Status = 'active' | 'cancelled' | 'kept';

export const CADENCES: readonly Cadence[] = ['one-time', 'weekly', 'monthly', 'yearly'];

export interface Grave {
  id: string;
  name: string;
  /** ISO 8601 with local offset, e.g. 2026-10-31T09:00:00-07:00 */
  chargeAt: string;
  /** Integer minor units, >= 0 */
  priceCents: number;
  /** ISO 4217 code */
  currency: string;
  cadence: Cadence;
  cancelUrl?: string;
  status: Status;
  cancelledAt?: string;
  keptAt?: string;
  createdAt: string;
}

/** Raw values as they come from a form. */
export interface TrialInput {
  name: string;
  /** `YYYY-MM-DD` (defaults to 09:00 local) or a full ISO 8601 string */
  chargeAt: string;
  /** Price in major units (e.g. 14.95), as a number or numeric string */
  price: number | string;
  cadence: string;
  cancelUrl?: string;
  currency?: string;
}

export type TrialField = 'name' | 'chargeAt' | 'price' | 'cadence' | 'cancelUrl' | 'currency';
export type TrialErrors = Partial<Record<TrialField, string>>;

export interface ValidTrial {
  name: string;
  chargeAt: string;
  priceCents: number;
  currency: string;
  cadence: Cadence;
  cancelUrl?: string;
}

export type ValidationResult =
  | { ok: true; value: ValidTrial }
  | { ok: false; errors: TrialErrors };

export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_CHARGE_HOUR = 9;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** Formats the offset of `date` as `+hh:mm` / `-hh:mm`, using the date's local timezone. */
function localOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Formats a Date as ISO 8601 in the local timezone, e.g. 2026-10-31T09:00:00-07:00. */
export function toLocalIso(date: Date): string {
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    localOffset(date)
  );
}

/**
 * Normalizes a form date. A date-only value becomes 09:00 local on that day.
 * Returns undefined when the value is not a real date.
 */
export function normalizeChargeAt(value: string): string | undefined {
  const trimmed = value.trim();
  const dateOnly = DATE_ONLY.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day, DEFAULT_CHARGE_HOUR, 0, 0, 0);
    // Reject rollovers such as 2026-02-31.
    const real =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return real ? toLocalIso(date) : undefined;
  }
  if (ISO_DATETIME.test(trimmed) && !Number.isNaN(Date.parse(trimmed))) {
    return trimmed;
  }
  return undefined;
}

/** Accepts only absolute http: and https: URLs. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Converts a major-unit price to integer cents. Returns undefined for negative or non-numeric values. */
export function parsePriceToCents(price: number | string): number | undefined {
  if (typeof price === 'string' && price.trim() === '') return undefined;
  const n = typeof price === 'string' ? Number(price.trim()) : price;
  if (!Number.isFinite(n) || n < 0) return undefined;
  const cents = Math.round(n * 100);
  return Number.isSafeInteger(cents) ? cents : undefined;
}

export function isCadence(value: string): value is Cadence {
  return (CADENCES as readonly string[]).includes(value);
}

export function validateTrial(input: TrialInput): ValidationResult {
  const errors: TrialErrors = {};

  const name = input.name.trim();
  if (name === '') errors.name = 'Every grave needs a name.';

  const chargeAt = normalizeChargeAt(input.chargeAt);
  if (chargeAt === undefined) errors.chargeAt = 'That date is not on any calendar I know.';

  const priceCents = parsePriceToCents(input.price);
  if (priceCents === undefined) errors.price = 'Enter a price of 0 or more.';

  const cadence = input.cadence;
  if (!isCadence(cadence)) errors.cadence = 'Pick one-time, weekly, monthly or yearly.';

  const currency = (input.currency ?? DEFAULT_CURRENCY).trim().toUpperCase();
  if (!CURRENCY_CODE.test(currency)) errors.currency = 'Use a 3-letter currency code like USD.';

  const cancelUrl = input.cancelUrl?.trim() ?? '';
  if (cancelUrl !== '' && !isHttpUrl(cancelUrl)) {
    errors.cancelUrl = 'Cancel links must start with http:// or https://.';
  }

  if (
    Object.keys(errors).length > 0 ||
    chargeAt === undefined ||
    priceCents === undefined ||
    !isCadence(cadence)
  ) {
    return { ok: false, errors };
  }

  const value: ValidTrial = { name, chargeAt, priceCents, currency, cadence };
  if (cancelUrl !== '') value.cancelUrl = cancelUrl;
  return { ok: true, value };
}

/** Builds an active grave. `id` and `now` are parameters so the factory stays deterministic. */
export function createGrave(trial: ValidTrial, id: string, now: Date): Grave {
  return { ...trial, id, status: 'active', createdAt: toLocalIso(now) };
}
