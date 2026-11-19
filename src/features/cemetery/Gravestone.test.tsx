import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { contrastRatio } from '../../design/contrast';
import type { Grave } from '../../domain/trial';
import { Gravestone } from './Gravestone';

const css = readFileSync('src/features/cemetery/cemetery.module.css', 'utf8');

afterEach(cleanup);

const NOW = new Date('2026-10-01T12:00:00-07:00');
const LONG = 'Phantomflix Premium Ultra Family Annual Plan';

function grave(name: string): Grave {
  return {
    id: 'g1',
    name,
    chargeAt: '2026-10-02T09:00:00-07:00',
    priceCents: 1399,
    currency: 'USD',
    cadence: 'monthly',
    status: 'active',
    createdAt: '2026-09-25T09:00:00-07:00',
  };
}

function renderStone(name: string, back = false) {
  return render(
    <ul>
      <Gravestone grave={grave(name)} now={NOW} selected={false} styleId="classic" back={back} motion onSelect={() => {}} />
    </ul>,
  );
}

describe('Gravestone plaque', () => {
  it('puts the name and price on a plaque that comes after the art svg', () => {
    renderStone('Phantomflix');
    const plaque = screen.getByTestId('plaque');
    expect(plaque).toHaveTextContent('Phantomflix');
    expect(plaque).toHaveTextContent('$13.99');
    const art = plaque.parentElement!;
    expect(art.querySelector('svg')).not.toBeNull();
    expect(art.querySelector('svg')!.compareDocumentPosition(plaque) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives long names a title tooltip and keeps the full name in the accessible name', () => {
    renderStone(LONG);
    expect(screen.getByTitle(LONG)).toHaveTextContent(LONG);
    expect(screen.getByRole('button', { name: new RegExp(LONG) })).toBeInTheDocument();
  });

  it('truncates with an ellipsis, uses a legible size and an opaque, high contrast plate', () => {
    const rule = (sel: string) => new RegExp(`${sel.replace('.', '\\.')} \\{([^}]*)\\}`).exec(css)![1]!;
    expect(rule('.name,\n.price')).toMatch(/text-overflow: ellipsis/);
    const size = /font-size: ([\d.]+)rem/.exec(rule('.name,\n.price'))![1]!;
    expect(Number(size) * 16).toBeGreaterThanOrEqual(12);
    const plate = rule('.plaque');
    const bg = /background: (#[0-9a-f]{6})/.exec(plate)![1]!;
    const fg = /color: (#[0-9a-f]{6})/.exec(plate)![1]!;
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    expect(plate).toMatch(/z-index: 2/);
  });

  it('draws back-row stones at a smaller integer scale', () => {
    const { container, rerender } = renderStone('Back');
    const width = () => Number(container.querySelector('svg')!.getAttribute('width'));
    const front = width();
    rerender(
      <ul>
        <Gravestone grave={grave('Back')} now={NOW} selected={false} styleId="classic" back motion onSelect={() => {}} />
      </ul>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-depth', 'back');
    expect(width()).toBeLessThan(front);
    expect(Number.isInteger(width() / 16)).toBe(true);
  });
});
