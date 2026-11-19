import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { createFakeEngine } from './fake';
import { normaliseOcrText } from './normalise';
import { MAX_EDGE, fitWithin, preprocessImage, toGrayscale } from './preprocess';
import { confidenceHint, interpretText, readImageReceipt } from './read';

const NOW = new Date('2026-10-20T12:00:00Z');
const DISNEY =
  'Welcome to Disney+\nYour free trial has started.\nYour trial ends on November 15.\nAfter that you will be charged $13.99/month.\nhttps://www.disneyplus.com/account';

describe('fitWithin', () => {
  it('downscales the long edge to 1600 and keeps the aspect ratio', () => {
    expect(fitWithin(3200, 1600)).toEqual({ width: MAX_EDGE, height: 800 });
    expect(fitWithin(1000, 4000)).toEqual({ width: 400, height: MAX_EDGE });
  });
  it('never upscales', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 10)).toEqual({ width: 1600, height: 10 });
  });
  it('never returns a zero edge', () => {
    expect(fitWithin(100000, 1).height).toBe(1);
  });
});

describe('toGrayscale', () => {
  it('sets equal channels and keeps alpha', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 200, 0, 255, 0, 255, 10, 20, 30, 0]);
    toGrayscale(px);
    expect([...px.slice(0, 4)]).toEqual([76, 76, 76, 200]);
    expect([...px.slice(4, 8)]).toEqual([150, 150, 150, 255]);
    expect(px[8]).toBe(px[9]);
    expect(px[9]).toBe(px[10]);
    expect(px[11]).toBe(0);
  });
});

describe('preprocessImage', () => {
  it('draws at the fitted size and grayscales', async () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    const ctx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data })),
      putImageData: vi.fn(),
    };
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3200, height: 1600, close })));
    const canvas = await preprocessImage(new Blob(['x'], { type: 'image/png' }));
    expect([canvas.width, canvas.height]).toEqual([1600, 800]);
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800);
    expect([...data]).toEqual([76, 76, 76, 255]);
    expect(close).toHaveBeenCalled();
    spy.mockRestore();
    vi.unstubAllGlobals();
  });
  it('throws when there is no canvas context', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 10, height: 10 })));
    await expect(preprocessImage(new Blob(['x']))).rejects.toThrow(/canvas/);
    vi.unstubAllGlobals();
  });
  it('throws when the browser cannot decode', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    await expect(preprocessImage(new Blob(['x']))).rejects.toThrow(/decode/);
    vi.unstubAllGlobals();
  });
});

describe('normaliseOcrText', () => {
  it('cleans noise', () => {
    expect(normaliseOcrText('  \u201cHi\u201d\u200b  there \r\ndou-\nble\n\n\n\nend  ')).toBe('"Hi" there\ndouble\n\nend');
  });
  it('is idempotent (property)', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.string({ unit: 'binary' }), fc.array(fc.constantFrom('a', '-', '\n', ' ', '\r', '\u0301', '\u200b', '\t')).map((a) => a.join(''))), (s) => {
        const once = normaliseOcrText(s);
        expect(normaliseOcrText(once)).toBe(once);
      }),
    );
  });
});

describe('OCR to form mapping with the fake engine', () => {
  it('parses a clear read', async () => {
    const engine = createFakeEngine({ text: DISNEY, confidence: 91, steps: [10, 90] });
    const onProgress = vi.fn();
    const r = await readImageReceipt(engine, new Blob(['x']), NOW, { onProgress });
    expect(onProgress.mock.calls).toEqual([[10], [90]]);
    expect(r.problem).toBeUndefined();
    expect(r.hint).toBe('clear');
    expect(r.parsed.priceCents?.value).toBe(1399);
    expect(r.parsed.cadence?.value).toBe('monthly');
    expect(r.parsed.chargeAt?.value).toContain('-11-15');
  });
  it('flags no text, low confidence and no fields', () => {
    expect(interpretText('  ', 90, NOW).problem).toBe('no-text');
    expect(interpretText(DISNEY, 20, NOW)).toMatchObject({ problem: 'low-confidence', hint: 'poor' });
    expect(interpretText('just some words here', 90, NOW).problem).toBe('no-fields');
  });
  it('maps confidence to hints', () => {
    expect([confidenceHint(70), confidenceHint(69), confidenceHint(40), confidenceHint(39)]).toEqual([
      'clear',
      'partial',
      'partial',
      'poor',
    ]);
  });
  it('rejects with AbortError when aborted, and passes engine errors through', async () => {
    const c = new AbortController();
    const p = readImageReceipt(createFakeEngine({ text: '', confidence: 0, hang: true }), new Blob(['x']), NOW, { signal: c.signal });
    c.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      readImageReceipt(createFakeEngine({ text: '', confidence: 0, error: new Error('boom') }), new Blob(['x']), NOW),
    ).rejects.toThrow('boom');
    await expect(readImageReceipt(createFakeEngine({ text: '', confidence: 0 }), new Blob(['x']), NOW, { signal: c.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
