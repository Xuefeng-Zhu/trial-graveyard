/** What the engine can read: a file or an already preprocessed canvas. */
export type OcrImage = Blob | HTMLCanvasElement;

export interface OcrOptions {
  /** Aborting must make `recognize` reject with an `AbortError`. */
  signal?: AbortSignal;
  /** Called with 0 to 100. */
  onProgress?: (percent: number) => void;
}

export interface OcrResult {
  text: string;
  /** 0 to 100 for the whole image. */
  confidence: number;
}

export interface OcrEngine {
  recognize(image: OcrImage, options?: OcrOptions): Promise<OcrResult>;
}

export function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}
