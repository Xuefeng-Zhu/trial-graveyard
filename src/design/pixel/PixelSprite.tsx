import type { Art } from './art';
import { PALETTE } from './art';

export type Palette = Readonly<Record<string, string>>;

export interface PixelSpriteProps {
  /** Layers of equal size; later layers paint over earlier ones. */
  layers: readonly Art[];
  palette?: Palette;
  /** Whole-number pixel size. Integer scaling keeps edges crisp. */
  scale?: number;
  /** Accessible name. Decorative sprites omit it and are hidden from assistive tech. */
  label?: string;
  className?: string;
}

interface Run {
  x: number;
  y: number;
  w: number;
  ch: string;
}

/** Stacks layers into one grid, then groups equal neighbours of a row into runs. Exported for tests. */
export function runsOf(layers: readonly Art[]): { cols: number; rows: number; runs: Run[] } {
  const base = layers[0] ?? [];
  const rows = base.length;
  const cols = base[0]?.length ?? 0;
  const grid: string[][] = base.map((r) => r.split(''));
  for (const layer of layers.slice(1)) {
    layer.forEach((line, y) => {
      line.split('').forEach((ch, x) => {
        if (ch !== '.' && grid[y]) grid[y][x] = ch;
      });
    });
  }
  const runs: Run[] = [];
  grid.forEach((line, y) => {
    let x = 0;
    while (x < line.length) {
      const ch = line[x] ?? '.';
      let w = 1;
      while (line[x + w] === ch) w += 1;
      if (ch !== '.') runs.push({ x, y, w, ch });
      x += w;
    }
  });
  return { cols, rows, runs };
}

/** Draws pixel art as crisp SVG rectangles. */
export function PixelSprite({ layers, palette = PALETTE, scale = 4, label, className }: PixelSpriteProps) {
  const { cols, rows, runs } = runsOf(layers);
  const colours: Palette = { ...PALETTE, ...palette };
  return (
    <svg
      className={className}
      width={cols * scale}
      height={rows * scale}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      focusable="false"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {runs.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={colours[r.ch] ?? '#ff00ff'} />
      ))}
    </svg>
  );
}
