import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { pixelStateFor } from '../../domain/pixelState';
import { reminderTimes } from '../../domain/haunting';
import { formatEpitaph } from '../../domain/epitaph';
import { formatMoney } from '../../domain/savings';
import { getViewState } from '../../domain/stage';
import type { Grave } from '../../domain/trial';
import { Envelope, Monogram, PixelBadge, PixelButton, pixelLinkClass } from '../../design/pixel';
import { longStatus, stateLabel, statusText, toneOf } from './format';
import styles from './cemetery.module.css';

export const NO_CANCEL_URL_TEXT = 'No cancel link saved. Edit this grave to add one.';

export interface GraveActions {
  onExorcise: (id: string) => void;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: Grave[], filename: string) => void;
  onHaunt: (graves: Grave[], filename: string) => void;
}

export interface DetailsPanelProps extends GraveActions {
  grave: Grave;
  now: Date;
  /** A modal bottom sheet (narrow screens) traps focus. The desktop side panel does not. */
  modal: boolean;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled])';
const dateTime = (d: Date): string => d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

/** Everything about one trial, with Exorcise as the main action. Closes with Escape. */
export function DetailsPanel({ grave, now, modal, onClose, ...actions }: DetailsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const state = pixelStateFor(grave, now);
  const view = getViewState(grave, now);
  const charge = new Date(grave.chargeAt);
  const reminders = reminderTimes(charge);
  const active = grave.status === 'active';

  // Move focus into the panel when it opens and again when the status changes (for example after an exorcism).
  useEffect(() => {
    ref.current?.focus();
  }, [grave.id, grave.status]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (!modal || e.key !== 'Tab') return;
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

  const rows: Array<[string, string]> = [
    ['Price', formatMoney(grave.priceCents, grave.currency)],
    ['Cadence', grave.cadence],
    ['Next charge', dateTime(charge)],
    ['Remaining', view.kind === 'grave' ? longStatus(grave, now) : 'Not charging'],
    ['Status', stateLabel(grave, now)],
  ];

  return (
    <>
      {modal && <div className={styles.scrim} aria-hidden="true" onClick={onClose} />}
      <div
        ref={ref}
        role="dialog"
        aria-modal={modal}
        aria-labelledby="details-heading"
        tabIndex={-1}
        className={`${styles.details} ${modal ? styles.sheet : ''}`}
        data-kind={state.kind}
        onKeyDown={onKeyDown}
      >
        <div className={styles.detailsHead}>
          <Monogram name={grave.name} size={36} />
          <h2 id="details-heading" className={styles.detailsTitle}>
            {grave.name}
          </h2>
          <PixelBadge tone={toneOf(state.kind)}>{statusText(grave, now)}</PixelBadge>
        </div>

        <dl className={styles.facts}>
          {rows.map(([k, v]) => (
            <div key={k} className={styles.fact}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {view.kind === 'tombstone' && (
          <p className={styles.epitaph}>{grave.cancelledAt ? formatEpitaph(grave) : view.epitaph}</p>
        )}

        {active && (
          <section aria-labelledby="reminders-heading" className={styles.reminders}>
            <h3 id="reminders-heading" className={styles.sectionTitle}>
              <Envelope scale={2} /> Reminders
            </h3>
            <ul>
              <li>48 hours before: {dateTime(reminders.early)}</li>
              <li>Morning of: {dateTime(reminders.morning)}</li>
            </ul>
          </section>
        )}

        {active && (
          <div className={styles.cancelInfo}>
            {grave.cancelUrl ? (
              <a href={grave.cancelUrl} target="_blank" rel="noopener noreferrer" className={pixelLinkClass()}>
                Cancel now<span className={styles.srOnly}> {grave.name} (opens in a new tab)</span>
              </a>
            ) : (
              <>
                <PixelButton disabled aria-describedby={`nocancel-${grave.id}`}>
                  Cancel now
                </PixelButton>
                <span id={`nocancel-${grave.id}`} className={styles.hint}>
                  {NO_CANCEL_URL_TEXT}
                </span>
              </>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {active && (
            <>
              <PixelButton variant="primary" onClick={() => actions.onExorcise(grave.id)}>
                Exorcise Trial<span className={styles.srOnly}> {grave.name}</span>
              </PixelButton>
              <PixelButton onClick={() => actions.onCancelled(grave.id)}>
                I cancelled<span className={styles.srOnly}> {grave.name}</span>
              </PixelButton>
              <PixelButton onClick={() => actions.onKeep(grave.id)}>
                Keep it<span className={styles.srOnly}> {grave.name}</span>
              </PixelButton>
              <PixelButton onClick={() => actions.onExport([grave], `${grave.name}.ics`)}>
                Add to calendar<span className={styles.srOnly}> for {grave.name}</span>
              </PixelButton>
              <PixelButton onClick={() => actions.onHaunt([grave], `${grave.name}-haunting.ics`)}>
                Add haunting to calendar<span className={styles.srOnly}> for {grave.name}</span>
              </PixelButton>
            </>
          )}
          <PixelButton onClick={() => actions.onEdit(grave.id)}>
            Edit<span className={styles.srOnly}> {grave.name}</span>
          </PixelButton>
          {confirming ? (
            <>
              <PixelButton
                variant="danger"
                onClick={() => {
                  actions.onDelete(grave.id);
                  setConfirming(false);
                }}
              >
                Confirm delete<span className={styles.srOnly}> {grave.name}</span>
              </PixelButton>
              <PixelButton onClick={() => setConfirming(false)}>
                Keep grave<span className={styles.srOnly}> {grave.name}</span>
              </PixelButton>
            </>
          ) : (
            <PixelButton variant="danger" onClick={() => setConfirming(true)}>
              Delete<span className={styles.srOnly}> {grave.name}</span>
            </PixelButton>
          )}
          <PixelButton variant="ghost" onClick={onClose}>
            Close<span className={styles.srOnly}> details for {grave.name}</span>
          </PixelButton>
        </div>
      </div>
    </>
  );
}
