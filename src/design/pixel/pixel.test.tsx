import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as art from './art';
import { PixelBadge } from './PixelBadge';
import { PixelButton, pixelLinkClass } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { PixelSprite, runsOf } from './PixelSprite';
import { Coin, Decoration, GravestoneArt, Monogram } from './Sprites';
import { assetUrl } from './assets';

afterEach(cleanup);

const sprites = Object.entries(art).filter(([, v]) => Array.isArray(v)) as Array<[string, readonly string[]]>;

describe('pixel art data', () => {
  it.each(sprites)('%s is a rectangle of known palette characters', (_name, rows) => {
    const width = rows[0]!.length;
    for (const row of rows) {
      expect(row).toHaveLength(width);
      for (const ch of row) expect(ch === '.' || ch in art.PALETTE).toBe(true);
    }
  });

  it('keeps stacked gravestone layers the same size', () => {
    for (const layer of [art.CRACKS, art.VINES, art.ENGRAVING]) {
      expect(layer).toHaveLength(art.STONE.length);
      expect(layer[0]).toHaveLength(art.STONE[0]!.length);
    }
  });
});

describe('PixelSprite', () => {
  it('merges runs and lets later layers paint over earlier ones', () => {
    const { cols, rows, runs } = runsOf([['aab'], ['.c.']]);
    expect([cols, rows]).toEqual([3, 1]);
    expect(runs).toEqual([
      { x: 0, y: 0, w: 1, ch: 'a' },
      { x: 1, y: 0, w: 1, ch: 'c' },
      { x: 2, y: 0, w: 1, ch: 'b' },
    ]);
  });

  it('draws crisp edges at an integer scale and is decorative unless labelled', () => {
    const { container, rerender } = render(<PixelSprite layers={[['ww']]} scale={5} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg).toHaveAttribute('width', '10');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    rerender(<PixelSprite layers={[['ww']]} label="Two pixels" />);
    expect(screen.getByRole('img', { name: 'Two pixels' })).toBeInTheDocument();
  });

  it('falls back to a visible colour for unknown characters', () => {
    const { container } = render(<PixelSprite layers={[['?']]} />);
    expect(container.querySelector('rect')).toHaveAttribute('fill', '#ff00ff');
  });

  it('renders the named sprites and every decoration', () => {
    const { container } = render(
      <>
        <Coin />
        <GravestoneArt kind="critical" cracks="#FF586E" />
        <GravestoneArt kind="cancelled" styleId="unknown-style" />
        {['lantern', 'pumpkin', 'flowers', 'raven', 'missing'].map((id) => (
          <Decoration key={id} id={id} label={id} />
        ))}
      </>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(8);
  });
});

describe('Monogram', () => {
  it('shows the first letter, deterministically, and handles empty names', () => {
    const { container, rerender } = render(<Monogram name="  phantomflix" />);
    expect(container).toHaveTextContent('P');
    const first = container.firstElementChild!.getAttribute('style');
    rerender(<Monogram name="  phantomflix" />);
    expect(container.firstElementChild!.getAttribute('style')).toBe(first);
    rerender(<Monogram name="" />);
    expect(container).toHaveTextContent('?');
  });
});

describe('pixel controls', () => {
  it('PixelButton is a button by default and fires clicks', () => {
    const onClick = vi.fn();
    render(<PixelButton onClick={onClick}>Go</PixelButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    expect(pixelLinkClass('primary')).toContain('button');
    expect(pixelLinkClass()).toContain('button');
  });

  it('PixelPanel labels itself with its title, PixelBadge shows text', () => {
    render(
      <PixelPanel title="Daily quest">
        <PixelBadge tone="warning">72h left</PixelBadge>
      </PixelPanel>,
    );
    expect(screen.getByRole('region', { name: 'Daily quest' })).toHaveTextContent('72h left');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <PixelPanel title="Panel">
        <PixelButton variant="primary">Do it</PixelButton>
        <PixelBadge>Kept</PixelBadge>
      </PixelPanel>,
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('assetUrl', () => {
  it('prefixes the Vite base path', () => {
    expect(assetUrl('/pixel/reaper.png')).toBe(`${import.meta.env.BASE_URL}pixel/reaper.png`);
    expect(assetUrl('pixel/graveyard-bg.png')).toBe(`${import.meta.env.BASE_URL}pixel/graveyard-bg.png`);
  });
});
