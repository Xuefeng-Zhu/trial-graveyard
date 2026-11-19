/// <reference types="node" />
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { clear } from 'idb-keyval';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import type { Grave } from '../../domain/trial';
import { createGraveStore } from '../../state/store';
import { addTrial, goTo } from '../../test-utils/appActions';
import { CountdownHero } from './CountdownHero';
import { ExorcismPanel } from './ExorcismPanel';
import { StatsPanel } from './StatsPanel';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function grave(name: string, offsetMs: number, extra: Partial<Grave> = {}): Grave {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    chargeAt: new Date(NOW.getTime() + offsetMs).toISOString(),
    priceCents: 1549,
    currency: 'USD',
    cadence: 'monthly',
    status: 'active',
    createdAt: new Date(NOW.getTime() - 2 * DAY).toISOString(),
    ...extra,
  };
}

beforeEach(async () => {
  await clear();
});
afterEach(cleanup);

describe('CountdownHero', () => {
  it.each([
    ['calm', 10 * DAY],
    ['uneasy', 5 * DAY],
    ['restless', 2 * DAY],
    ['rising', 5 * HOUR],
  ])('shows the %s urgency state', (level, offset) => {
    render(<CountdownHero graves={[grave('Phantomflix', offset)]} now={NOW} />);
    expect(screen.getByRole('region', { name: 'Next to bite' })).toHaveAttribute('data-urgency', level);
    expect(screen.getByText('Phantomflix')).toBeInTheDocument();
    expect(screen.getByText('$15.49')).toBeInTheDocument();
  });

  it('shows turns in Xd Yh for the nearest trial', () => {
    render(<CountdownHero graves={[grave('Far', 9 * DAY), grave('Near', 2 * DAY + 5 * HOUR)]} now={NOW} />);
    expect(screen.getByTestId('hero-countdown')).toHaveTextContent('turns in 2d 5h');
    expect(screen.getByText('Near')).toBeInTheDocument();
  });

  it('renders nothing without an upcoming trial', () => {
    const { container } = render(<CountdownHero graves={[grave('Gone', -DAY)]} now={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stills the animation when reduced motion is requested', () => {
    render(<CountdownHero graves={[grave('Soon', HOUR)]} now={NOW} reducedMotion />);
    expect(screen.getByRole('region', { name: 'Next to bite' })).toHaveAttribute('data-motion', 'still');
  });

  it('has no axe violations', async () => {
    const { container } = render(<CountdownHero graves={[grave('Soon', HOUR)]} now={NOW} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('countdown text color', () => {
  const css = readFileSync('src/features/haunting/haunting.module.css', 'utf8');
  it('uses a text-safe token for the calm countdown, not the border color', () => {
    expect(css).toMatch(/\.hero \{[^}]*--pulse-text: var\(--stage-sealed\);/);
    expect(css).toMatch(/\.heroCountdown \{[^}]*color: var\(--pulse-text\);/);
    expect(css).not.toMatch(/\.heroCountdown \{[^}]*color: var\(--pulse\);/);
  });
});

describe('StatsPanel', () => {
  it('shows four labelled stats', () => {
    const graves = [
      grave('Saved', 5 * DAY, { status: 'cancelled', cancelledAt: NOW.toISOString() }),
      grave('Escaped', -DAY),
    ];
    render(<StatsPanel graves={graves} now={NOW} />);
    const stats = screen.getByRole('region', { name: 'Trial hacker stats' });
    for (const label of [
      'Trials survived (cancelled)',
      'Dollars dodged',
      'Average days used before cancelling',
      'Overdue trials',
    ]) {
      expect(within(stats).getByText(label)).toBeInTheDocument();
    }
    expect(within(stats).getByText('$15.49')).toBeInTheDocument();
    expect(within(stats).getByText('2.0 days')).toBeInTheDocument();
  });

  it('is calm with no data', async () => {
    const { container } = render(<StatsPanel graves={[]} now={NOW} />);
    expect(screen.getByText('None yet')).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('ExorcismPanel', () => {
  it('shows the guide, closes with Escape and confirms with a button', () => {
    const onClose = vi.fn();
    const onExorcised = vi.fn();
    const g = grave('Phantomflix', DAY);
    render(<ExorcismPanel grave={g} onExorcised={onExorcised} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Exorcise Phantomflix' });
    expect(dialog).toHaveFocus();
    const link = within(dialog).getByRole('link', { name: /Open the cancel page/ });
    expect(link).toHaveAttribute('href', 'https://phantomflix.example/account/cancel');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: "It's exorcised" }));
    expect(onExorcised).toHaveBeenCalledWith(g.id);
  });

  it('uses the generic guide and a search link for unknown services', () => {
    render(<ExorcismPanel grave={grave('Mystery', DAY)} onExorcised={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Search the web for how to cancel Mystery/ })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/search'),
    );
    expect(screen.queryByRole('link', { name: /Open the cancel page/ })).not.toBeInTheDocument();
    expect(screen.getByText(/steps are generic/)).toBeInTheDocument();
  });

  it('keeps Tab focus inside the dialog', () => {
    render(<ExorcismPanel grave={grave('Mystery', DAY)} onExorcised={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Close' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(screen.getByRole('link', { name: /Search the web/ })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'a' });
  });

  it('has no axe violations', async () => {
    const { container } = render(<ExorcismPanel grave={grave('Phantomflix', DAY)} onExorcised={vi.fn()} onClose={vi.fn()} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('ExorcismPanel focus', () => {
  it('restores focus to the opener on close, but not after confirming', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const closed = render(<ExorcismPanel grave={grave('Mystery', DAY)} onExorcised={vi.fn()} onClose={vi.fn()} />);
    closed.unmount();
    expect(opener).toHaveFocus();

    const other = document.createElement('button');
    document.body.append(other);
    const confirmedView = render(<ExorcismPanel grave={grave('Mystery', DAY)} onExorcised={vi.fn()} onClose={vi.fn()} />);
    other.focus();
    fireEvent.click(screen.getByRole('button', { name: "It's exorcised" }));
    confirmedView.unmount();
    expect(opener).not.toHaveFocus();
    opener.remove();
    other.remove();
  });
});

describe.each([
  ['daylight list', true],
  ['night scene', false],
])('App wiring in the %s', (_name, daylight) => {
  function setup() {
    let n = 0;
    const store = createGraveStore({ newId: () => `id-${++n}` });
    store.setState((s) => ({ settings: { ...s.settings, daylight } }));
    render(<App store={store} clock={() => NOW} />);
    return store;
  }

  const open = () => {
    // In the scene the actions open in the details panel; in the list they are always visible.
    if (!daylight) fireEvent.click(screen.getByRole('button', { name: /Phantomflix/ }));
  };

  it('shows hero and stats, downloads hauntings and exorcises with souls saved', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const store = setup();
    await act(async () => {
      await store.persist.rehydrate();
    });
    addTrial('Phantomflix', '2026-10-20', '15.49');

    goTo('Savings');
    expect(screen.getByRole('region', { name: 'Next to bite' })).toHaveTextContent('Phantomflix');
    expect(screen.getByRole('region', { name: 'Trial hacker stats' })).toBeInTheDocument();
    goTo('Graveyard');

    open();
    fireEvent.click(screen.getByRole('button', { name: /Add haunting to calendar/ }));
    goTo('Savings');
    fireEvent.click(screen.getByRole('button', { name: 'Export all hauntings' }));
    expect(blobs).toHaveLength(2);
    const text = await blobs[0]!.text();
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(text.match(/BEGIN:VALARM/g)).toHaveLength(2);

    goTo('Graveyard');
    open();
    fireEvent.click(screen.getByRole('button', { name: /^Exorcise\s*(Trial\s*)?Phantomflix/ }));
    const dialog = screen.getByRole('dialog', { name: 'Exorcise Phantomflix' });
    fireEvent.click(within(dialog).getByRole('button', { name: "It's exorcised" }));
    expect(screen.queryByRole('dialog', { name: 'Exorcise Phantomflix' })).not.toBeInTheDocument();
    await waitFor(() => expect(store.getState().graves[0]?.status).toBe('cancelled'));
    goTo('Savings');
    expect(screen.getByTestId('mausoleum-total')).toHaveTextContent('Souls saved: $15.49');
    expect(within(screen.getByRole('region', { name: 'Trial hacker stats' })).getByText('Trials survived (cancelled)').nextSibling).toHaveTextContent('1');
  });
});

describe('night scene focus after exorcism', () => {
  it('moves focus to the details panel, now showing the cancelled trial', async () => {
    const store = createGraveStore({ newId: () => 'id-1' });
    store.setState((s) => ({ settings: { ...s.settings, daylight: false } }));
    render(<App store={store} clock={() => NOW} />);
    await act(async () => {
      await store.persist.rehydrate();
    });
    addTrial('Phantomflix', '2026-10-20', '15.49');
    fireEvent.click(screen.getByRole('button', { name: /Phantomflix/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Exorcise\s*Trial\s*Phantomflix/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: /^Exorcise/ })).getByRole('button', { name: "It's exorcised" }));
    await waitFor(() => {
      const el = document.activeElement as HTMLElement;
      expect(el).toHaveAttribute('role', 'dialog');
      expect(el.dataset.kind).toBe('cancelled');
    });
  });

  it('exorcises the selected trial while another stays active', async () => {
    const store = createGraveStore();
    store.setState((s) => ({
      settings: { ...s.settings, daylight: false },
      graves: [grave('Phantomflix', -DAY), grave('Wraithwave', -2 * DAY)],
    }));
    render(<App store={store} clock={() => NOW} />);
    await act(async () => {
      await store.persist.rehydrate();
    });
    fireEvent.click(screen.getByRole('button', { name: /Phantomflix/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Exorcise\s*Trial\s*Phantomflix/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: /^Exorcise/ })).getByRole('button', { name: "It's exorcised" }));
    await waitFor(() => expect(document.activeElement).toHaveAttribute('role', 'dialog'));
    expect(store.getState().graves.map((g) => [g.name, g.status])).toEqual([
      ['Phantomflix', 'cancelled'],
      ['Wraithwave', 'active'],
    ]);
  });
});
