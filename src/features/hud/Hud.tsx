import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getViewState, stageLabel } from '../../domain/stage';
import type { Grave } from '../../domain/trial';
import { Mausoleum } from '../graveyard';
import styles from './hud.module.css';

export interface HudProps {
  graves: readonly Grave[];
  now: Date;
  daylight: boolean;
  soundOn: boolean;
  calm: boolean;
  /** Decorative motion is allowed. */
  motion: boolean;
  onBury: (id: string) => void;
  onToggleDaylight: () => void;
  onToggleSound: () => void;
  onToggleCalm: () => void;
  /** Shown only when there is something to replace; the landing offers it otherwise. */
  onSummon?: () => void;
  /** A grave is being edited: reveal the panels and focus the form. */
  editing?: boolean;
  /** Add trial form, paste box and Inbox Seance. */
  /** Countdown hero and stats, shown under "Next to rise". */
  extras?: ReactNode;
  addPanel: ReactNode;
  /** Share button. Renders nothing until a grave is cancelled. */
  share: ReactNode;
}

/** The most urgent active trial: earliest charge time, ties by name. */
export function nextToRise(graves: readonly Grave[]): Grave | undefined {
  return graves
    .filter((g) => g.status === 'active')
    .sort((a, b) => Date.parse(a.chargeAt) - Date.parse(b.chargeAt) || a.name.localeCompare(b.name, 'en'))[0];
}

/** Floating glass panels: next to rise, add a trial, souls saved, settings. A bottom sheet on small screens. */
export function Hud({
  graves,
  now,
  daylight,
  soundOn,
  calm,
  motion,
  onBury,
  onToggleDaylight,
  onToggleSound,
  onToggleCalm,
  onSummon,
  editing = false,
  extras,
  addPanel,
  share,
}: HudProps) {
  const [open, setOpen] = useState(false);
  const panelsId = useId();
  const panelsRef = useRef<HTMLDivElement>(null);
  // The edit form mounts inside the collapsed mobile sheet, where its autofocus cannot land.
  useEffect(() => {
    if (!editing) return;
    setOpen(true);
    panelsRef.current?.querySelector<HTMLElement>('form [name="name"]')?.focus();
  }, [editing]);
  const next = nextToRise(graves);
  const view = next ? getViewState(next, now) : undefined;

  return (
    <aside className={`${styles.hud} ${open ? styles.open : ''}`} aria-label="Control panels" data-testid="hud">
      <button
        type="button"
        className={`${styles.sheetToggle} glass`}
        aria-expanded={open}
        aria-controls={panelsId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Close panels' : 'Open panels'}
      </button>
      <div id={panelsId} ref={panelsRef} className={styles.panels}>
        <section className={`${styles.panel} glass`} aria-labelledby={`${panelsId}-next`}>
          <h2 id={`${panelsId}-next`} className={styles.title}>
            Next to rise
          </h2>
          {next && view?.kind === 'grave' ? (
            <>
              <p className={styles.next}>
                <strong>{next.name}</strong> <span>{stageLabel(view.stage, view.remainingMs).replace(/^\w+, /, '')}</span>
              </p>
              <button type="button" className={styles.button} onClick={() => onBury(next.id)}>
                Bury now<span className={styles.srOnly}> {next.name}</span>
              </button>
            </>
          ) : (
            <p className={styles.muted}>Nothing is stirring. Every grave is quiet.</p>
          )}
        </section>

        {extras && <div className={`${styles.panel} glass`}>{extras}</div>}

        <div className={`${styles.panel} glass`}>{addPanel}</div>

        {!daylight && (
          <div className={`${styles.panel} glass`}>
            <Mausoleum graves={graves} reduced={!motion} />
          </div>
        )}

        <section className={`${styles.panel} glass`} aria-labelledby={`${panelsId}-settings`}>
          <h2 id={`${panelsId}-settings`} className={styles.title}>
            Settings
          </h2>
          <div className={styles.settings}>
            <button type="button" className={styles.button} aria-pressed={daylight} onClick={onToggleDaylight}>
              Daylight mode
            </button>
            <button type="button" className={styles.button} aria-pressed={calm} onClick={onToggleCalm}>
              Calm mode
            </button>
            <button type="button" className={styles.button} aria-pressed={soundOn} onClick={onToggleSound}>
              {soundOn ? 'Sound: on' : 'Sound: off'}
            </button>
            {onSummon && (
              <button type="button" className={styles.button} onClick={onSummon}>
                Summon demo graveyard
              </button>
            )}
            {share}
          </div>
        </section>
      </div>
    </aside>
  );
}
