import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { H, arbGrave, arbRemainingMs, graveWith } from './arbitraries';
import { motionFor } from './motion';
import { CRACK_ORANGE, CRITICAL_RED, pixelStateFor } from './pixelState';
import type { PixelKind } from './pixelState';
import { getStage, getViewState, STAGE_SEVERITY } from './stage';

const NOW = new Date('2026-10-30T09:00:00.000Z');
const at = (offsetMs: number) => graveWith({ chargeAt: new Date(NOW.getTime() + offsetMs).toISOString() });

describe('pixelStateFor examples', () => {
  it('is normal with no decoration beyond 72 hours', () => {
    for (const h of [200, 100, 73]) {
      expect(pixelStateFor(at(h * H), NOW)).toEqual({
        kind: 'normal',
        badge: undefined,
        sparks: false,
        cracks: undefined,
        zombieHand: false,
        urgent: false,
      });
    }
  });

  it('is warning at 72 hours with orange cracks, sparks and a badge', () => {
    expect(pixelStateFor(at(72 * H), NOW)).toEqual({
      kind: 'warning',
      badge: '72h left',
      sparks: true,
      cracks: CRACK_ORANGE,
      zombieHand: false,
      urgent: false,
    });
    expect(pixelStateFor(at(49 * H), NOW).kind).toBe('warning');
  });

  it('is critical at 48 hours with red cracks and a zombie hand', () => {
    expect(pixelStateFor(at(48 * H), NOW)).toEqual({
      kind: 'critical',
      badge: '48h left',
      sparks: false,
      cracks: CRITICAL_RED,
      zombieHand: true,
      urgent: true,
    });
  });

  it('is critical and says Overdue once the charge time has passed', () => {
    expect(pixelStateFor(at(0), NOW).badge).toBe('Overdue');
    expect(pixelStateFor(at(-5 * H), NOW).badge).toBe('Overdue');
  });

  it('labels cancelled and kept graves', () => {
    expect(pixelStateFor(graveWith({ status: 'cancelled' }), NOW)).toMatchObject({
      kind: 'cancelled',
      badge: 'Cancelled',
      cracks: undefined,
    });
    expect(pixelStateFor(graveWith({ status: 'kept' }), NOW)).toMatchObject({ kind: 'kept', badge: 'Kept' });
  });
});

const SEVERITY: Record<PixelKind, number> = { normal: 0, warning: 1, critical: 2, cancelled: -1, kept: -1 };

describe('pixelStateFor properties', () => {
  it('is monotonic: less remaining time is never less urgent', () => {
    fc.assert(
      fc.property(arbRemainingMs, arbRemainingMs, (a, b) => {
        const [near, far] = a <= b ? [a, b] : [b, a];
        expect(SEVERITY[pixelStateFor(at(near), NOW).kind]).toBeGreaterThanOrEqual(
          SEVERITY[pixelStateFor(at(far), NOW).kind],
        );
      }),
    );
  });

  it('agrees with getStage and motionFor', () => {
    fc.assert(
      fc.property(arbRemainingMs, (r) => {
        const g = at(r);
        const p = pixelStateFor(g, NOW);
        const stage = getStage(g, NOW);
        const motion = motionFor(getViewState(g, NOW));
        expect(p.kind === 'critical').toBe(STAGE_SEVERITY[stage] >= STAGE_SEVERITY.zombie);
        expect(p.kind === 'warning').toBe(stage === 'churning');
        expect(p.cracks !== undefined).toBe(p.kind !== 'normal' && motion.cracks);
        expect(p.sparks).toBe(p.kind === 'warning' && motion.glow);
        expect(p.zombieHand).toBe(p.kind === 'critical');
        expect(p.badge === undefined).toBe(p.kind === 'normal');
      }),
    );
  });

  it('only active graves can be warning or critical', () => {
    fc.assert(
      fc.property(arbGrave, (g) => {
        const kind = pixelStateFor(g, NOW).kind;
        if (g.status === 'cancelled') expect(kind).toBe('cancelled');
        if (g.status === 'kept') expect(kind).toBe('kept');
      }),
    );
  });
});
