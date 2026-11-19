import { abortError } from './types';
import type { OcrEngine, OcrResult } from './types';

export interface FakeEngineOptions extends OcrResult {
  /** Progress steps to report before resolving. */
  steps?: number[];
  /** Reject with this instead of resolving. */
  error?: Error;
  /** When true, never resolves until aborted. Lets tests exercise cancel. */
  hang?: boolean;
}

/** A canned OCR engine for tests. It never loads tesseract.js or any model. */
export function createFakeEngine(opts: FakeEngineOptions): OcrEngine {
  return {
    recognize(_image, options = {}) {
      const { signal, onProgress } = options;
      return new Promise<OcrResult>((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        signal?.addEventListener('abort', () => reject(abortError()), { once: true });
        for (const s of opts.steps ?? []) onProgress?.(s);
        if (opts.hang) return;
        if (opts.error) return reject(opts.error);
        resolve({ text: opts.text, confidence: opts.confidence });
      });
    },
  };
}
