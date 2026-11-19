import type { OcrEngine, OcrResult } from './types'

export function createFakeEngine(result: OcrResult | Error): OcrEngine {
  return {
    async recognize(_image, { signal, onProgress }) {
      for (const percent of [10, 45, 100]) {
        await Promise.resolve()
        signal?.throwIfAborted()
        onProgress?.(percent)
      }
      if (result instanceof Error) throw result
      return result
    },
  }
}
