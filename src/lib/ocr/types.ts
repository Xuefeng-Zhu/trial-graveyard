export interface OcrOptions { signal?: AbortSignal; onProgress?: (percent: number) => void }
export interface OcrResult { text: string; confidence: number }
export interface OcrEngine {
  recognize(image: Blob | HTMLCanvasElement, options: OcrOptions): Promise<OcrResult>
}
