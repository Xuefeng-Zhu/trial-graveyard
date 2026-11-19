import { abortError } from './types';
import type { OcrEngine } from './types';

/**
 * The only module that mentions tesseract.js. The library is loaded with a
 * dynamic import on the first `recognize`, so it lives in its own chunk and the
 * main bundle does not grow. Tests never import this file.
 */
export function createTesseractEngine(): OcrEngine {
  return {
    async recognize(image, { signal, onProgress } = {}) {
      if (signal?.aborted) throw abortError();
      const { createWorker } = await import('tesseract.js');
      if (signal?.aborted) throw abortError();
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100));
        },
      });
      const onAbort = (): void => void worker.terminate();
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const { data } = await worker.recognize(image);
        if (signal?.aborted) throw abortError();
        return { text: data.text, confidence: data.confidence };
      } catch (e) {
        if (signal?.aborted) throw abortError();
        throw e;
      } finally {
        signal?.removeEventListener('abort', onAbort);
        await worker.terminate().catch(() => undefined);
      }
    },
  };
}
