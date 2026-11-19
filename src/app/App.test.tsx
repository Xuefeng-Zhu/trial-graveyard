import 'fake-indexeddb/auto';
import { clear } from 'idb-keyval';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGraveStore } from '../state/store';
import { NO_CANCEL_URL_TEXT, EMPTY_MAUSOLEUM_TEXT } from '../features/daylight/DaylightList';
import { App } from './App';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const clock = () => NOW;

function setup() {
  let n = 0;
  const store = createGraveStore({ newId: () => `id-${++n}` });
  render(<App store={store} clock={clock} />);
  return store;
}

/** Waits for async hydration so later state updates do not land outside act. */
async function settle(store: ReturnType<typeof setup>) {
  await act(async () => {
    await store.persist.rehydrate();
  });
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function addTrial(name: string, date: string, price: string, url = '', cadence = '') {
  type('Name', name);
  type('Charge date', date);
  type('Price', price);
  if (url) type('Cancel URL (optional)', url);
  if (cadence) type('Cadence', cadence);
  fireEvent.click(screen.getByRole('button', { name: /bury it/i }));
}

beforeEach(async () => {
  await clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('App end to end in the list view', () => {
  it('adds a grave and lists it with stage text and a safe cancel link', () => {
    setup();
    addTrial('Netflix', '2026-10-02', '15.49', 'https://netflix.com/cancel');
    const item = screen.getByRole('listitem', { name: /Netflix/ });
    expect(within(item).getByText(/Zombie, charges in \d+ hours/)).toBeInTheDocument();
    const link = within(item).getByRole('link', { name: /Cancel now/ });
    expect(link).toHaveAttribute('href', 'https://netflix.com/cancel');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('disables Cancel now with an explanation when there is no URL', () => {
    setup();
    addTrial('Hulu', '2026-10-20', '7.99');
    const button = screen.getByRole('button', { name: 'Cancel now' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(NO_CANCEL_URL_TEXT);
  });

  it('sorts by charge date', () => {
    setup();
    addTrial('Later', '2026-12-01', '1');
    addTrial('Sooner', '2026-10-10', '1');
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Sooner', 'Later']);
  });

  it('cancels with epitaph, updates the Mausoleum, and undoes', () => {
    setup();
    expect(screen.getByText(EMPTY_MAUSOLEUM_TEXT)).toBeInTheDocument();
    addTrial('Audible', '2026-10-20', '14.95');
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    expect(screen.getByText('Here lies Audible. Saved you $14.95/mo.')).toBeInTheDocument();
    expect(screen.getByText('$14.95')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText(/Here lies/)).not.toBeInTheDocument();
    expect(screen.getByText(EMPTY_MAUSOLEUM_TEXT)).toBeInTheDocument();
  });

  it('keeps a grave as a ghost with its monthly cost', () => {
    setup();
    addTrial('Calm', '2026-10-20', '60', '', 'yearly');
    fireEvent.click(screen.getByRole('button', { name: /Keep it/ }));
    expect(screen.getByText(/Ghost, haunting you for \$5\.00\/mo/)).toBeInTheDocument();
  });

  it('hides the undo toast after 10 seconds', () => {
    vi.useFakeTimers();
    try {
      setup();
      addTrial('Audible', '2026-10-20', '14.95');
      fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(10_001);
      });
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('edits and deletes a grave', () => {
    setup();
    addTrial('Netflx', '2026-10-20', '5');
    fireEvent.click(screen.getByRole('button', { name: /^Edit/ }));
    expect(screen.getByLabelText('Name')).toHaveValue('Netflx');
    type('Name', 'Netflix');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Netflix' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm delete/ }));
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('exports one grave and all active graves as .ics', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    addTrial('Netflix', '2026-10-20', '5');
    fireEvent.click(screen.getByRole('button', { name: /Add to calendar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Export all active to calendar' }));
    expect(blobs).toHaveLength(2);
    const text = await blobs[0]!.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('SUMMARY:Cancel Netflix before $5.00 charge');
  });
});

describe('Daylight toggle and demo', () => {
  it('summons the demo graveyard covering every stage, a tombstone and a ghost', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    for (const text of [/^Sealed/, /^Cracked/, /^Churning/, /^Zombie/, /^Overdue/, /^Tombstone/, /^Ghost/]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it('toggles Daylight mode with the keyboard-reachable button and persists it', async () => {
    const store = setup();
    const toggle = screen.getByRole('button', { name: 'Daylight mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('night');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('daylight');
    await waitFor(() => expect(store.getState().settings.daylight).toBe(true));

    cleanup();
    const reloaded = createGraveStore();
    render(<App store={reloaded} clock={clock} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Daylight mode' })).toHaveAttribute('aria-pressed', 'true'),
    );
  });

  it('shows a dismissible notice from the store', () => {
    const store = setup();
    act(() => {
      store.setState({ notice: 'Data will not be saved.' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Data will not be saved.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('accessibility', () => {
  it.each([
    ['daylight off', false],
    ['daylight on', true],
  ])('has no axe violations with the demo loaded (%s)', async (_n, daylight) => {
    const store = setup();
    await settle(store);
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    if (daylight) fireEvent.click(screen.getByRole('button', { name: 'Daylight mode' }));
    expect(store.getState().settings.daylight).toBe(daylight);
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });

  it('has no axe violations when the form shows errors', async () => {
    await settle(setup());
    fireEvent.click(screen.getByRole('button', { name: /bury it/i }));
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
