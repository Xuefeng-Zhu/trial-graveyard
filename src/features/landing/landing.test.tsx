import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Landing, LANDING_PITCH } from './Landing';

const originalMatchMedia = window.matchMedia;
function mockReduced(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

describe('Landing', () => {
  it('shows the pitch and a button that summons the demo', () => {
    mockReduced(false);
    const onSummon = vi.fn();
    render(<Landing daylight={false} onSummon={onSummon} />);
    expect(screen.getByText(LANDING_PITCH)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(onSummon).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('landing-art')).toBeInTheDocument();
  });

  it('renders an unanimated moon and no canvas when motion is reduced', () => {
    mockReduced(true);
    const { container } = render(<Landing daylight={false} onSummon={() => {}} />);
    expect(screen.getByRole('region')).toHaveAttribute('data-motion', 'still');
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('class')).not.toMatch(/glow/);
  });

  it('drops the artwork in Daylight mode but keeps the pitch and button', () => {
    mockReduced(false);
    render(<Landing daylight onSummon={() => {}} />);
    expect(screen.queryByTestId('landing-art')).not.toBeInTheDocument();
    expect(screen.getByText(LANDING_PITCH)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Summon demo graveyard' })).toBeInTheDocument();
  });

  it.each([
    ['night', false],
    ['daylight', true],
  ])('has no axe violations (%s)', async (_n, daylight) => {
    mockReduced(true);
    const { container } = render(<Landing daylight={daylight} onSummon={() => {}} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
