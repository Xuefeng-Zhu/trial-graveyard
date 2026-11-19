import { expect, it } from 'vitest'
import { trial } from './arbitraries'
import { findDuplicate, trialKey } from './duplicates'

it('matches names case-insensitively by calendar date and skips the edited record', () => {
  const original = trial()
  const duplicate = trial({ id: 'new', name: '  phantomFLIX ', chargeAt: '2026-11-21T09:00:00Z' })
  expect(trialKey(original)).toBe(trialKey(duplicate))
  expect(findDuplicate([original], duplicate)).toBe(original)
  expect(findDuplicate([original], duplicate, original.id)).toBeUndefined()
  expect(findDuplicate([original], trial({ chargeAt: '2026-11-22T09:00:00Z' }))).toBeUndefined()
})
