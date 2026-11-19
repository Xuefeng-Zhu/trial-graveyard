import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Hud } from './Hud';

const base = {
  graves: [],
  now: new Date('2026-01-01T00:00:00Z'),
  daylight: true,
  soundOn: false,
  calm: false,
  motion: true,
  onBury: vi.fn(),
  onToggleDaylight: vi.fn(),
  onToggleSound: vi.fn(),
  onToggleCalm: vi.fn(),
  share: null,
};
const form = <form><input name="name" aria-label="Name" /></form>;

describe('Hud', () => {
  it('opens the panels and focuses the form when editing starts', () => {
    const { rerender } = render(<Hud {...base} addPanel={null} />);
    expect(screen.getByRole('button', { name: 'Open panels' })).toHaveAttribute('aria-expanded', 'false');
    rerender(<Hud {...base} editing addPanel={form} />);
    expect(screen.getByRole('button', { name: 'Close panels' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });
});
