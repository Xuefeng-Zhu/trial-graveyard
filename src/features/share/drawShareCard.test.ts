import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARD_HEIGHT, CARD_WIDTH, CanvasUnavailableError, SHARE_HASHTAG, drawShareCard } from './drawShareCard';

function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn((text: string) => calls.push(text)),
  } as Record<string, unknown>;
  return { ctx, calls };
}

afterEach(() => vi.restoreAllMocks());

describe('drawShareCard', () => {
  it('draws totals and the hashtag and resolves with a PNG blob', async () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const blob = new Blob(['x'], { type: 'image/png' });
    let size = [0, 0];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
      size = [this.width, this.height];
      cb(blob);
    });
    const out = await drawShareCard({ totals: [{ currency: 'USD', cents: 1495 }], slain: 1 });
    expect(out).toBe(blob);
    expect(size).toEqual([CARD_WIDTH, CARD_HEIGHT]);
    expect(calls).toContain('$14.95');
    expect(calls).toContain('1 soul saved from charges');
    expect(calls).toContain(SHARE_HASHTAG);
  });

  it('pluralises and shows zero when there are no totals', async () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob()));
    await drawShareCard({ totals: [], slain: 0 });
    expect(calls).toContain('$0.00');
    expect(calls).toContain('0 souls saved from charges');
  });

  it('keeps seven currencies on the canvas and clear of the hashtag', async () => {
    const ys: Record<string, number> = {};
    const { ctx } = fakeContext();
    ctx.fillText = vi.fn((text: string, _x: number, y: number) => {
      ys[text] = y;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob()));
    const codes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
    await drawShareCard({ totals: codes.map((currency, i) => ({ currency, cents: 100 * (i + 1) })), slain: 7 });
    expect(ys['+3 more']).toBeDefined();
    const souls = ys['7 souls saved from charges'];
    expect(souls ?? 0).toBeLessThan((ys[SHARE_HASHTAG] ?? 0) - 48);
    for (const y of Object.values(ys)) expect(y).toBeLessThan(CARD_HEIGHT);
  });

  it('rejects when the context is missing', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(drawShareCard({ totals: [], slain: 0 })).rejects.toBeInstanceOf(CanvasUnavailableError);
  });

  it('rejects when encoding fails', async () => {
    const { ctx } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(null));
    await expect(drawShareCard({ totals: [], slain: 0 })).rejects.toThrow('encode');
  });
});
