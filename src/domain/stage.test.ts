import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbGrave, arbNowMs, arbRemainingMs, graveWith, H } from './arbitraries';
import {
  countdown,
  getStage,
  getViewState,
  MS_PER_DAY,
  remainingMs,
  STAGE_SEVERITY,
  stageForRemaining,
  stageLabel,
  type Stage,
} from './stage';

const STAGES: Stage[] = ['sealed', 'cracked', 'churning', 'zombie', 'overdue'];
const D7 = 604_800_000;
const D3 = 259_200_000;
const H48 = 172_800_000;

/** Grave whose remaining time at `now` is exactly `r` ms. */
const at = (now: number, r: number) => graveWith({ chargeAt: new Date(now + r).toISOString() });
const NOW = Date.UTC(2026, 9, 1);

// Independent oracle: sorted list of [stage, upper bound of R], most urgent first.
const oracle = (r: number): Stage => {
  const bands: Array<[Stage, number]> = [
    ['overdue', 0],
    ['zombie', 2 * 24 * H],
    ['churning', 3 * 24 * H],
    ['cracked', 7 * 24 * H],
  ];
  const hit = bands.find(([, upper]) => r <= upper);
  return hit ? hit[0] : 'sealed';
};

describe('stage boundaries (+-1 ms)', () => {
  it.each([
    [D7 + 1, 'sealed'],
    [D7, 'cracked'],
    [D7 - 1, 'cracked'],
    [D3 + 1, 'cracked'],
    [D3, 'churning'],
    [D3 - 1, 'churning'],
    [H48 + 1, 'churning'],
    [H48, 'zombie'],
    [H48 - 1, 'zombie'],
    [1, 'zombie'],
    [0, 'overdue'],
    [-1, 'overdue'],
  ] as const)('R = %i ms is %s', (r, expected) => {
    expect(getStage(at(NOW, r), new Date(NOW))).toBe(expected);
    expect(stageForRemaining(r)).toBe(expected);
  });

  it('treats an unparseable date as sealed instead of throwing', () => {
    expect(getStage({ chargeAt: 'garbage' }, new Date(NOW))).toBe('sealed');
  });
});

describe('stage properties', () => {
  it('P-S1 total and exhaustive', () => {
    fc.assert(
      fc.property(arbNowMs, arbRemainingMs, (now, r) => {
        const stage = getStage(at(now, r), new Date(now));
        expect(STAGES).toContain(stage);
      }),
    );
    fc.assert(
      fc.property(fc.string(), arbNowMs, (chargeAt, now) => {
        expect(STAGES).toContain(getStage({ chargeAt }, new Date(now)));
      }),
    );
  });

  it('P-S2 boundary exactness', () => {
    fc.assert(
      fc.property(arbNowMs, (now) => {
        const s = (r: number) => getStage(at(now, r), new Date(now));
        expect([s(D7), s(D7 + 1)]).toEqual(['cracked', 'sealed']);
        expect([s(D3), s(D3 + 1)]).toEqual(['churning', 'cracked']);
        expect([s(H48), s(H48 + 1)]).toEqual(['zombie', 'churning']);
        expect([s(0), s(1)]).toEqual(['overdue', 'zombie']);
      }),
    );
  });

  it('P-S3 monotonic in remaining time', () => {
    fc.assert(
      fc.property(arbRemainingMs, arbRemainingMs, (a, b) => {
        const [r1, r2] = a <= b ? [a, b] : [b, a];
        expect(STAGE_SEVERITY[stageForRemaining(r1)]).toBeGreaterThanOrEqual(
          STAGE_SEVERITY[stageForRemaining(r2)],
        );
      }),
    );
  });

  it('P-S4 time only moves forward', () => {
    fc.assert(
      fc.property(arbNowMs, fc.integer({ min: 0, max: 20 * 24 * H }), arbRemainingMs, (now1, delta, r) => {
        const grave = at(now1, r);
        const s1 = getStage(grave, new Date(now1));
        const s2 = getStage(grave, new Date(now1 + delta));
        expect(STAGE_SEVERITY[s2]).toBeGreaterThanOrEqual(STAGE_SEVERITY[s1]);
      }),
    );
  });

  it('P-S5 translation invariance, including across DST changes', () => {
    const dstDates = [Date.UTC(2026, 2, 8, 10), Date.UTC(2026, 10, 1, 9), Date.UTC(2026, 2, 29, 1)];
    fc.assert(
      fc.property(
        fc.constantFrom(...dstDates),
        fc.integer({ min: -400 * 24 * H, max: 400 * 24 * H }),
        arbRemainingMs,
        (base, shift, r) => {
          const a = getStage(at(base, r), new Date(base));
          const b = getStage(at(base + shift, r), new Date(base + shift));
          expect(b).toBe(a);
        },
      ),
    );
  });

  it('P-S6 status gating', () => {
    fc.assert(
      fc.property(arbGrave, arbNowMs, (grave, now) => {
        const view = getViewState(grave, new Date(now));
        if (grave.status === 'cancelled') expect(view.kind).toBe('tombstone');
        else if (grave.status === 'kept') expect(view.kind).toBe('ghost');
        else expect(view.kind).toBe('grave');
      }),
    );
  });

  it('P-S7 agrees with the oracle', () => {
    fc.assert(
      fc.property(arbNowMs, arbRemainingMs, (now, r) => {
        expect(getStage(at(now, r), new Date(now))).toBe(oracle(r));
      }),
    );
  });

  it('P-S8 countdown text', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 * 24 * H }), (r) => {
        const c = countdown(r);
        expect(c).toBeDefined();
        if (!c) return;
        const unitMs = c.unit === 'hours' ? H : MS_PER_DAY;
        expect(c.value).toBe(Math.ceil(r / unitMs));
        expect(c.value).toBeGreaterThanOrEqual(1);
        expect(c.text).toContain(String(c.value));
      }),
    );
  });
});

