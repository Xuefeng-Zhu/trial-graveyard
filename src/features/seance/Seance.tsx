import { useRef, useState } from 'react';
import type { Grave, ValidTrial } from '../../domain/trial';
import { CrystalBall } from '../../design/pixel';
import { SeancePanel } from './SeancePanel';
import { useSeance } from './useSeance';
import styles from './seance.module.css';

export interface SeanceProps {
  existing: readonly Grave[];
  clock: () => Date;
  onBury: (trial: ValidTrial) => void;
  /** Delay between streamed mock emails. Tests pass 0. */
  delayMs?: number;
}

/** Crystal-ball entry point plus the séance panel. */
export function Seance({ existing, clock, onBury, delayMs }: SeanceProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const button = useRef<HTMLButtonElement>(null);
  const seance = useSeance({ existing, clock, onBury, ...(delayMs === undefined ? {} : { delayMs }) });

  const close = (): void => {
    seance.reset();
    setOpen(false);
    button.current?.focus();
  };

  const bury = (): void => {
    const n = seance.burySelected();
    if (n === 0) return;
    seance.reset();
    setOpen(false);
    setStatus(`${n} ${n === 1 ? 'trial' : 'trials'} buried. Rest in peace.`);
    button.current?.focus();
  };

  return (
    <div className={styles.entry}>
      <button
        ref={button}
        type="button"
        className={styles.secondary}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setStatus('');
          setOpen(true);
        }}
      >
        <CrystalBall scale={2} />
        Inbox Séance
      </button>
      <p role="status" className={styles.status}>
        {status}
      </p>
      {open && <SeancePanel seance={seance} onClose={close} onBury={bury} />}
    </div>
  );
}
