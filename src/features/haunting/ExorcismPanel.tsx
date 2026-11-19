import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { getCancelGuide } from '../../domain/cancelGuides';
import { formatMoney } from '../../domain/savings';
import type { Grave } from '../../domain/trial';
import styles from './haunting.module.css';

export interface ExorcismPanelProps {
  grave: Grave;
  onExorcised: (id: string) => void;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled])';

/** A modal dialog with the cancel link and steps. Confirming buries the trial. */
export function ExorcismPanel({ grave, onExorcised, onClose }: ExorcismPanelProps) {
  const guide = getCancelGuide(grave.name, grave.cancelUrl);
  const ref = useRef<HTMLDivElement>(null);
  const confirmed = useRef(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    // After confirming, the opener is replaced by a tombstone, so the owner moves focus there instead.
    return () => {
      if (!confirmed.current) opener?.focus?.();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.backdrop}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exorcism-heading"
        tabIndex={-1}
        className={styles.panel}
        onKeyDown={onKeyDown}
      >
        <h2 id="exorcism-heading">Exorcise {grave.name}</h2>
        <p>
          Banish it before it charges {formatMoney(grave.priceCents, grave.currency)}. Follow the ritual, then confirm.
        </p>
        {guide.cancelUrl && (
          <p>
            <a href={guide.cancelUrl} target="_blank" rel="noopener noreferrer" className={styles.button}>
              Open the cancel page<span className={styles.srOnly}> for {grave.name} (opens in a new tab)</span>
            </a>
          </p>
        )}
        <ol className={styles.steps} aria-label={`Cancel steps for ${grave.name}`}>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {!guide.known && <p className={styles.hint}>No exact guide for this service, so these steps are generic.</p>}
        <p>
          <a href={guide.searchUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Search the web for how to cancel {grave.name}
            <span className={styles.srOnly}> (opens in a new tab)</span>
          </a>
        </p>
        <div className={styles.panelActions}>
          <button type="button" className={styles.primary} onClick={() => {
              confirmed.current = true;
              onExorcised(grave.id);
            }}>
            It&apos;s exorcised
          </button>
          <button type="button" className={styles.button} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
