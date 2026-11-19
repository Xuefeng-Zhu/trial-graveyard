import { format, formatISO, isValid, parseISO } from 'date-fns'
import type { Grave, TrialInput } from '../../domain/trial'
import type { ParseResult } from '../../lib/parse'

export interface FormValues { name: string; chargeAt: string; priceCents: string; currency: string; cadence: TrialInput['cadence']; cancelUrl: string }
export const emptyValues: FormValues = { name: '', chargeAt: '', priceCents: '', currency: 'USD', cadence: 'monthly', cancelUrl: '' }

export function fromGrave(grave: Grave): FormValues {
  return { ...grave, chargeAt: format(grave.chargeAt, 'yyyy-MM-dd'), priceCents: (grave.priceCents / 100).toFixed(2), cancelUrl: grave.cancelUrl ?? '' }
}

export function mergeParsed(form: FormValues, parsed: ParseResult): FormValues {
  return {
    name: parsed.name?.value ?? form.name,
    chargeAt: parsed.chargeAt ? format(parsed.chargeAt.value, 'yyyy-MM-dd') : form.chargeAt,
    priceCents: parsed.priceCents ? (parsed.priceCents.value / 100).toFixed(2) : form.priceCents,
    currency: parsed.currency?.value ?? form.currency,
    cadence: parsed.cadence?.value ?? form.cadence,
    cancelUrl: parsed.cancelUrl?.value ?? form.cancelUrl,
  }
}

export function formToTrial(form: FormValues, previous?: Grave): TrialInput {
  const date = parseISO(`${form.chargeAt}T09:00:00`)
  const [whole, fractional = ''] = form.priceCents.trim().replace(',', '.').split('.')
  const validPrice = /^\d+(?:[.,]\d{1,2})?$/.test(form.priceCents.trim())
  return {
    name: form.name.trim(),
    chargeAt: previous && form.chargeAt === format(previous.chargeAt, 'yyyy-MM-dd')
      ? previous.chargeAt : isValid(date) ? formatISO(date) : '',
    priceCents: validPrice ? Number(whole) * 100 + Number(fractional.padEnd(2, '0')) : NaN,
    currency: form.currency.trim().toUpperCase(),
    cadence: form.cadence,
    cancelUrl: form.cancelUrl.trim() || undefined,
  }
}
