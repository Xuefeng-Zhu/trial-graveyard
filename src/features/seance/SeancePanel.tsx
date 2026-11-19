import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { CrystalBall, Envelope } from '../../design/pixel';
import { useMotionAllowed } from '../atmosphere';
import { PROVIDERS } from '../../lib/email';
import { ReviewRow } from './ReviewRow';
import type { useSeance } from './useSeance';
import styles from './seance.module.css';

export const pluralize = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
export const PRIVACY_NOTE =
  'Everything stays on this device. The spirits read receipts in memory, only the trials you confirm are saved, and email bodies are never stored. Disconnect to forget what they saw.';

type Seance = ReturnType<typeof useSeance>;

export interface SeancePanelProps {
  seance: Seance;
  onClose: () => void;
  onBury: () => void;
}

const FOCUSABLE = 'button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])';

export function SeancePanel({ seance, onClose, onBury }: SeancePanelProps) {
  const { phase, progress, items, message } = seance;
  const animated = useMotionAllowed() ? 'true' : 'false';
  const ref = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mock = PROVIDERS[0];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const spirits = `${pluralize(progress.found, 'spirit')} found`;
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div
      ref={ref}
      className={styles.panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="seance-title"
      onKeyDown={onKeyDown}
    >
      <div className={styles.heading}>
        <span className={styles.ball} data-animated={animated} aria-hidden="true">
          <CrystalBall scale={4} />
        </span>
        <h2 id="seance-title" tabIndex={-1} ref={headingRef}>
          Inbox Séance
        </h2>
      </div>

      {message && (
        <p role="status" className={styles.status}>
          {message}
        </p>
      )}

      {(phase === 'idle' || phase === 'error') && (
        <div className={styles.providers}>
          <p>Choose an inbox to summon forgotten trials from.</p>
          <button
            type="button"
            className={styles.primary}
            disabled={phase === 'error'}
            onClick={() => void seance.connect()}
          >
            Connect {mock?.label ?? 'Haunted Demo Inbox'}
          </button>
          <button type="button" className={styles.disabled} aria-disabled="true">
            Gmail, coming soon
          </button>
          <button type="button" className={styles.disabled} aria-disabled="true">
            Outlook, coming soon
          </button>
        </div>
      )}

      {phase === 'consent' && (
        <div role="group" aria-labelledby="seance-consent" className={styles.consent}>
          <p id="seance-consent">
            {mock?.label ?? 'Haunted Demo Inbox'} wants to read your receipts. It is a pretend inbox, so
            nothing leaves this device.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => seance.answerConsent(true)}>
              Allow
            </button>
            <button type="button" className={styles.secondary} onClick={() => seance.answerConsent(false)}>
              Deny
            </button>
          </div>
        </div>
      )}

      {phase === 'scanning' && (
        <div className={styles.scanning}>
          <div className={styles.envelopes} aria-hidden="true">
            {[0, 1, 2].map((n) => (
              <span key={n} className={styles.envelope} data-animated={animated}>
                <Envelope scale={4} />
              </span>
            ))}
          </div>
          <div className={styles.scan} aria-hidden="true">
            <span
              className={styles.scanFill}
              data-animated={animated}
              style={{ width: `${Math.min(100, Math.max(8, progress.read * 10))}%` }}
            />
          </div>
          <p role="status" aria-live="polite">
            {spirits}
          </p>
          <p className={styles.muted}>The spirits have read {pluralize(progress.read, 'letter')} so far.</p>
        </div>
      )}

      {phase === 'review' && (
        <>
          {items.length === 0 ? (
            <p>The inbox is quiet. No restless trials found.</p>
          ) : (
            <>
              <p>
                {items.length} restless {items.length === 1 ? 'trial' : 'trials'} found. Check the details
                before burying.
              </p>
              <ul className={styles.list}>
                {items.map((item) => (
                  <ReviewRow
                    key={item.key}
                    item={item}
                    onChecked={(checked) => seance.update(item.key, { checked })}
                    onEdit={(values) => seance.update(item.key, { values })}
                  />
                ))}
              </ul>
              <button type="button" className={styles.primary} disabled={checkedCount === 0} onClick={onBury}>
                Bury selected
              </button>
            </>
          )}
        </>
      )}

      <details className={styles.privacy}>
        <summary>What the spirits can see</summary>
        <p>{PRIVACY_NOTE}</p>
      </details>

      <div className={styles.actions}>
        {phase !== 'idle' && (
          <button type="button" className={styles.secondary} onClick={seance.reset}>
            Disconnect
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
