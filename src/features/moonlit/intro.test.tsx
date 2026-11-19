import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO_KEY, INTRO_MS, Intro, introSeen, markIntroSeen } from './Intro';

beforeEach(() => {
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Intro', () => {
  it('can be skipped with the button, Escape or a click', () => {
    const onDone = vi.fn();
    render(<Intro onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'a' });
    expect(onDone).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('intro'));
    expect(onDone).toHaveBeenCalledTimes(3);
  });

  it('ends by itself after the pan and stops listening on unmount', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { unmount } = render(<Intro onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(INTRO_MS + 1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('introSeen', () => {
  it('is false until marked and then true for the rest of the session', () => {
    expect(introSeen()).toBe(false);
    markIntroSeen();
    expect(sessionStorage.getItem(INTRO_KEY)).toBe('1');
    expect(introSeen()).toBe(true);
  });

  it('treats unavailable storage as seen so the intro never loops', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(introSeen()).toBe(true);
    expect(() => markIntroSeen()).not.toThrow();
  });
});
