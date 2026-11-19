import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  createTesseractEngine,
  interpretText,
  isAbortError,
  preprocessImage,
  readImageReceipt,
} from '../../lib/ocr';
import type { ConfidenceHint, ImageReadout, OcrEngine, OcrImage } from '../../lib/ocr';
import type { ParseResult } from '../../lib/parse';
import { useReducedMotion } from '../graveyard/useReducedMotion';
import styles from './editor.module.css';

export const DECIPHERING = 'The spirits are deciphering…';
export const CANCELLED = 'The spirits have gone back to rest. Nothing was read.';
export const NOT_AN_IMAGE = 'That does not look like a picture. Try a screenshot or a photo.';
export const NO_TEXT = 'The spirits stared hard and saw only fog. Try a clearer picture, or enter the trial by hand.';
export const LOW_CONFIDENCE_MESSAGE =
  'The spirits could only squint at this one. Check what they read below, or enter the trial by hand.';
export const NO_FIELDS = 'The spirits read some words but found no trial in them. Fix the text below, or enter it by hand.';
export const ENGINE_FAILED = 'The spirits lost their voice. You can still enter the trial by hand.';
export const PRIVACY_NOTE =
  'Your image never leaves this device. Only the trial you confirm is saved, never the image or the words read from it.';
export const SAMPLE_PATH = 'samples/disney-plus.png';

const HINTS: Record<ConfidenceHint, string> = {
  clear: 'The spirits read this clearly.',
  partial: 'The spirits read this partly. Give the fields a quick check.',
  poor: 'The spirits read this poorly. Please check every field.',
};

const PROBLEMS = {
  'no-text': NO_TEXT,
  'low-confidence': LOW_CONFIDENCE_MESSAGE,
  'no-fields': NO_FIELDS,
} as const;

export interface ImageReceiptProps {
  onParsed: (result: ParseResult) => void;
  /** Called when the user gives up on the image and wants the form. */
  onManual: () => void;
  now: () => Date;
  /** Defaults to the lazy Tesseract engine. Tests pass a fake. */
  engine?: OcrEngine;
  /** Defaults to the canvas downscale and grayscale step. */
  preprocess?: (file: Blob) => Promise<OcrImage>;
  /** An image handed over by the parent, for example pasted from the clipboard. */
  incoming?: { file: File; id: number };
}

type Phase = 'idle' | 'reading' | 'done' | 'error';

let defaultEngine: OcrEngine | undefined;
function lazyDefaultEngine(): OcrEngine {
  defaultEngine ??= createTesseractEngine();
  return defaultEngine;
}

export function ImageReceipt({ onParsed, onManual, now, engine, preprocess, incoming }: ImageReceiptProps) {
  const id = useId();
  const reduced = useReducedMotion();
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const confidenceRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [readout, setReadout] = useState<ImageReadout | null>(null);
  const [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(false);

  const setUrl = (file: Blob | null): void => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = file && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    setPreviewUrl(urlRef.current);
  };

  // Abort any read and drop the preview and text when the box goes away (G6.3).
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const deliver = (result: ImageReadout): void => {
    setReadout(result);
    setDraft(result.text);
    setPhase('done');
    setMessage(result.problem ? PROBLEMS[result.problem] : 'Fields summoned. Check them below before saving.');
    if (Object.keys(result.parsed).length > 0) onParsed(result.parsed);
  };

  const handleFile = async (file: File | Blob): Promise<void> => {
    abortRef.current?.abort();
    if (!file.type.startsWith('image/')) {
      setMessage(NOT_AN_IMAGE);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setUrl(file);
    setReadout(null);
    setProgress(0);
    setMessage('');
    setPhase('reading');
    try {
      const image = await (preprocess ?? preprocessImage)(file);
      const result = await readImageReceipt(engine ?? lazyDefaultEngine(), image, now(), {
        signal: controller.signal,
        onProgress: (p) => {
          if (!controller.signal.aborted) setProgress(Math.max(0, Math.min(100, p)));
        },
      });
      if (controller.signal.aborted) return;
      confidenceRef.current = result.confidence;
      deliver(result);
    } catch (e) {
      if (abortRef.current !== controller) return;
      if (isAbortError(e) || controller.signal.aborted) {
        setPhase('idle');
        setMessage(CANCELLED);
      } else {
        setPhase('error');
        setMessage(ENGINE_FAILED);
      }
    }
  };

  const handleFileRef = useRef(handleFile);
  handleFileRef.current = handleFile;
  useEffect(() => {
    if (incoming) void handleFileRef.current(incoming.file);
  }, [incoming]);

  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const cancel = (): void => abortRef.current?.abort();

  const remove = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUrl(null);
    setReadout(null);
    setDraft('');
    setMessage('');
    setPhase('idle');
  };

  const readAgain = (): void => {
    const result = interpretText(draft, confidenceRef.current, now());
    deliver({ ...result, text: draft });
  };

  const trySample = async (): Promise<void> => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${SAMPLE_PATH}`);
      if (!res.ok) throw new Error('missing sample');
      await handleFile(await res.blob());
    } catch {
      setPhase('error');
      setMessage(ENGINE_FAILED);
    }
  };

  const reading = phase === 'reading';
  const showManual = phase === 'error' || (phase === 'done' && readout?.problem !== undefined);

  return (
    <div
      className={`${styles.imageZone} ${dragging ? styles.dragging : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="image-zone"
    >
      <p id={`${id}-title`} className={styles.imageTitle}>
        Or show the spirits a screenshot or photo
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => pickRef.current?.click()}>
          Choose an image
        </button>
        <button type="button" className={styles.secondary} onClick={() => cameraRef.current?.click()}>
          Take a photo
        </button>
        <button type="button" className={styles.linkButton} onClick={() => void trySample()} disabled={reading}>
          Try a sample screenshot
        </button>
      </div>
      <input ref={pickRef} type="file" accept="image/*" hidden aria-label="Choose an image" onChange={onPick} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Take a photo"
        onChange={onPick}
      />
      <p className={styles.hint}>You can also drop an image here, or paste one while this box is focused.</p>
      <p className={styles.hint}>{PRIVACY_NOTE}</p>

      {previewUrl && (
        <div className={styles.preview}>
          <img src={previewUrl} alt="Preview of the receipt image you chose" className={styles.thumb} />
          <button type="button" className={styles.linkButton} onClick={remove}>
            Remove image
          </button>
        </div>
      )}

      {reading && (
        <div className={styles.progress}>
          <p aria-live="polite" className={styles.status}>
            {DECIPHERING}
          </p>
          <div
            role="progressbar"
            aria-label="Reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className={styles.bar}
          >
            <span
              className={`${styles.barFill} ${reduced ? '' : styles.shimmer}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <button type="button" className={styles.secondary} onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      <p aria-live="polite" className={styles.status}>
        {message}
      </p>

      {phase === 'done' && readout && (
        <>
          <p className={styles.hint}>
            {HINTS[readout.hint]} ({Math.round(readout.confidence)}% sure)
          </p>
          <details className={styles.details}>
            <summary>What the spirits read</summary>
            <label htmlFor={`${id}-raw`}>Text read from the image</label>
            <textarea
              id={`${id}-raw`}
              className={styles.input}
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="button" className={styles.secondary} onClick={readAgain}>
              Read again
            </button>
          </details>
        </>
      )}

      {showManual && (
        <button type="button" className={styles.primary} onClick={onManual}>
          Enter it by hand
        </button>
      )}
    </div>
  );
}
