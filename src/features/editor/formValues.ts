import { CADENCES, DEFAULT_CURRENCY } from '../../domain/trial';
import type { Grave } from '../../domain/trial';
import type { ParseResult } from '../../lib/parse';

/** Raw form strings, validated by `validateTrial` on submit. */
export interface FormValues {
  name: string;
  chargeAt: string;
  price: string;
  currency: string;
  cadence: string;
  cancelUrl: string;
}

export const EMPTY_VALUES: FormValues = {
  name: '',
  chargeAt: '',
  price: '',
  currency: DEFAULT_CURRENCY,
  cadence: 'monthly',
  cancelUrl: '',
};

export function valuesFromGrave(g: Grave): FormValues {
  return {
    name: g.name,
    chargeAt: g.chargeAt.slice(0, 10),
    price: (g.priceCents / 100).toFixed(2),
    currency: g.currency,
    cadence: g.cadence,
    cancelUrl: g.cancelUrl ?? '',
  };
}

/** Only the fields the parser recognized; unknown fields stay untouched in the form. */
export function prefillFromParse(r: ParseResult): Partial<FormValues> {
  const out: Partial<FormValues> = {};
  if (r.name) out.name = r.name.value;
  if (r.priceCents) out.price = (r.priceCents.value / 100).toFixed(2);
  if (r.currency) out.currency = r.currency.value;
  if (r.cadence && (CADENCES as readonly string[]).includes(r.cadence.value)) out.cadence = r.cadence.value;
  if (r.chargeAt) out.chargeAt = r.chargeAt.value.slice(0, 10);
  if (r.cancelUrl) out.cancelUrl = r.cancelUrl.value;
  return out;
}
