import { useId, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { parseReceipt } from '../../lib/parse';
import type { ParseResult } from '../../lib/parse';
import type { OcrEngine, OcrImage } from '../../lib/ocr';
import { ImageReceipt } from './ImageReceipt';
import styles from './editor.module.css';

export const NOTHING_FOUND = 'Nothing haunting that receipt. Try the form instead, it bites less.';

export interface PasteBoxProps {
  /** Called with the parsed fields. The parser never saves anything itself (R5.5). */
  onParsed: (result: ParseResult) => void;
  now: () => Date;
  /** Moves the user to the manual form, for the image fallback. */
  onManual?: () => void;
  /** OCR engine for image receipts. Defaults to the lazy Tesseract engine. */
  engine?: OcrEngine;
  preprocess?: (file: Blob) => Promise<OcrImage>;
}

export function PasteBox({ onParsed, now, onManual, engine, preprocess }: PasteBoxProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [incoming, setIncoming] = useState<{ file: File; id: number }>();

  // Pasting a screenshot from the clipboard sends it to the image reader.
  const onPaste = (e: ClipboardEvent<HTMLElement>): void => {
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    setIncoming((prev) => ({ file, id: (prev?.id ?? 0) + 1 }));
  };

  const run = (): void => {
    const result = parseReceipt(text, now());
    if (Object.keys(result).length === 0) {
      setMessage(NOTHING_FOUND);
      return;
    }
    setMessage('Fields summoned. Check them below before saving.');
    onParsed(result);
  };

  return (
    <section className={styles.paste} aria-label="Receipt reader" onPaste={onPaste}>
      <label htmlFor={id}>Paste a receipt or confirmation email</label>
      <textarea
        id={id}
        className={styles.input}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" className={styles.secondary} onClick={run}>
        Read the receipt
      </button>
      <p role="status" className={styles.status}>
        {message}
      </p>
      <ImageReceipt
        onParsed={onParsed}
        onManual={onManual ?? (() => {})}
        now={now}
        {...(engine ? { engine } : {})}
        {...(preprocess ? { preprocess } : {})}
        {...(incoming ? { incoming } : {})}
      />
    </section>
  );
}
