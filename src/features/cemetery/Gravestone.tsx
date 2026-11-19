import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { pixelStateFor } from '../../domain/pixelState';
import type { Grave } from '../../domain/trial';
import { GravestoneArt, Monogram, PixelBadge, STONE_STYLES, Spark, ZombieHand } from '../../design/pixel';
import { longStatus, priceText, statusText, toneOf } from './format';
import styles from './cemetery.module.css';

const FRONT_SCALE = 10;

export interface GravestoneProps {
  grave: Grave;
  now: Date;
  selected: boolean;
  /** Drawn with the green outline: the selected grave, or the most urgent one by default. */
  highlighted?: boolean;
  styleId: string;
  /** Drawn smaller and set back, as part of the rear row of the hill. */
  back?: boolean;
  /** Decorative motion is allowed. */
  motion: boolean;
  onSelect: (id: string) => void;
}

/** One trial as a pixel gravestone. A button, so keyboard and touch work the same way. */
export const Gravestone = forwardRef<HTMLButtonElement, GravestoneProps>(function Gravestone(
  { grave, now, selected, highlighted = selected, styleId, back = false, motion, onSelect },
  ref,
) {
  const state = pixelStateFor(grave, now);
  const scale = back ? FRONT_SCALE - 2 : FRONT_SCALE;
  const look = STONE_STYLES[styleId] ?? STONE_STYLES.classic!;
  return (
    <li className={styles.cell}>
      <button
        ref={ref}
        type="button"
        className={styles.tile}
        data-grave-id={grave.id}
        data-kind={state.kind}
        data-selected={highlighted}
        data-depth={back ? 'back' : 'front'}
        data-motion={motion ? 'animated' : 'still'}
        aria-pressed={selected}
        onClick={() => onSelect(grave.id)}
        style={{ '--ink': look.ink, '--s': scale } as CSSProperties}
      >
        <span className={styles.art}>
          <GravestoneArt kind={state.kind} styleId={styleId} cracks={state.cracks} scale={scale} />
          {state.sparks && (
            <span className={styles.sparks} aria-hidden="true" data-testid="sparks">
              <Spark scale={2} />
              <Spark scale={2} />
            </span>
          )}
          {state.zombieHand && (
            <span className={styles.hand} aria-hidden="true" data-testid="zombie-hand">
              <ZombieHand scale={5} />
            </span>
          )}
          <span className={styles.face}>
            <Monogram name={grave.name} size={32} />
          </span>
          <span className={styles.plaque} data-testid="plaque">
            <span className={styles.name} title={grave.name}>
              {grave.name}
            </span>
            <span className={styles.price}>{priceText(grave)}</span>
          </span>
        </span>
        <span className={styles.status}>
          <PixelBadge tone={toneOf(state.kind)}>{statusText(grave, now)}</PixelBadge>
        </span>
        <span className={styles.srOnly}>{longStatus(grave, now)}</span>
      </button>
    </li>
  );
});
