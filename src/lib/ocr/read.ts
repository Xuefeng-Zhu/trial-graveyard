import { parseReceipt } from '../parse';
import type { ParseResult } from '../parse';
import { normaliseOcrText } from './normalise';
import type { OcrEngine, OcrImage, OcrOptions } from './types';

/** Below this the spirits squint (partial). */
export const CLEAR_CONFIDENCE = 70;
/** Below this the read is treated as a problem. */
export const LOW_CONFIDENCE = 40;

export type ConfidenceHint = 'clear' | 'partial' | 'poor';
export type ReadProblem = 'no-text' | 'low-confidence' | 'no-fields';

export interface ImageReadout {
  text: string;
  confidence: number;
  parsed: ParseResult;
  hint: ConfidenceHint;
  problem?: ReadProblem;
}

export function confidenceHint(confidence: number): ConfidenceHint {
  if (confidence >= CLEAR_CONFIDENCE) return 'clear';
  return confidence >= LOW_CONFIDENCE ? 'partial' : 'poor';
}

/** Turns (possibly user-edited) OCR text into a readout. No engine involved. */
export function interpretText(raw: string, confidence: number, now: Date): ImageReadout {
  const text = normaliseOcrText(raw);
  const parsed = text ? parseReceipt(text, now) : {};
  const hint = confidenceHint(confidence);
  let problem: ReadProblem | undefined;
  if (!text) problem = 'no-text';
  else if (confidence < LOW_CONFIDENCE) problem = 'low-confidence';
  else if (Object.keys(parsed).length === 0) problem = 'no-fields';
  return { text, confidence, parsed, hint, ...(problem ? { problem } : {}) };
}

/** Runs the engine, then maps its text to form fields. */
export async function readImageReceipt(
  engine: OcrEngine,
  image: OcrImage,
  now: Date,
  options: OcrOptions = {},
): Promise<ImageReadout> {
  const result = await engine.recognize(image, options);
  return interpretText(result.text, result.confidence, now);
}
