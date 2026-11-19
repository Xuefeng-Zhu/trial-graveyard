import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Grave as GraveData } from '../../domain/trial';
import { COUNT_UP_MS, Mausoleum } from './Mausoleum';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function grave(name: string, offsetMs: number, extra: Partial<GraveData> = {}): GraveData {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    chargeAt: new Date(NOW.getTime() + offsetMs).toISOString(),
    priceCents: 1000,
    currency: 'USD',
    cadence: 'monthly',
    status: 'active',
    createdAt: NOW.toISOString(),
    ...extra,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Mausoleum', () => {
  const dead = (id: string, cents: number, currency = 'USD'): GraveData =>
    grave(id, DAY, { status: 'cancelled', priceCents: cents, currency });

  it('shows zero and an empty state with no cancelled graves', () => {
    render(<Mausoleum graves={[grave('A', DAY)]} reduced />);
    expect(screen.getByTestId('mausoleum-total')).toHaveTextContent('Souls saved: $0.00');
    expect(screen.getByText(/No souls saved yet/)).toBeInTheDocument();
  });

  it('shows the final value immediately when motion is reduced', () => {
    const { rerender } = render(<Mausoleum graves={[dead('a', 1495)]} reduced />);
    expect(screen.getByTestId('mausoleum-animated')).toHaveTextContent('$14.95');
    rerender(<Mausoleum graves={[dead('a', 1495), dead('b', 500)]} reduced />);
    expect(screen.getByTestId('mausoleum-animated')).toHaveTextContent('$19.95');
    // Currencies are never mixed; the first by code is the big number.
    rerender(<Mausoleum graves={[dead('a', 1495), dead('b', 500), dead('c', 100, 'EUR')]} reduced />);
    expect(screen.getByTestId('mausoleum-total')).toHaveTextContent('Souls saved: €1.00, $19.95');
  });

  it('counts up to the final value, exposing the final value accessibly at once', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Mausoleum graves={[]} reduced={false} />);
    rerender(<Mausoleum graves={[dead('a', 2000)]} reduced={false} />);
    expect(screen.getByTestId('mausoleum-total')).toHaveTextContent('Souls saved: $20.00');
    expect(screen.getByTestId('mausoleum-animated')).toHaveAttribute('aria-hidden', 'true');
    act(() => {
      vi.advanceTimersByTime(COUNT_UP_MS / 3);
    });
    const mid = screen.getByTestId('mausoleum-animated').textContent!;
    expect(mid).not.toBe('$0.00');
    expect(mid).not.toBe('$20.00');
    act(() => {
      vi.advanceTimersByTime(COUNT_UP_MS);
    });
    expect(screen.getByTestId('mausoleum-animated')).toHaveTextContent('$20.00');
  });
});
