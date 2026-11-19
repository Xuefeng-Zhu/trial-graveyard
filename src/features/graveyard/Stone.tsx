import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motionFor } from '../../domain/motion';
import { formatEpitaph } from '../../domain/epitaph';
import { formatMoney } from '../../domain/savings';
import { stageLabel } from '../../domain/stage';
import type { ViewState } from '../../domain/stage';
import type { Grave as GraveData } from '../../domain/trial';
import styles from './graveyard.module.css';

export const CADENCE_SUFFIX = { 'one-time': '', weekly: '/wk', monthly: '/mo', yearly: '/yr' } as const;

const MS = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 } as const;
const pad = (n: number): string => String(n).padStart(2, '0');

/** "2d 05:03:09" style countdown that shows seconds, used while a stone is hovered or focused. */
export function formatTick(remainingMs: number): string {
  const r = Math.max(0, remainingMs);
  const d = Math.floor(r / MS.day);
  const h = Math.floor((r % MS.day) / MS.hour);
  const m = Math.floor((r % MS.hour) / MS.minute);
  const s = Math.floor((r % MS.minute) / MS.second);
  return `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Counts down in seconds while `hot`. Decorative: the label on the grave already says the same in words. */
function Ticker({ remainingMs }: { remainingMs: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className={styles.ticker} aria-hidden="true" data-testid="ticker" data-motion="animated">
      {formatTick(remainingMs - elapsed)}
    </p>
  );
}

function Hand({ motionOn }: { motionOn: boolean }) {
  return (
    <div
      className={`${styles.hand} ${motionOn ? styles.handBurst : ''}`}
      data-motion={motionOn ? 'animated' : 'still'}
      data-testid="zombie-pose"
      aria-hidden="true"
    >
      <svg viewBox="0 0 60 90" focusable="false">
        <path className={styles.arm} d="M24 90 L26 46 L36 46 L38 90 Z" />
        <g className={`${styles.fingers} ${motionOn ? styles.wiggle : ''}`}>
          <path className={styles.arm} d="M18 50 C14 36 14 24 18 14 C21 12 23 14 23 18 L24 40 Z" />
          <path className={styles.arm} d="M24 44 C22 28 24 14 28 6 C31 4 33 6 33 10 L33 40 Z" />
          <path className={styles.arm} d="M32 44 C32 28 34 14 39 8 C42 6 44 8 43 12 L38 42 Z" />
          <path className={styles.arm} d="M38 48 C40 36 44 26 49 22 C52 21 53 23 52 26 L42 50 Z" />
          <path className={styles.arm} d="M18 54 C10 52 6 46 5 40 C6 37 9 37 10 40 L22 48 Z" />
        </g>
        <path className={styles.rags} d="M20 70 L40 70 L40 78 L20 78 Z" />
      </svg>
    </div>
  );
}

function Dirt({ motionOn }: { motionOn: boolean }) {
  return (
    <svg
      className={styles.dirtSvg}
      viewBox="0 0 120 40"
      aria-hidden="true"
      focusable="false"
      data-testid="dirt"
      data-motion={motionOn ? 'animated' : 'still'}
    >
      <g className={`${styles.dirt} ${motionOn ? styles.dirtHop : ''}`}>
        <circle cx="22" cy="30" r="2.6" />
        <circle cx="44" cy="22" r="3.2" />
        <circle cx="76" cy="24" r="2.4" />
        <circle cx="98" cy="31" r="2.8" />
        <circle cx="60" cy="14" r="1.8" />
      </g>
    </svg>
  );
}

function FloatingGhost({ motionOn }: { motionOn: boolean }) {
  return (
    <div
      className={`${styles.ghostFloat} ${motionOn ? styles.drift : ''}`}
      data-motion={motionOn ? 'animated' : 'still'}
      aria-hidden="true"
    >
      <svg viewBox="0 0 70 90" focusable="false">
        <path className={styles.sheet} d="M8 86 V34 a27 27 0 0 1 54 0 V86 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 Z" />
        <ellipse className={styles.ghostEye} cx="26" cy="36" rx="4" ry="6" />
        <ellipse className={styles.ghostEye} cx="44" cy="36" rx="4" ry="6" />
        <ellipse className={styles.ghostEye} cx="35" cy="52" rx="4" ry="5" />
      </svg>
    </div>
  );
}

export interface StoneProps {
  grave: GraveData;
  view: ViewState;
  /** Decorative motion is allowed (OS preference and Calm mode both off). */
  motionOn: boolean;
  /** Hovered or focused: lifts the stone and starts the second-by-second countdown. */
  hot: boolean;
  /** Freshly summoned: soil bursts, the stone rises and the engraving writes itself in. */
  summoning: boolean;
}

/** An illustrated tombstone with engraved name and price, restless according to `motionFor`. */
export function Stone({ grave, view, motionOn, hot, summoning }: StoneProps) {
  const m = motionFor(view);
  const stage = view.kind === 'grave' ? view.stage : view.kind;
  const tomb = view.kind === 'tombstone';
  const price = `${formatMoney(grave.priceCents, grave.currency)}${CADENCE_SUFFIX[grave.cadence]}`;
  const priceText = view.kind === 'ghost' ? `${formatMoney(view.monthlyCents, grave.currency)}/mo` : price;
  const nameFit = grave.name.length > 10 ? { textLength: 76, lengthAdjust: 'spacingAndGlyphs' as const } : {};
  const animate = motionOn && summoning;
  const classes = [
    styles.figure,
    styles[stage],
    m.glow ? styles.glow : '',
    m.tremble && motionOn ? styles.tremble : '',
    animate ? styles.summoned : '',
  ].join(' ');

  return (
    <div
      className={classes}
      data-stage={stage}
      data-level={m.level}
      style={{ ['--intensity' as string]: m.intensity.toFixed(2) } as CSSProperties}
    >
      {m.ghost && <FloatingGhost motionOn={motionOn} />}
      {animate && (
        <svg className={styles.burst} viewBox="0 0 120 40" aria-hidden="true" focusable="false" data-testid="soil-burst" data-motion="animated">
          <g className={styles.dirt}>
            <circle cx="20" cy="30" r="3" />
            <circle cx="38" cy="24" r="2.4" />
            <circle cx="60" cy="18" r="3.2" />
            <circle cx="82" cy="24" r="2.4" />
            <circle cx="100" cy="30" r="3" />
          </g>
        </svg>
      )}
      <svg className={styles.art} viewBox="0 0 120 160" aria-hidden="true" focusable="false">
        <path className={tomb ? styles.stoneMossy : styles.stone} d="M18 152 V58 a42 42 0 0 1 84 0 V152 Z" />
        <path className={styles.stoneShade} d="M18 152 V58 a42 42 0 0 1 12 -30 V152 Z" />
        <path className={styles.rim} d="M18 152 V58 a42 42 0 0 1 84 0 V152" />
        {tomb ? (
          <text className={styles.rip} x="60" y="62" textAnchor="middle">RIP</text>
        ) : (
          <path className={styles.cross} d="M60 30 v22 M51 38 h18" />
        )}
        {view.kind === 'grave' && view.stage !== 'sealed' && (
          <g
            className={`${styles.cracks} ${m.cracks && motionOn ? styles.spread : ''}`}
            data-testid="cracks"
            data-spread={m.cracks ? 'true' : 'false'}
          >
            <path d="M66 20 L58 42 L70 56 L56 78 L66 98" pathLength={1} />
            <path d="M70 56 L86 64" pathLength={1} />
            {m.cracks && <path d="M30 152 L36 128 L26 114 M92 152 L88 130 L98 118" pathLength={1} />}
          </g>
        )}
        <text
          className={`${styles.engraved} ${animate ? styles.writeIn : ''}`}
          x="60"
          y={tomb ? 84 : 80}
          textAnchor="middle"
          data-motion={animate ? 'animated' : undefined}
          {...nameFit}
        >
          {grave.name}
        </text>
        {!tomb && (
          <text className={`${styles.engravedPrice} ${animate ? styles.writeIn : ''}`} x="60" y="102" textAnchor="middle">
            {priceText}
          </text>
        )}
        <path className={styles.moss} d="M18 152 q6 -10 12 -4 q6 -12 14 -2 q8 -8 14 0 q8 -10 12 2 q6 -6 12 4 q8 -8 18 0 Z" />
        <ellipse className={styles.mound} cx="60" cy="152" rx="56" ry="7" />
      </svg>
      {m.dirt && <Dirt motionOn={motionOn} />}
      {m.hand && <Hand motionOn={motionOn} />}
      {view.kind === 'grave' && stage === 'overdue' && <span className={styles.overdueTag}>Overdue</span>}
      {view.kind === 'grave' && (
        <>
          <p className={styles.stageText}>{stageLabel(view.stage, view.remainingMs)}</p>
          {hot && motionOn && view.remainingMs > 0 && <Ticker remainingMs={view.remainingMs} />}
        </>
      )}
      {view.kind === 'tombstone' && (
        <>
          <p className={styles.epitaph}>{grave.cancelledAt ? formatEpitaph(grave) : view.epitaph}</p>
          <p className={styles.srOnly}>Saved {formatMoney(view.savedCents, grave.currency)}</p>
        </>
      )}
      {view.kind === 'ghost' && (
        <p className={styles.price}>Haunting you for {formatMoney(view.monthlyCents, grave.currency)}/mo</p>
      )}
    </div>
  );
}
