import { useState } from 'react';
import { getViewState, stageLabel } from '../../domain/stage';
import { formatMoney, totalSavedByCurrency } from '../../domain/savings';
import type { Grave } from '../../domain/trial';
import styles from './daylight.module.css';

export const NO_CANCEL_URL_TEXT = 'No cancel link saved. Edit this grave to add one.';
export const EMPTY_MAUSOLEUM_TEXT = 'No souls saved yet. Cancel a trial and it will rest in peace here.';
export const EMPTY_LIST_TEXT = 'The graveyard is dead quiet. Bury a trial above, or summon a demo graveyard.';

const CADENCE_SUFFIX = { 'one-time': '', weekly: '/wk', monthly: '/mo', yearly: '/yr' } as const;

export interface DaylightListProps {
  graves: readonly Grave[];
  now: Date;
  onCancelled: (id: string) => void;
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (graves: Grave[], filename: string) => void;
  onHaunt: (graves: Grave[], filename: string) => void;
  onExorcise: (id: string) => void;
}

export function Mausoleum({ graves }: { graves: readonly Grave[] }) {
  const totals = totalSavedByCurrency(graves);
  const [primary, ...rest] = totals;
  return (
    <section className={styles.mausoleum} aria-labelledby="mausoleum-heading">
      <h2 id="mausoleum-heading">Mausoleum</h2>
      <p aria-live="polite" className={styles.total}>
        <span>Souls saved: </span>
        <strong>{primary ? formatMoney(primary.cents, primary.currency) : '0.00'}</strong>
        {rest.map((t) => (
          <span key={t.currency}>, {formatMoney(t.cents, t.currency)}</span>
        ))}
      </p>
      {!primary && <p>{EMPTY_MAUSOLEUM_TEXT}</p>}
    </section>
  );
}

function byChargeDate(a: Grave, b: Grave): number {
  return Date.parse(a.chargeAt) - Date.parse(b.chargeAt) || a.name.localeCompare(b.name, 'en');
}

function GraveItem({ grave, now, ...actions }: { grave: Grave; now: Date } & Omit<DaylightListProps, 'graves' | 'now'>) {
  const [confirming, setConfirming] = useState(false);
  const view = getViewState(grave, now);
  const price = `${formatMoney(grave.priceCents, grave.currency)}${CADENCE_SUFFIX[grave.cadence]}`;
  const charge = new Date(grave.chargeAt).toLocaleDateString('en-US', { dateStyle: 'medium' });

  let badge: string;
  let stageClass = '';
  if (view.kind === 'grave') {
    badge = stageLabel(view.stage, view.remainingMs);
    stageClass = styles[view.stage] ?? '';
  } else if (view.kind === 'tombstone') {
    badge = 'Tombstone, resting in peace';
  } else {
    badge = `Ghost, haunting you for ${formatMoney(view.monthlyCents, grave.currency)}/mo`;
  }

  return (
    <li className={styles.item} aria-label={`${grave.name}, ${badge}, ${price}`}>
      <div className={styles.head}>
        <h3 className={styles.name}>{grave.name}</h3>
        <span className={`${styles.badge} ${stageClass}`}>{badge}</span>
      </div>
      <p className={styles.meta}>
        {price}
        {grave.status === 'active' ? `, charges ${charge}` : ''}
      </p>
      {view.kind === 'tombstone' && <p className={styles.epitaph}>{view.epitaph}</p>}
      <div className={styles.actions}>
        {grave.status === 'active' && (
          <>
            {grave.cancelUrl ? (
              <a href={grave.cancelUrl} target="_blank" rel="noopener noreferrer" className={styles.button}>
                Cancel now<span className={styles.visuallyHidden}> {grave.name} (opens in a new tab)</span>
              </a>
            ) : (
              <>
                <button type="button" disabled aria-describedby={`nocancel-${grave.id}`} className={styles.button}>
                  Cancel now
                </button>
                <span id={`nocancel-${grave.id}`} className={styles.hint}>
                  {NO_CANCEL_URL_TEXT}
                </span>
              </>
            )}
            <button type="button" className={styles.button} onClick={() => actions.onCancelled(grave.id)}>
              I cancelled<span className={styles.visuallyHidden}> {grave.name}</span>
            </button>
            <button type="button" className={styles.button} onClick={() => actions.onKeep(grave.id)}>
              Keep it<span className={styles.visuallyHidden}> {grave.name}</span>
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => actions.onExport([grave], `${grave.name}.ics`)}
            >
              Add to calendar<span className={styles.visuallyHidden}> for {grave.name}</span>
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => actions.onHaunt([grave], `${grave.name}-haunting.ics`)}
            >
              Add haunting to calendar<span className={styles.visuallyHidden}> for {grave.name}</span>
            </button>
            <button type="button" className={styles.button} onClick={() => actions.onExorcise(grave.id)}>
              Exorcise<span className={styles.visuallyHidden}> {grave.name}</span>
            </button>
          </>
        )}
        <button type="button" className={styles.button} onClick={() => actions.onEdit(grave.id)}>
          Edit<span className={styles.visuallyHidden}> {grave.name}</span>
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                actions.onDelete(grave.id);
                setConfirming(false);
              }}
            >
              Confirm delete<span className={styles.visuallyHidden}> {grave.name}</span>
            </button>
            <button type="button" className={styles.button} onClick={() => setConfirming(false)}>
              Keep grave<span className={styles.visuallyHidden}> {grave.name}</span>
            </button>
          </>
        ) : (
          <button type="button" className={styles.button} onClick={() => setConfirming(true)}>
            Delete<span className={styles.visuallyHidden}> {grave.name}</span>
          </button>
        )}
      </div>
    </li>
  );
}

export function DaylightList({ graves, now, ...actions }: DaylightListProps) {
  const sorted = [...graves].sort(byChargeDate);
  const active = graves.filter((g) => g.status === 'active');
  return (
    <div className={styles.root}>
      <Mausoleum graves={graves} />
      <section aria-labelledby="graves-heading">
        <div className={styles.listHead}>
          <h2 id="graves-heading">Graves</h2>
          {active.length > 0 && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => actions.onExport(active, 'trial-graveyard.ics')}
              >
                Export all active to calendar
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => actions.onHaunt(active, 'trial-graveyard-hauntings.ics')}
              >
                Export all hauntings
              </button>
            </div>
          )}
        </div>
        {sorted.length === 0 ? (
          <p>{EMPTY_LIST_TEXT}</p>
        ) : (
          <ul className={styles.list}>
            {sorted.map((g) => (
              <GraveItem key={g.id} grave={g} now={now} {...actions} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
