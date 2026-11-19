import { format } from 'date-fns'
import type { TrialInput, Grave } from './trial'

export function trialKey(input: Pick<TrialInput, 'name' | 'chargeAt'>) {
  return JSON.stringify([input.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(), format(input.chargeAt, 'yyyy-MM-dd')])
}

export function findDuplicate(graves: readonly Grave[], input: TrialInput, except?: string) {
  const key = trialKey(input)
  return graves.find(grave => grave.id !== except && trialKey(grave) === key)
}