describe('countdown and labels', () => {
  it('uses hours up to 72h and days beyond', () => {
    expect(countdown(1)).toMatchObject({ unit: 'hours', value: 1, text: 'charges in 1 hour' });
    expect(countdown(5 * H - 1)).toMatchObject({ value: 5, text: 'charges in 5 hours' });
    expect(countdown(72 * H)).toMatchObject({ unit: 'hours', value: 72 });
    expect(countdown(72 * H + 1)).toMatchObject({ unit: 'days', value: 4, text: 'charges in 4 days' });
    expect(countdown(25 * MS_PER_DAY)).toMatchObject({ unit: 'days', value: 25 });
  });

  it('has no countdown once the charge time has passed or is invalid', () => {
    expect(countdown(0)).toBeUndefined();
    expect(countdown(-5)).toBeUndefined();
    expect(countdown(NaN)).toBeUndefined();
  });

  it('builds stage labels', () => {
    expect(stageLabel('zombie', 4.5 * H)).toBe('Zombie, charges in 5 hours');
    expect(stageLabel('overdue', -1)).toBe('Overdue, charge date has passed');
  });
});

describe('getViewState', () => {
  const now = new Date(NOW);

  it('returns grave state with remaining time for active graves', () => {
    const grave = at(NOW, 5 * H);
    expect(remainingMs(grave, now)).toBe(5 * H);
    expect(getViewState(grave, now)).toEqual({ kind: 'grave', stage: 'zombie', remainingMs: 5 * H });
  });

  it('returns a tombstone with epitaph for cancelled graves', () => {
    const grave = graveWith({ name: 'Audible', priceCents: 1495, status: 'cancelled' });
    expect(getViewState(grave, now)).toEqual({
      kind: 'tombstone',
      epitaph: 'Here lies Audible. Saved you $14.95/mo.',
      savedCents: 1495,
    });
  });

  it('returns a ghost with monthly cost for kept graves', () => {
    const grave = graveWith({ priceCents: 12000, cadence: 'yearly', status: 'kept' });
    expect(getViewState(grave, now)).toEqual({ kind: 'ghost', monthlyCents: 1000 });
  });
});
