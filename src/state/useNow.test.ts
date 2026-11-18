import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  const setVisibility = (state: 'visible' | 'hidden') =>
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });

  it('ticks every 60 s by default', () => {
    const { result } = renderHook(() => useNow());
    const first = result.current.getTime();
    act(() => void vi.advanceTimersByTime(59_999));
    expect(result.current.getTime()).toBe(first);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.getTime()).toBe(first + 60_000);
  });

  it('honours a custom interval', () => {
    const { result } = renderHook(() => useNow(1000));
    const first = result.current.getTime();
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current.getTime()).toBe(first + 3000);
  });

  it('refreshes when the tab becomes visible, not when hidden', () => {
    const { result } = renderHook(() => useNow());
    const first = result.current.getTime();
    vi.setSystemTime(first + 5000);
    setVisibility('hidden');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.getTime()).toBe(first);
    setVisibility('visible');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.getTime()).toBe(first + 5000);
  });

  it('cleans up its timer and listener on unmount', () => {
    const { unmount } = renderHook(() => useNow());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
