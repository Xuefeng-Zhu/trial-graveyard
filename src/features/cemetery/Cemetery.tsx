import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Grave } from '../../domain/trial';
import { BACKDROP_URL } from '../../design/pixel';
import { DetailsPanel } from './DetailsPanel';
import type { GraveActions } from './DetailsPanel';
import { Gravestone } from './Gravestone';
import { byUrgency } from './format';
import { useNarrow } from './useNarrow';
import styles from './cemetery.module.css';

export interface CemeteryProps extends Omit<GraveActions, 'onExorcise'> {
  graves: readonly Grave[];
  now: Date;
  styleId: string;
  motion: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onExorcise: (id: string) => void;
  /** The bottom HUD, drawn inside the scene. */
  children?: ReactNode;
}

/** The pixel graveyard: a grid of gravestones that never overlap, with a details panel for the selected one. */
export function Cemetery({ graves, now, styleId, motion, selectedId, onSelect, children, ...actions }: CemeteryProps) {
  const narrow = useNarrow();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const returnTo = useRef<string | null>(null);
  const sorted = [...graves].sort(byUrgency);
  const selected = sorted.find((g) => g.id === selectedId);

  // Give focus back to the gravestone that opened the panel once the panel is gone.
  useEffect(() => {
    if (selected || !returnTo.current) return;
    buttons.current.get(returnTo.current)?.focus();
    returnTo.current = null;
  }, [selected]);

  const select = (id: string): void => {
    returnTo.current = id;
    onSelect(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>): void => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = keys[e.key];
    if (step === undefined) return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const at = items.findIndex((b) => b === document.activeElement);
    const next = items[at + step];
    if (at >= 0 && next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div className={`${styles.stage} ${selected ? styles.withDetails : ''}`}>
      <section
        className={styles.scene}
        aria-label="Graveyard scene"
        data-motion={motion ? 'animated' : 'still'}
        style={{ backgroundImage: `url(${BACKDROP_URL})` }}
      >
        {sorted.length === 0 ? (
          <p className={styles.empty}>No gravestones yet. Add a trial and it will rise here.</p>
        ) : (
          <ul className={styles.grid} aria-label="Gravestones" onKeyDown={onKeyDown}>
            {sorted.map((g) => (
              <Gravestone
                key={g.id}
                ref={(el) => {
                  if (el) buttons.current.set(g.id, el);
                  else buttons.current.delete(g.id);
                }}
                grave={g}
                now={now}
                selected={g.id === selectedId}
                styleId={styleId}
                motion={motion}
                onSelect={select}
              />
            ))}
          </ul>
        )}
        {children}
      </section>
      {selected && (
        <DetailsPanel
          key={selected.id}
          grave={selected}
          now={now}
          modal={narrow}
          onClose={() => onSelect(null)}
          {...actions}
        />
      )}
    </div>
  );
}
