import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Grave as GraveData } from '../../domain/trial';
import { Fog, MAX_FOG_PARTICLES, createParticles as createParticlesForTest } from './Fog';
import { COUNT_UP_MS, Mausoleum } from './Mausoleum';
import { SUMMON_MS, Scene } from './Scene';
import { formatTick } from './Stone';
import { BURY_FX_MS } from './BuryFx';

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

const ALL: GraveData[] = [
  grave('Sealed One', 20 * DAY, { cancelUrl: 'https://example.com/cancel' }),
  grave('Cracked One', 5 * DAY),
  grave('Churning One', 60 * HOUR),
  grave('Zombie One', 5 * HOUR, { cancelUrl: 'https://example.com/z' }),
  grave('Overdue One', -2 * HOUR),
  grave('Dead One', -DAY, { status: 'cancelled', priceCents: 1495, cancelledAt: NOW.toISOString() }),
  grave('Kept One', 3 * DAY, { status: 'kept', priceCents: 2400, cadence: 'yearly' }),
];

type Listener = () => void;
/** Installs a controllable matchMedia. Returns a function that flips the preference. */
function mockMatchMedia(initial: boolean): (matches: boolean) => void {
  let matches = initial;
  const listeners = new Set<Listener>();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  }));
  return (next) => {
    matches = next;
    act(() => listeners.forEach((l) => l()));
  };
}

const noop = () => {};
const renderScene = (graves: GraveData[], props: Partial<Parameters<typeof Scene>[0]> = {}) =>
  render(<Scene graves={graves} now={NOW} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} {...props} />);

const items = () => Array.from(document.querySelectorAll<HTMLElement>('li[data-item-id]'));

beforeEach(() => {
  mockMatchMedia(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Scene stages', () => {
  it('renders a distinct component per stage with text labels', () => {
    renderScene(ALL);
    const stages = items().map((li) => li.querySelector('[data-stage]')?.getAttribute('data-stage'));
    expect(stages).toEqual(['ghost', 'churning', 'cracked', 'sealed', 'tombstone', 'overdue', 'zombie']);
    expect(screen.getAllByTestId('cracks')).toHaveLength(4); // cracked, churning, zombie, overdue
    expect(screen.getAllByTestId('cracks').filter((c) => c.dataset.spread === 'true')).toHaveLength(3); // within 72 hours
    expect(screen.getAllByTestId('dirt')).toHaveLength(2); // hand within 24 hours
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Here lies Dead One · $14.95/mo · slain Oct 2026')).toBeInTheDocument();
    expect(screen.getByText(/Haunting you for \$2\.00\/mo/)).toBeInTheDocument();
    expect(screen.getByText(/^Zombie, charges in 5 hours/)).toBeInTheDocument();
  });

  it('moves zombies and overdue graves to the front row, most urgent first', () => {
    renderScene(ALL);
    const front = document.querySelector('[data-row="front"]')!;
    expect(within(front as HTMLElement).getAllByRole('listitem').map((li) => li.dataset.itemId)).toEqual([
      'overdue-one',
      'zombie-one',
    ]);
    const ids = items().map((li) => li.dataset.itemId);
    expect(ids.slice(-2)).toEqual(['overdue-one', 'zombie-one']);
    expect(ids[0]).toBe('kept-one');
  });

  it('offers Cancel now, I cancelled and Keep it on zombies without opening anything', () => {
    const onCancelled = vi.fn();
    const onKeep = vi.fn();
    renderScene(ALL, { onCancelled, onKeep });
    const zombie = screen.getByRole('listitem', { name: /Zombie One/ });
    const link = within(zombie).getByRole('link', { name: /Cancel now/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(within(zombie).getByRole('button', { name: /I cancelled/ }));
    expect(onCancelled).toHaveBeenCalledWith('zombie-one');
    fireEvent.click(within(zombie).getByRole('button', { name: /Keep it/ }));
    expect(onKeep).toHaveBeenCalledWith('zombie-one');
    const overdue = screen.getByRole('listitem', { name: /Overdue One/ });
    expect(within(overdue).getByRole('button', { name: 'Cancel now' })).toBeDisabled();
    expect(within(overdue).getByText(/No cancel link saved/)).toBeInTheDocument();
  });

  it('labels every item with name, stage and price', () => {
    renderScene(ALL);
    expect(screen.getByRole('listitem', { name: 'Zombie One, Zombie, charges in 5 hours, $10.00/mo' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Sealed One, Sealed, charges in 20 days, $10.00/mo' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /Dead One, tombstone, Here lies/ })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /Kept One, ghost, haunting you for \$2\.00\/mo/ })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    renderScene(ALL);
    expect((await axe(document.body)).violations).toEqual([]);
  });
});

describe('keyboard navigation', () => {
  it('keeps exactly one tab stop and moves it with the arrow keys', () => {
    renderScene(ALL);
    const tabbable = () => items().filter((li) => li.tabIndex === 0);
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]!.dataset.itemId).toBe('kept-one');

    tabbable()[0]!.focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'churning-one');
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]).toBe(document.activeElement);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'cracked-one');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'churning-one');
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'zombie-one');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'zombie-one');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'kept-one');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toHaveAttribute('data-item-id', 'kept-one');
    expect(tabbable()).toHaveLength(1);
  });

  it('opens the action panel with Enter and closes it with Escape', () => {
    renderScene(ALL);
    const sealed = screen.getByRole('listitem', { name: /Sealed One/ });
    expect(within(sealed).queryByRole('button')).not.toBeInTheDocument();
    sealed.focus();
    fireEvent.keyDown(sealed, { key: 'Enter' });
    const cancelled = within(sealed).getByRole('button', { name: /I cancelled/ });
    fireEvent.keyDown(cancelled, { key: 'Escape' });
    expect(within(sealed).queryByRole('button')).not.toBeInTheDocument();
    expect(sealed).toHaveFocus();
  });

  it('ignores arrow keys typed inside an action control', () => {
    renderScene(ALL);
    const zombie = screen.getByRole('listitem', { name: /Zombie One/ });
    const button = within(zombie).getByRole('button', { name: /Keep it/ });
    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowLeft' });
    expect(button).toHaveFocus();
  });
});

