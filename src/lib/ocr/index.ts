import type { OcrEngine } from './types'
export { readImageReceipt, parseText } from './read'
export { preprocessImage } from './preprocess'
export type { OcrEngine } from './types'

export const defaultEngine: OcrEngine = {
  async recognize(image, options) {
    const { tesseractEngine } = await import('./tesseractEngine')
    return tesseractEngine.recognize(image, options)
  },
}
