import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGraveStore } from '../../state/store';
import { Atmosphere } from './Atmosphere';
import { CELEBRATION_MS, Celebration } from './Celebration';
import { useMotionAllowed } from './useMotionAllowed';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockReduced(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('Atmosphere', () => {
  it('draws lanterns, fog and fireflies when motion is allowed', () => {
    render(<Atmosphere motion />);
    const layer = screen.getByTestId('atmosphere');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.children.length).toBeGreaterThan(8);
  });

  it('draws nothing when motion is not allowed', () => {
    render(<Atmosphere motion={false} />);
    expect(screen.queryByTestId('atmosphere')).toBeNull();
  });
});

describe('Celebration', () => {
  it('floats coins and particles and announces the saved amount', () => {
    render(<Celebration amount="$14.95" motion onDone={() => {}} />);
    expect(screen.getByTestId('celebration-fx')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('$14.95 saved');
  });

  it('skips the coins and particles when motion is not allowed but still shows the amount', () => {
    render(<Celebration amount="$14.95" motion={false} onDone={() => {}} />);
    expect(screen.queryByTestId('celebration-fx')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('$14.95 saved');
  });

  it('finishes after its duration', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<Celebration amount="$1.00" motion onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(CELEBRATION_MS);
    });
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('useMotionAllowed', () => {
  it('is true by default and false for reduced motion', () => {
    mockReduced(false);
    expect(renderHook(() => useMotionAllowed(createGraveStore())).result.current).toBe(true);
    mockReduced(true);
    expect(renderHook(() => useMotionAllowed(createGraveStore())).result.current).toBe(false);
  });

  it('is false in Calm mode', () => {
    mockReduced(false);
    const store = createGraveStore();
    store.getState().toggleCalm();
    expect(renderHook(() => useMotionAllowed(store)).result.current).toBe(false);
  });
});
