import { useId, useState } from 'react';
import { parseReceipt } from '../../lib/parse';
import type { ParseResult } from '../../lib/parse';
import styles from './editor.module.css';

export const NOTHING_FOUND = 'Nothing haunting that receipt. Try the form instead, it bites less.';

export interface PasteBoxProps {
  /** Called with the parsed fields. The parser never saves anything itself (R5.5). */
  onParsed: (result: ParseResult) => void;
  now: () => Date;
}

export function PasteBox({ onParsed, now }: PasteBoxProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

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
    <section className={styles.paste} aria-label="Receipt reader">
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
    </section>
  );
}
