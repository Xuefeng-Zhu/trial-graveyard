import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGraveStore } from '../../state/store';
import { Atmosphere } from './Atmosphere';
import { LAYERS, ParallaxScene } from './ParallaxScene';
import { useMotionAllowed } from './useMotionAllowed';

const memory = (): { getItem: () => null; setItem: () => void; removeItem: () => void } => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});
const newStore = () => createGraveStore({ backend: memory() });

function mockMatchMedia(reduce: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  // @ts-expect-error restore jsdom default (no matchMedia)
  delete window.matchMedia;
  vi.restoreAllMocks();
});

describe('useMotionAllowed', () => {
  it('is allowed by default', () => {
    expect(renderHook(() => useMotionAllowed(newStore())).result.current).toBe(true);
  });

  it('is off when Calm mode is on', () => {
    const store = newStore();
    const { result } = renderHook(() => useMotionAllowed(store));
    act(() => {
      store.getState().toggleCalm();
    });
    expect(result.current).toBe(false);
  });

  it('is off when the OS prefers reduced motion', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useMotionAllowed(newStore())).result.current).toBe(false);
  });
});

describe('ParallaxScene', () => {
  it('renders five layers in depth order', () => {
    render(<ParallaxScene motion />);
    const ids = [...document.querySelectorAll('[data-layer]')].map((n) => n.getAttribute('data-layer'));
    expect(ids).toEqual(['sky', 'hills', 'graves', 'fog', 'foreground']);
    expect(LAYERS.map((l) => l.depth)).toEqual([...LAYERS.map((l) => l.depth)].sort((a, b) => a - b));
  });

  it('attaches input listeners only while motion is allowed', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { unmount } = render(<ParallaxScene motion={false} />);
    expect(add.mock.calls.some(([t]) => t === 'pointermove')).toBe(false);
    unmount();
    render(<ParallaxScene motion />);
    expect(add.mock.calls.some(([t]) => t === 'pointermove')).toBe(true);
    expect(add.mock.calls.some(([t]) => t === 'scroll')).toBe(true);
  });

  it('renders static layers with no transform and no moon pulse when motion is off', () => {
    render(<ParallaxScene motion={false} />);
    expect(screen.getByTestId('parallax-scene')).toHaveAttribute('data-motion', 'off');
    for (const n of document.querySelectorAll('[data-layer]')) {
      expect(n).toHaveAttribute('data-static', 'true');
      expect((n as HTMLElement).style.transform).toBe('');
    }
    expect(screen.getByTestId('moon-glow').className).not.toMatch(/pulse/);
  });

  it('reacts to pointer, scroll and tilt without throwing, one frame at a time', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    const { unmount } = render(<ParallaxScene motion />);
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 50 }));
      window.dispatchEvent(new Event('scroll'));
      const tilt = new Event('deviceorientation') as Event & { gamma: number | null; beta: number | null };
      tilt.gamma = 10;
      tilt.beta = 50;
      window.dispatchEvent(tilt);
      const empty = new Event('deviceorientation') as Event & { gamma: number | null; beta: number | null };
      empty.gamma = null;
      empty.beta = null;
      window.dispatchEvent(empty);
      window.dispatchEvent(new Event('resize'));
    });
    expect(raf).toHaveBeenCalled();
    unmount();
  });
});

describe('Atmosphere', () => {
  it('renders nothing when motion is off', () => {
    render(<Atmosphere motion={false} />);
    expect(screen.queryByTestId('atmosphere-canvas')).toBeNull();
  });

  it('lazy loads the canvas when motion is on and pauses while hidden', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const ctx = {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const { unmount } = render(<Atmosphere motion />);
    await waitFor(() => expect(screen.getByTestId('atmosphere-canvas')).toBeInTheDocument());
    expect(raf).toHaveBeenCalledTimes(1);

    // Run two frames with a launched star to cover drawing.
    const frame = raf.mock.calls[0]?.[0] as FrameRequestCallback;
    raf.mockClear();
    frame(1000);
    frame(2000);
    expect(ctx.clearRect).toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cancel).toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    raf.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(raf).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('resize'));
    unmount();
  });
});
