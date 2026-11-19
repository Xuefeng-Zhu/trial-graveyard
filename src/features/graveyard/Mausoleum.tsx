import { useEffect, useRef, useState } from 'react';
import { formatMoney, totalSavedByCurrency } from '../../domain/savings';
import type { Grave } from '../../domain/trial';
import styles from './graveyard.module.css';

export const COUNT_UP_MS = 900;
export const MAUSOLEUM_EMPTY_TEXT = 'No souls saved yet. Cancel a trial and it will rest in peace here.';

/** Eases `target` in from the previously shown value. Jumps straight there when motion is reduced. */
function useCountUp(target: number, reduced: boolean): number {
  const [value, setValue] = useState(target);
  const shown = useRef(target);
  useEffect(() => {
    if (reduced || shown.current === target) {
      shown.current = target;
      setValue(target);
      return undefined;
    }
    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const frame = (): void => {
      const t = Math.min(1, (performance.now() - start) / COUNT_UP_MS);
      const eased = 1 - (1 - t) ** 3;
      shown.current = t >= 1 ? target : Math.round(from + (target - from) * eased);
      setValue(shown.current);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return value;
}

export interface MausoleumProps {
  graves: readonly Grave[];
  reduced: boolean;
}

/** The "souls saved" counter. The animated number is hidden from assistive tech; the final value is not. */
export function Mausoleum({ graves, reduced }: MausoleumProps) {
  const [primary, ...rest] = totalSavedByCurrency(graves);
  const target = primary?.cents ?? 0;
  const currency = primary?.currency ?? 'USD';
  const shown = useCountUp(target, reduced);
  const final = formatMoney(target, currency);

  return (
    <section className={styles.mausoleum} aria-labelledby="scene-mausoleum-heading">
      <h2 id="scene-mausoleum-heading" className={styles.mausoleumTitle}>
        Mausoleum
      </h2>
      <p className={styles.soulsLabel}>Souls saved</p>
      <p className={styles.counter} aria-hidden="true" data-testid="mausoleum-animated">
        {formatMoney(shown, currency)}
      </p>
      <p className={styles.srOnly} data-testid="mausoleum-total">
        Souls saved: {final}
        {rest.map((t) => `, ${formatMoney(t.cents, t.currency)}`).join('')}
      </p>
      {rest.length > 0 && (
        <p className={styles.moreTotals} aria-hidden="true">
          {rest.map((t) => formatMoney(t.cents, t.currency)).join(', ')}
        </p>
      )}
      {!primary && <p className={styles.empty}>{MAUSOLEUM_EMPTY_TEXT}</p>}
    </section>
  );
}
