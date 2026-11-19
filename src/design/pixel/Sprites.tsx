import type { Art } from './art';
import {
  COIN,
  CRACKS,
  CRYSTAL_BALL,
  ENGRAVING,
  ENVELOPE,
  FLAME,
  FLOWER,
  HAND,
  LANTERN,
  PUMPKIN,
  RAVEN,
  SCROLL,
  SKULL,
  SPARK,
  STONE,
  VINES,
} from './art';
import { PixelSprite } from './PixelSprite';
import type { Palette } from './PixelSprite';

interface Small {
  scale?: number;
  label?: string;
  className?: string;
}

const make =
  (art: Art) =>
  ({ scale = 3, label, className }: Small) => <PixelSprite layers={[art]} scale={scale} label={label} className={className} />;

export const Coin = make(COIN);
export const Skull = make(SKULL);
export const Flame = make(FLAME);
export const Scroll = make(SCROLL);
export const Envelope = make(ENVELOPE);
export const CrystalBall = make(CRYSTAL_BALL);
export const Flower = make(FLOWER);
export const ZombieHand = make(HAND);
export const Spark = make(SPARK);

export const DECORATION_ART: Record<string, Art> = {
  lantern: LANTERN,
  pumpkin: PUMPKIN,
  flowers: FLOWER,
  raven: RAVEN,
};

export function Decoration({ id, scale = 4, label }: { id: string; scale?: number; label?: string }) {
  return <PixelSprite layers={[DECORATION_ART[id] ?? FLOWER]} scale={scale} label={label} />;
}

/** Gravestone body colours per collectible style. `ink` is the text colour used on top. */
export const STONE_STYLES: Record<string, { palette: Palette; ink: string }> = {
  classic: { palette: { s: '#B8A9D9', h: '#F2ECFF', d: '#8E7DB8' }, ink: '#120F23' },
  mossy: { palette: { s: '#93AE8C', h: '#CDE5BE', d: '#62805F' }, ink: '#120F23' },
  obsidian: { palette: { s: '#4A4066', h: '#6B5F8C', d: '#2C2142' }, ink: '#F2ECFF' },
  rose: { palette: { s: '#E8B4C8', h: '#FFE0EC', d: '#C4849E' }, ink: '#120F23' },
};

export type StoneKind = 'normal' | 'warning' | 'critical' | 'cancelled' | 'kept';

export interface GravestoneArtProps {
  kind: StoneKind;
  styleId?: string;
  scale?: number;
  /** Colour of the cracks, from `pixelStateFor`. */
  cracks?: string;
}

/** The tombstone sprite for one visual state. Cracks, vines and the stone itself are layers of one pixel grid. */
export function GravestoneArt({ kind, styleId = 'classic', scale = 8, cracks }: GravestoneArtProps) {
  const look = STONE_STYLES[styleId] ?? STONE_STYLES.classic!;
  const layers: Art[] = [STONE, ENGRAVING];
  if (cracks) layers.push(CRACKS);
  if (kind === 'cancelled') layers.push(VINES);
  return <PixelSprite layers={layers} palette={{ ...look.palette, ...(cracks ? { c: cracks } : {}) }} scale={scale} />;
}

const TILE_COLOURS = ['#B79BFA', '#FF8FB8', '#5FB43A', '#FFB14A', '#4FC3F7', '#E8B4C8'];

/** Original monogram icon: the first letter on a coloured pixel tile. Stands in for brand logos. */
export function Monogram({ name, size = 28 }: { name: string; size?: number }) {
  const letter = ([...name.trim()][0] ?? '?').toUpperCase();
  const sum = [...name].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        background: TILE_COLOURS[sum % TILE_COLOURS.length],
        color: '#120F23',
        boxShadow: '0 0 0 2px #120F23, 0 0 0 4px #F2ECFF',
        fontFamily: 'var(--font-display)',
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
    >
      {letter}
    </span>
  );
}
