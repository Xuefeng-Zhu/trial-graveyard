import { formatISO, isValid, parseISO } from 'date-fns'

export const cadences = ['one-time', 'weekly', 'monthly', 'yearly'] as const
export type Cadence = typeof cadences[number]
export type Status = 'active' | 'cancelled' | 'kept'

export interface TrialInput {
  name: string
  chargeAt: string
  priceCents: number
  currency: string
  cadence: Cadence
  cancelUrl?: string
}

export interface Grave extends TrialInput {
  id: string
  status: Status
  createdAt: string
  cancelledAt?: string
  keptAt?: string
}

export function validIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && isValid(parseISO(value))
}

export function validUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}

export function validateTrial(input: TrialInput) {
  const errors: Partial<Record<keyof TrialInput, string>> = {}
  if (!input.name.trim()) errors.name = 'Give this grave a service name.'
  if (!validIso(input.chargeAt)) errors.chargeAt = 'Enter a valid charge date.'
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 999_999_999_999) {
    errors.priceCents = 'Enter a price from 0 to 9,999,999,999.99.'
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) errors.currency = 'Use a three-letter currency code.'
  if (!cadences.includes(input.cadence)) errors.cadence = 'Choose a billing cadence.'
  if (input.cancelUrl && !validUrl(input.cancelUrl)) errors.cancelUrl = 'Enter an HTTP or HTTPS link.'
  return errors
}

export function trialFields({ name, chargeAt, priceCents, currency, cadence, cancelUrl }: TrialInput): TrialInput {
  return { name: name.trim(), chargeAt, priceCents, currency, cadence, ...(cancelUrl === undefined ? {} : { cancelUrl }) }
}

export function createGrave(input: TrialInput, now: Date, id = crypto.randomUUID() as string): Grave {
  return { ...trialFields(input), id, status: 'active', createdAt: formatISO(now) }
}