describe('live region and transitions', () => {
  it('announces a stage change after time advances', () => {
    const g = [grave('Phantomflix', 50 * HOUR)];
    const { rerender } = renderScene(g);
    expect(screen.getByTestId('scene-live')).toBeEmptyDOMElement();
    rerender(<Scene graves={g} now={new Date(NOW.getTime() + 3 * HOUR)} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);
    expect(screen.getByTestId('scene-live')).toHaveTextContent('Phantomflix is now Zombie, charges in 47 hours.');
  });

  it('turns a cancelled grave into a tombstone and announces it', async () => {
    const g = grave('Necro Audiobooks', 5 * DAY, { priceCents: 1495 });
    const { rerender } = renderScene([g]);
    const done = { ...g, status: 'cancelled' as const };
    rerender(<Scene graves={[done]} now={NOW} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(screen.getByText('Here lies Necro Audiobooks. Saved you $14.95/mo.')).toBeInTheDocument();
    expect(screen.getByTestId('scene-live')).toHaveTextContent('Necro Audiobooks is now a tombstone. Saved $14.95.');
  });

  it('turns a kept grave into a ghost and moves focus to it', async () => {
    const g = grave('Calm', 20 * DAY);
    const onKeep = vi.fn();
    const { rerender } = renderScene([g], { onKeep });
    const li = screen.getByRole('listitem', { name: /Calm/ });
    li.focus();
    fireEvent.keyDown(li, { key: 'Enter' });
    fireEvent.click(within(li).getByRole('button', { name: /Keep it/ }));
    expect(onKeep).toHaveBeenCalledWith('calm');
    rerender(<Scene graves={[{ ...g, status: 'kept' }]} now={NOW} onCancelled={noop} onKeep={onKeep} onEdit={noop} onDelete={noop} onExport={noop} />);
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(screen.getByTestId('scene-live')).toHaveTextContent('Calm is now a ghost.');
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-kind', 'ghost'));
  });
});

describe('edit, delete and export', () => {
  it('exposes edit, delete with confirmation and export on an active grave', () => {
    const g = grave('Calm', 20 * DAY);
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onExport = vi.fn();
    renderScene([g], { onEdit, onDelete, onExport });
    const li = screen.getByRole('listitem', { name: /Calm/ });
    li.focus();
    fireEvent.keyDown(li, { key: 'Enter' });
    fireEvent.click(within(li).getByRole('button', { name: /Add to calendar/ }));
    expect(onExport).toHaveBeenCalledWith([g], 'Calm.ics');
    fireEvent.click(within(li).getByRole('button', { name: /Edit/ }));
    expect(onEdit).toHaveBeenCalledWith('calm');
    fireEvent.keyDown(li, { key: 'Enter' });
    fireEvent.click(within(li).getByRole('button', { name: /^Delete/ }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(li).getByRole('button', { name: /Confirm delete/ }));
    expect(onDelete).toHaveBeenCalledWith('calm');
  });

  it('lets tombstones be edited and deleted but not cancelled again', () => {
    const g = grave('Dead', -DAY, { status: 'cancelled', cancelledAt: NOW.toISOString() });
    renderScene([g]);
    const li = screen.getByRole('listitem', { name: /Dead/ });
    li.focus();
    fireEvent.keyDown(li, { key: 'Enter' });
    expect(within(li).getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(within(li).getByRole('button', { name: /^Delete/ })).toBeInTheDocument();
    expect(within(li).queryByRole('button', { name: /I cancelled/ })).not.toBeInTheDocument();
  });

  it('exports all active graves', () => {
    const onExport = vi.fn();
    renderScene(ALL, { onExport });
    fireEvent.click(screen.getByRole('button', { name: 'Export all active to calendar' }));
    const [list, name] = onExport.mock.calls[0]!;
    expect(name).toBe('trial-graveyard.ics');
    expect(list.every((x: GraveData) => x.status === 'active')).toBe(true);
    expect(list).toHaveLength(5);
  });

  it('announces every simultaneous stage change', () => {
    const g = [grave('Phantomflix', 50 * HOUR), grave('Hollowtv', 50 * HOUR)];
    const { rerender } = renderScene(g);
    rerender(
      <Scene graves={g} now={new Date(NOW.getTime() + 3 * HOUR)} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />,
    );
    const live = screen.getByTestId('scene-live');
    expect(live).toHaveTextContent('Phantomflix is now Zombie');
    expect(live).toHaveTextContent('Hollowtv is now Zombie');
  });
});

describe('reduced motion', () => {
  const animated = () => document.querySelectorAll('[data-motion="animated"]');

  it('uses animated variants by default', () => {
    renderScene(ALL);
    expect(animated().length).toBeGreaterThan(0);
  });

  it('renders static poses, no canvas and no looping animation when reduced', () => {
    mockMatchMedia(true);
    renderScene(ALL);
    expect(animated()).toHaveLength(0);
    expect(document.querySelector('canvas')).toBeNull();
    expect(screen.getAllByTestId('zombie-pose')).toHaveLength(2);
    // Urgency still shown as text and in the front row.
    expect(screen.getByText(/^Zombie, charges in 5 hours/)).toBeInTheDocument();
    expect(document.querySelector('[data-row="front"]')!.children).toHaveLength(2);
  });

  it('reacts when the preference changes', () => {
    const set = mockMatchMedia(false);
    renderScene(ALL);
    expect(animated().length).toBeGreaterThan(0);
    set(true);
    expect(animated()).toHaveLength(0);
    set(false);
    expect(animated().length).toBeGreaterThan(0);
  });

  it('honours an explicit reducedMotion prop over the OS setting', () => {
    renderScene(ALL, { reducedMotion: true });
    expect(animated()).toHaveLength(0);
  });

  it('still fades tombstones in with opacity only', async () => {
    mockMatchMedia(true);
    const g = grave('Hollowtv', DAY);
    const { rerender } = renderScene([g]);
    rerender(<Scene graves={[{ ...g, status: 'cancelled' }]} now={NOW} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);
    await waitFor(() => expect(screen.getByText(/Here lies Hollowtv/)).toBeInTheDocument());
  });
});

describe('Fog', () => {
  function stubCanvas() {
    const ctx = {
      clearRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillRect: vi.fn(),
      fillStyle: '',
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement['getContext'];
    return ctx;
  }
  const setHidden = (hidden: boolean) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
    setHidden(false);
  });

  it('never creates more than the particle cap', () => {
    expect(createParticlesForTest(10_000, 640, 320)).toHaveLength(MAX_FOG_PARTICLES);
    expect(createParticlesForTest(-5, 640, 320)).toHaveLength(0);
    stubCanvas();
    render(<Fog count={10_000} reduced={false} />);
    expect(document.querySelector('canvas')).toHaveAttribute('data-particle-count', String(MAX_FOG_PARTICLES));
  });

  it('draws, pauses while hidden, resumes when visible and stops on unmount', () => {
    const ctx = stubCanvas();
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => callbacks.push(cb));
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { unmount } = render(<Fog reduced={false} />);
    expect(raf).toHaveBeenCalledTimes(1);
    act(() => callbacks.shift()!(0));
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillRect.mock.calls.length).toBeLessThanOrEqual(MAX_FOG_PARTICLES);
    expect(raf).toHaveBeenCalledTimes(2);

    setHidden(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    setHidden(false);
    expect(raf).toHaveBeenCalledTimes(3);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('does not start a loop when motion is reduced', () => {
    stubCanvas();
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    render(<Fog reduced />);
    expect(raf).not.toHaveBeenCalled();
    expect(screen.getByTestId('fog')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('canvas')).toBeNull();
  });
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

describe('accessible list', () => {
  it('mirrors every grave with one focusable list item and the same labels', () => {
    renderScene(ALL);
    const lists = screen.getAllByRole('list');
    expect(lists.every((l) => l.getAttribute('aria-label'))).toBe(true);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(ALL.length);
    for (const g of ALL) {
      const matches = listItems.filter((li) => li.dataset.itemId === g.id);
      expect(matches).toHaveLength(1);
      expect(matches[0]!.getAttribute('aria-label')).toMatch(new RegExp(`^${g.name}, `));
    }
  });
});

describe('hover and focus', () => {
  it('starts a second-by-second countdown on hover and stops when the pointer leaves', () => {
    renderScene(ALL);
    const zombie = screen.getByRole('listitem', { name: /Zombie One/ });
    expect(within(zombie).queryByTestId('ticker')).toBeNull();
    fireEvent.pointerEnter(zombie);
    expect(within(zombie).getByTestId('ticker')).toHaveTextContent('05:00:00');
    fireEvent.pointerLeave(zombie);
    expect(within(zombie).queryByTestId('ticker')).toBeNull();
  });

  it('shows the countdown on keyboard focus too, but never when motion is reduced', () => {
    renderScene(ALL);
    const zombie = screen.getByRole('listitem', { name: /Zombie One/ });
    act(() => zombie.focus());
    expect(within(zombie).getByTestId('ticker')).toBeInTheDocument();
    act(() => zombie.blur());
    expect(within(zombie).queryByTestId('ticker')).toBeNull();
    cleanup();
    renderScene(ALL, { reducedMotion: true });
    fireEvent.pointerEnter(screen.getByRole('listitem', { name: /Zombie One/ }));
    expect(screen.queryByTestId('ticker')).toBeNull();
  });

  it('formats ticks with days only when needed', () => {
    expect(formatTick(5 * HOUR)).toBe('05:00:00');
    expect(formatTick(2 * DAY + 3_723_000)).toBe('2d 01:02:03');
    expect(formatTick(-5)).toBe('00:00:00');
  });
});

describe('summon', () => {
  const g = grave('Phantomflix', 20 * DAY);
  const added = grave('Hollowtv', 10 * DAY);

  it('bursts soil and writes the engraving in for a grave added after the first render', () => {
    vi.useFakeTimers();
    const { rerender } = renderScene([g]);
    expect(screen.queryByTestId('soil-burst')).toBeNull();
    rerender(<Scene graves={[g, added]} now={NOW} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);
    const li = screen.getByRole('listitem', { name: /Hollowtv/ });
    expect(within(li).getByTestId('soil-burst')).toBeInTheDocument();
    expect(li.querySelector('text[data-motion="animated"]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(SUMMON_MS + 1);
    });
    expect(screen.queryByTestId('soil-burst')).toBeNull();
  });

  it('does not summon in reduced motion or while saved graves are still loading', () => {
    const { rerender } = renderScene([g], { reducedMotion: true });
    rerender(<Scene graves={[g, added]} now={NOW} reducedMotion onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);
    expect(screen.queryByTestId('soil-burst')).toBeNull();
    cleanup();
    const second = renderScene([g], { summonNew: false });
    second.rerender(<Scene graves={[g, added]} now={NOW} summonNew={false} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);
    expect(screen.queryByTestId('soil-burst')).toBeNull();
  });
});

describe('bury', () => {
  const g = grave('Necro Audiobooks', 5 * DAY, { priceCents: 1599 });
  const rerenderCancelled = (rerender: ReturnType<typeof renderScene>['rerender'], reducedMotion = false) =>
    rerender(<Scene graves={[{ ...g, status: 'cancelled' }]} now={NOW} reducedMotion={reducedMotion} onCancelled={noop} onKeep={noop} onEdit={noop} onDelete={noop} onExport={noop} />);

  it('floats the saved amount up from the buried grave, then removes the effect', () => {
    vi.useFakeTimers();
    const { rerender } = renderScene([g]);
    rerenderCancelled(rerender);
    expect(screen.getByTestId('bury-fx')).toHaveTextContent('+$15.99 saved');
    act(() => {
      vi.advanceTimersByTime(BURY_FX_MS + 1);
    });
    expect(screen.queryByTestId('bury-fx')).toBeNull();
  });

  it('plays no bury effect in reduced motion', () => {
    const { rerender } = renderScene([g], { reducedMotion: true });
    rerenderCancelled(rerender, true);
    expect(screen.queryByTestId('bury-fx')).toBeNull();
  });
});

describe('wandering ghost', () => {
  it('drifts across and flees when clicked', async () => {
    renderScene(ALL, { wanderDelayMs: 0 });
    const ghost = await screen.findByTestId('wandering-ghost');
    expect(ghost).toHaveAttribute('data-phase', 'drift');
    expect(ghost.closest('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.click(ghost);
    expect(screen.getByTestId('wandering-ghost')).toHaveAttribute('data-phase', 'flee');
  });

  it('never appears when motion is reduced', async () => {
    renderScene(ALL, { wanderDelayMs: 0, reducedMotion: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('wandering-ghost')).toBeNull();
  });
});

describe('restless mapping', () => {
  it('maps urgency to glow, cracks, hand and ghost', () => {
    renderScene(ALL);
    const levels = Object.fromEntries(items().map((li) => [li.dataset.itemId, li.querySelector('[data-level]')?.getAttribute('data-level')]));
    expect(levels).toEqual({
      'sealed-one': 'calm',
      'cracked-one': 'calm',
      'churning-one': 'restless',
      'zombie-one': 'rising',
      'overdue-one': 'rising',
      'dead-one': 'calm',
      'kept-one': 'ghost',
    });
    expect(screen.getAllByTestId('zombie-pose')).toHaveLength(2);
  });
});
