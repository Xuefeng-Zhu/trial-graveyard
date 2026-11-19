import type { OcrEngine } from './types'

export const tesseractEngine: OcrEngine = {
  async recognize(image, { signal, onProgress }) {
    signal?.throwIfAborted()
    const { createWorker } = await import('tesseract.js')
    signal?.throwIfAborted()

    let worker: Awaited<ReturnType<typeof createWorker>> | undefined
    let finished = false
    let fail: (reason: unknown) => void = () => {}
    let progress = 0
    const failed = new Promise<never>((_, reject) => { fail = reject })
    const abort = () => fail(signal?.reason ?? new DOMException('Cancelled', 'AbortError'))
    const timer = window.setTimeout(() => fail(new Error('Image reader timed out')), 90_000)
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const directory = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.origin)
      const pendingWorker = createWorker('eng', 1, {
        workerPath: new URL('worker.min.js', directory).href,
        corePath: new URL('tesseract-core-lstm.wasm.js', directory).href,
        langPath: directory.href,
        workerBlobURL: false,
        cacheMethod: 'none',
        errorHandler: fail,
        logger: message => {
          const next = message.status === 'recognizing text' ? 45 + 55 * message.progress
            : message.status === 'initializing api' ? 45 : message.status === 'loading language traineddata' ? 20 : 5
          progress = Math.max(progress, Math.round(next))
          if (!finished && !signal?.aborted) onProgress?.(progress)
        },
      }).then(async instance => {
        if (finished) await instance.terminate()
        else worker = instance
        return instance
      })
      const instance = await Promise.race([pendingWorker, failed])
      const { data } = await Promise.race([instance.recognize(image), failed])
      return { text: data.text, confidence: data.confidence }
    } finally {
      finished = true
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      await worker?.terminate()
    }
  },
}
