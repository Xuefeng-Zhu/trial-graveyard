import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGrave, graveWith } from './arbitraries';
import { findDuplicate } from './dedupe';

const existing = graveWith({ id: 'a', name: 'Phantomflix', chargeAt: '2026-10-31T09:00:00-07:00' });

describe('findDuplicate', () => {
  it('matches name case-insensitively on the same charge date', () => {
    expect(findDuplicate([existing], { name: '  phantomFLIX ', chargeAt: '2026-10-31T18:30:00-07:00' })).toBe(existing);
  });
  it('does not match a different date or name', () => {
    expect(findDuplicate([existing], { name: 'Phantomflix', chargeAt: '2026-11-30T09:00:00-07:00' })).toBeUndefined();
    expect(findDuplicate([existing], { name: 'Wraithwave', chargeAt: existing.chargeAt })).toBeUndefined();
  });
  it('ignores the grave being edited', () => {
    expect(findDuplicate([existing], existing, 'a')).toBeUndefined();
  });
  it('always finds a grave that is already in the list', () => {
    fc.assert(
      fc.property(fc.array(arbGrave, { maxLength: 8 }), arbGrave, (graves, g) => {
        expect(findDuplicate([...graves, g], g)).toBeDefined();
      }),
    );
  });
});
