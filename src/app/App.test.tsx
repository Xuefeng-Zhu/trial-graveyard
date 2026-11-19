import 'fake-indexeddb/auto';
import { clear } from 'idb-keyval';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGraveStore } from '../state/store';
import { NO_CANCEL_URL_TEXT, EMPTY_MAUSOLEUM_TEXT } from '../features/daylight/DaylightList';
import { NAV_ITEMS } from '../features/cemetery';
import { App } from './App';
import { isSoundEnabled, setSoundEnabled } from '../design/sounds';
import { addTrial, goTo } from '../test-utils/appActions';

const NOW = new Date(2026, 9, 1, 12, 0, 0);
const clock = () => NOW;

/** Most tests exercise the plain list, so Daylight mode is on unless a test asks for the scene. */
function setup(daylight = true) {
  let n = 0;
  const store = createGraveStore({ newId: () => `id-${++n}` });
  if (daylight) store.setState((s) => ({ settings: { ...s.settings, daylight: true } }));
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

const stone = (name: RegExp | string) => {
  const grid = screen.getByRole('list', { name: 'Gravestones' });
  return within(grid).getByRole('button', { name });
};

const originalMatchMedia = window.matchMedia;
function mockMedia(narrow: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: narrow && q.includes('max-width'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(async () => {
  await clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  delete document.documentElement.dataset.theme;
});

describe('App end to end in the list view', () => {
  it('adds a grave and lists it with stage text and a safe cancel link', () => {
    setup();
    addTrial('Phantomflix', '2026-10-02', '15.49', 'https://phantomflix.example/cancel');
    const item = screen.getByRole('listitem', { name: /Phantomflix/ });
    expect(within(item).getByText(/Zombie, charges in \d+ hours/)).toBeInTheDocument();
    const link = within(item).getByRole('link', { name: /Cancel now/ });
    expect(link).toHaveAttribute('href', 'https://phantomflix.example/cancel');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('disables Cancel now with an explanation when there is no URL', () => {
    setup();
    addTrial('Hexlingo', '2026-10-20', '7.99');
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
    addTrial('Banshee Box', '2026-10-20', '14.95');
    expect(screen.getByText(EMPTY_MAUSOLEUM_TEXT)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    expect(screen.getByText('Here lies Banshee Box. Saved you $14.95/mo.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Mausoleum' })).getByText('$14.95')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText(/Here lies/)).not.toBeInTheDocument();
    expect(screen.getByText(EMPTY_MAUSOLEUM_TEXT)).toBeInTheDocument();
  });

  it('keeps a grave as a ghost with its monthly cost', () => {
    setup();
    addTrial('Grimoire+', '2026-10-20', '60', '', 'yearly');
    fireEvent.click(screen.getByRole('button', { name: /Keep it/ }));
    expect(screen.getByText(/Ghost, haunting you for \$5\.00\/mo/)).toBeInTheDocument();
  });

  it('hides the undo toast after 10 seconds', () => {
    vi.useFakeTimers();
    try {
      setup();
      addTrial('Banshee Box', '2026-10-20', '14.95');
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
    type('Name', 'Phantomflix');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Phantomflix' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm delete/ }));
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('offers Undo after deleting a grave and restores it', () => {
    setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm delete/ }));
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Phantomflix was deleted.');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Phantomflix' })).toBeInTheDocument();
  });

  it('warns about a duplicate and lets the user bury anyway', () => {
    const store = setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    addTrial('phantomflix', '2026-10-20', '5');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('already has a grave');
    expect(store.getState().graves).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Bury anyway' }));
    expect(store.getState().graves).toHaveLength(2);
  });

  it('opens the existing grave from the duplicate warning', () => {
    const store = setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    addTrial('Phantomflix', '2026-10-20', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Open existing' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(store.getState().graves).toHaveLength(1);
  });

  it('summoning the demo twice does not duplicate graves', () => {
    const store = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    goTo('Settings');
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(store.getState().graves).toHaveLength(8);
  });

  it('clears all data only after typing the confirmation', () => {
    const store = setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    goTo('Settings');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all data' }));
    const confirm = screen.getByRole('button', { name: 'Clear everything' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: 'DELETE' } });
    fireEvent.click(confirm);
    expect(store.getState().graves).toHaveLength(0);
  });

  it('imports a backup file with merge', async () => {
    const store = setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    goTo('Settings');
    const backup = JSON.stringify({
      version: 1,
      graves: [{ id: 'x1', name: 'Wraithwave', chargeAt: '2026-10-25T09:00:00-07:00', priceCents: 500, currency: 'USD', cadence: 'monthly', status: 'active', createdAt: '2026-10-01T09:00:00-07:00' }],
      settings: store.getState().settings,
    });
    const file = new File([backup], 'b.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(backup) });
    fireEvent.change(screen.getByLabelText('Graveyard backup file'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Merge' }));
    expect(store.getState().graves.map((g) => g.name)).toEqual(['Phantomflix', 'Wraithwave']);
  });

  it('rejects an invalid backup file without changing data', async () => {
    const store = setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    goTo('Settings');
    const file = new File(['{"nope":1}'], 'b.json');
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('{"nope":1}') });
    fireEvent.change(screen.getByLabelText('Graveyard backup file'), { target: { files: [file] } });
    expect(await screen.findByText(/not a valid graveyard backup/)).toBeInTheDocument();
    expect(store.getState().graves).toHaveLength(1);
  });

  it('exports all active graves as .ics', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    addTrial('Phantomflix', '2026-10-20', '5');
    fireEvent.click(screen.getByRole('button', { name: /Add to calendar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Export all active to calendar' }));
    expect(blobs).toHaveLength(2);
    const text = await blobs[0]!.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('SUMMARY:Cancel Phantomflix before $5.00 charge');
  });
});

describe('pixel graveyard scene', () => {
  it('edits, deletes and exports from the night-mode scene', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const store = setup(false);
    await settle(store);
    addTrial('Netflx', '2026-10-20', '5');
    goTo('Savings');
    fireEvent.click(screen.getByRole('button', { name: 'Export all active to calendar' }));
    expect(blobs).toHaveLength(1);
    goTo('Graveyard');
    fireEvent.click(stone(/Netflx/));
    fireEvent.click(screen.getByRole('button', { name: /^Add to calendar/ }));
    expect(blobs).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /^Edit/ }));
    expect(screen.getByLabelText('Name')).toHaveValue('Netflx');
    type('Name', 'Phantomflix');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    fireEvent.click(stone(/Phantomflix/));
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm delete/ }));
    expect(store.getState().graves).toHaveLength(0);
  });

  it('shows the scene by default and swaps to the list in Daylight mode', async () => {
    const store = setup(false);
    await settle(store);
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(screen.getByRole('region', { name: 'Graveyard scene' })).toBeInTheDocument();
    goTo('Settings');
    fireEvent.click(screen.getByRole('button', { name: 'Daylight mode' }));
    goTo('Graveyard');
    expect(screen.queryByRole('region', { name: 'Graveyard scene' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('cancels from the details panel and updates the savings', async () => {
    const store = setup(false);
    await settle(store);
    addTrial('Phantomflix', '2026-10-02', '15.49');
    fireEvent.click(stone(/Phantomflix/));
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    expect(screen.getByText('Here lies Phantomflix · $15.49/mo · slain Oct 2026')).toBeInTheDocument();
    expect(screen.getByTestId('saved-counter')).toHaveTextContent('$15.49 saved');
    goTo('Savings');
    expect(screen.getByTestId('mausoleum-total')).toHaveTextContent('Souls saved: $15.49');
  });

  it('renders every visual state with text labels', async () => {
    const store = setup(false);
    await settle(store);
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    const kinds = new Set(
      within(screen.getByRole('list', { name: 'Gravestones' }))
        .getAllByRole('button')
        .map((b) => b.getAttribute('data-kind')),
    );
    expect([...kinds].sort()).toEqual(['cancelled', 'critical', 'kept', 'normal', 'warning']);
    const grid = screen.getByRole('list', { name: 'Gravestones' });
    expect(within(grid).getByText('Cancelled')).toBeInTheDocument();
    expect(within(grid).getByText('Kept')).toBeInTheDocument();
    expect(within(grid).getByText('Overdue')).toBeInTheDocument();
    expect(within(grid).getByText('60h left')).toBeInTheDocument();
    expect(within(grid).getByText('20 days')).toBeInTheDocument();
    expect(within(grid).getAllByTestId('sparks').length).toBeGreaterThan(0);
    expect(within(grid).getAllByTestId('zombie-hand').length).toBeGreaterThan(0);
  });

  it('uses only fictional brands in the demo graveyard', async () => {
    const store = setup(false);
    await settle(store);
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    const names = store.getState().graves.map((g) => g.name);
    expect(names).toEqual(expect.arrayContaining(['Phantomflix', 'Cryptic Cloud', 'Banshee Box']));
    for (const real of ['Netflix', 'Spotify', 'Adobe', 'Notion', 'Disney', 'Dropbox', 'Calm', 'Hulu']) {
      expect(names.join(' ')).not.toContain(real);
    }
  });
});

describe('selection and the details panel', () => {
  async function withGrave(narrow = false) {
    mockMedia(narrow);
    const store = setup(false);
    await settle(store);
    addTrial('Phantomflix', '2026-10-20', '15.49', 'https://phantomflix.example/cancel');
    addTrial('Wraithwave', '2026-11-20', '9.99');
    return store;
  }

  it('selects with a click, shows the details and awards review XP once', async () => {
    const store = await withGrave();
    const tile = stone(/Phantomflix/);
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    const panel = screen.getByRole('dialog', { name: 'Phantomflix' });
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(panel).toHaveFocus();
    for (const text of ['Price', 'Cadence', 'Next charge', 'Remaining', 'Status', 'Reminders', /48 hours before/, /Morning of/]) {
      expect(within(panel).getByText(text)).toBeInTheDocument();
    }
    expect(within(panel).getByRole('link', { name: /Cancel now/ })).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(tile);
    expect(store.getState().progress.ledger.filter((e) => e.kind === 'review')).toHaveLength(1);
  });

  it('lays the details out with a title bar, a close icon and a primary Exorcise button', async () => {
    await withGrave();
    fireEvent.click(stone(/Phantomflix/));
    const panel = screen.getByRole('dialog', { name: 'Phantomflix' });
    const heading = within(panel).getByRole('heading', { name: 'Phantomflix' });
    const head = heading.parentElement as HTMLElement;
    expect(within(head).getByRole('button', { name: /^Close details for Phantomflix/ })).toBeInTheDocument();
    expect(within(panel).getAllByText(/^(Price|Cadence|Next charge|Remaining|Status)$/)).toHaveLength(5);
    const exorcise = within(panel).getByRole('button', { name: /^Exorcise Trial/ });
    expect(exorcise.className).toMatch(/primary/);
  });

  it('moves between gravestones with the arrow keys', async () => {
    await withGrave();
    const first = stone(/Phantomflix/);
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(stone(/Wraithwave/)).toHaveFocus();
    fireEvent.keyDown(stone(/Wraithwave/), { key: 'ArrowLeft' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'a' });
  });

  it('closes with Escape and returns focus to the gravestone', async () => {
    await withGrave();
    const tile = stone(/Wraithwave/);
    tile.focus();
    fireEvent.click(tile);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(tile).toHaveFocus());
    fireEvent.click(tile);
    fireEvent.click(screen.getByRole('button', { name: /^Close/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a modal bottom sheet on narrow screens and traps focus', async () => {
    await withGrave(true);
    fireEvent.click(stone(/Phantomflix/));
    const panel = screen.getByRole('dialog', { name: 'Phantomflix' });
    expect(panel).toHaveAttribute('aria-modal', 'true');
    const buttons = within(panel).getAllByRole('button');
    const links = within(panel).queryAllByRole('link');
    const items = [...links, ...buttons];
    const first = items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0]!;
    const last = buttons[buttons.length - 1]!;
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    panel.focus();
    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(panel, { key: 'Tab' });
    fireEvent.click(document.querySelector('[aria-hidden="true"][class*="scrim"]')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('drops the selection when the selected trial is deleted', async () => {
    await withGrave();
    fireEvent.click(stone(/Phantomflix/));
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Keep grave/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm delete/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no axe violations with the panel open', async () => {
    await withGrave();
    fireEvent.click(stone(/Phantomflix/));
    expect((await axe(document.body)).violations).toEqual([]);
  });
});

describe('Exorcise flow', () => {
  it('opens the ritual from the HUD and only cancels after the user confirms', async () => {
    const store = setup(false);
    await settle(store);
    addTrial('Phantomflix', '2026-10-20', '15.49', 'https://phantomflix.example/cancel');
    expect(screen.getByRole('button', { name: 'Exorcise Trials (1)' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Exorcise Trials (1)' }));
    const dialog = screen.getByRole('dialog', { name: 'Exorcise Phantomflix' });
    expect(store.getState().graves[0]?.status).toBe('active');
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(store.getState().graves[0]?.status).toBe('active');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(stone(/Phantomflix/));
    fireEvent.click(screen.getByRole('button', { name: /^Exorcise\s*Trial\s*Phantomflix/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Exorcise Phantomflix' })).getByRole('button', { name: "It's exorcised" }));
    expect(store.getState().graves[0]?.status).toBe('cancelled');
    expect(store.getState().progress.ledger.some((e) => e.kind === 'cancel')).toBe(true);
    expect(screen.getByRole('button', { name: /Exorcise Trials \(0\)/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Exorcise Trials \(0\)/ })).toHaveAccessibleDescription(
      'No active trials to exorcise.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(store.getState().graves[0]?.status).toBe('active');
  });

  it('opens the most urgent trial first', async () => {
    const store = setup(false);
    await settle(store);
    addTrial('Later One', '2026-10-20', '5');
    addTrial('Phantomflix', '2026-10-02', '15.49');
    fireEvent.click(screen.getByRole('button', { name: 'Exorcise Trials (2)' }));
    expect(screen.getByRole('dialog', { name: 'Exorcise Phantomflix' })).toBeInTheDocument();
  });

  it('opens the ritual from the Quests view as well', async () => {
    await settle(setup(false));
    addTrial('Phantomflix', '2026-10-02', '15.49');
    goTo('Quests');
    fireEvent.click(screen.getByRole('button', { name: 'Exorcise Phantomflix' }));
    expect(screen.getByRole('dialog', { name: 'Exorcise Phantomflix' })).toBeInTheDocument();
  });
});

describe('navigation and views', () => {
  it('every nav item opens a different view', async () => {
    const store = setup(false);
    await settle(store);
    act(() => store.getState().loadDemo(NOW));
    const headings: Record<string, RegExp> = {
      Graveyard: /./,
      Quests: /Daily quest/,
      Collection: /Gravestone styles/,
      'Add trial': /Add a trial/,
      Savings: /Mausoleum/,
      Settings: /^Settings$/,
    };
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(Object.keys(headings));
    for (const item of NAV_ITEMS) {
      goTo(item.label);
      expect(screen.getByRole('button', { name: item.label })).toHaveAttribute('aria-current', 'page');
      expect(screen.getAllByRole('button', { current: 'page' })).toHaveLength(1);
      if (item.label !== 'Graveyard') {
        expect(screen.getByRole('heading', { name: headings[item.label]! })).toBeInTheDocument();
      } else {
        expect(screen.getByRole('region', { name: 'Graveyard scene' })).toBeInTheDocument();
      }
    }
  });

  it('the level badge opens the collection and the quest card opens quests', async () => {
    await settle(setup(false));
    addTrial('Phantomflix', '2026-10-20', '15.49');
    fireEvent.click(screen.getByRole('button', { name: /Daily Quest\s*Cancel 1 trial \(0\/1\)/ }));
    expect(screen.getByRole('heading', { name: 'Daily quest' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Level 1/ }));
    expect(screen.getByRole('heading', { name: 'Gravestone styles' })).toBeInTheDocument();
  });

  it('shows level, XP and the daily quest in Quests', async () => {
    await settle(setup(false));
    addTrial('Phantomflix', '2026-10-20', '15.49');
    goTo('Quests');
    expect(screen.getByText('Cancel 1 trial (0/1)')).toBeInTheDocument();
    expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    expect(screen.getByText(/, 10 XP/)).toBeInTheDocument();
    expect(screen.getByText('Phantomflix', { selector: 'strong' })).toBeInTheDocument();
  });

  it('shows an empty quest view with nothing to exorcise', async () => {
    await settle(setup(false));
    goTo('Quests');
    expect(screen.getByText(/Nothing is stirring/)).toBeInTheDocument();
  });

  it('unlocks and selects collectible styles by level', async () => {
    const store = setup(false);
    await settle(store);
    goTo('Collection');
    expect(screen.getByRole('button', { name: 'Classic' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mossy' })).toBeDisabled();
    expect(screen.getAllByText('Unlocks at level 3').length).toBeGreaterThan(0);
    act(() => {
      store.setState((s) => ({
        progress: {
          ...s.progress,
          ledger: Array.from({ length: 12 }, (_, i) => ({ kind: 'cancel' as const, graveId: `g${i}`, at: '2026-10-01T12:00:00-07:00' })),
        },
      }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mossy' }));
    expect(store.getState().progress.styleId).toBe('mossy');
    expect(screen.getByRole('button', { name: 'Mossy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Unlocked').length).toBeGreaterThan(0);
  });

  it('applies the selected style to gravestones', async () => {
    const store = setup(false);
    await settle(store);
    addTrial('Phantomflix', '2026-10-20', '15.49');
    act(() => {
      store.setState((s) => ({ progress: { ...s.progress, styleId: 'obsidian' } }));
    });
    const rect = stone(/Phantomflix/).querySelector('rect[fill="#4A4066"]');
    expect(rect).not.toBeNull();
  });

  it('keeps add, paste, Seance and the form reachable in the Add view', async () => {
    await settle(setup(false));
    goTo('Add trial');
    expect(screen.getAllByLabelText(/Paste a receipt/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add a trial' })).toBeInTheDocument();
  });

  it('does not replay a consumed receipt prefill when Add reopens', async () => {
    await settle(setup(true));
    goTo('Add trial');
    fireEvent.change(screen.getByLabelText(/Paste a receipt/), {
      target: { value: 'Your Phantomflix trial ends 2026-10-20. Then $15.49 per month.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Read the receipt' }));
    await waitFor(() => expect(screen.getByLabelText('Price')).toHaveValue('15.49'));
    fireEvent.click(screen.getByRole('button', { name: /bury it/i }));
    goTo('Add trial');
    expect(screen.getByLabelText('Price')).toHaveValue('');
    expect(screen.getByLabelText('Charge date')).toHaveValue('');
  });

  it('keeps an accessible name on the Add navigation button', () => {
    setup(true);
    expect(screen.getByRole('button', { name: 'Add trial' })).toBeInTheDocument();
  });

  it('cancels editing back to the graveyard', async () => {
    await settle(setup(true));
    addTrial('Phantomflix', '2026-10-20', '15.49');
    fireEvent.click(screen.getByRole('button', { name: /^Edit/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Never mind' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Phantomflix' })).toBeInTheDocument();
  });

  it('shows the share button once a trial is cancelled, with the savings and stats', async () => {
    await settle(setup(false));
    addTrial('Phantomflix', '2026-10-02', '15.49');
    goTo('Savings');
    expect(screen.queryByRole('button', { name: 'Share my graveyard' })).not.toBeInTheDocument();
    goTo('Graveyard');
    fireEvent.click(stone(/Phantomflix/));
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    goTo('Savings');
    expect(screen.getByRole('button', { name: 'Share my graveyard' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trial hacker stats' })).toBeInTheDocument();
  });
});

describe('Calm mode', () => {
  it('turns decorative animation off and persists the choice', async () => {
    const store = setup(false);
    await settle(store);
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(screen.getByRole('region', { name: 'Graveyard scene' })).toHaveAttribute('data-motion', 'animated');
    expect(screen.getByTestId('atmosphere')).toBeInTheDocument();
    goTo('Settings');
    const toggle = screen.getByRole('button', { name: 'Calm mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(store.getState().settings.calm).toBe(true);
    goTo('Graveyard');
    expect(screen.getByRole('region', { name: 'Graveyard scene' })).toHaveAttribute('data-motion', 'still');
    expect(document.querySelectorAll('[data-motion="animated"]')).toHaveLength(0);
    expect(document.querySelector('canvas')).toBeNull();
    expect(screen.queryByTestId('atmosphere')).toBeNull();
  });

  it('shows the saved amount without coins or particles in Calm mode', () => {
    const store = setup();
    store.setState((st) => ({ settings: { ...st.settings, calm: true } }));
    addTrial('Banshee Box', '2026-10-20', '14.95');
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    expect(screen.getByTestId('celebration')).toHaveTextContent('$14.95 saved');
    expect(screen.queryByTestId('celebration-fx')).toBeNull();
  });
});

describe('Cancellation celebration', () => {
  it('floats coins and particles with the saved amount, then clears', () => {
    vi.useFakeTimers();
    setup();
    addTrial('Banshee Box', '2026-10-20', '14.95');
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    expect(screen.getByTestId('celebration-fx')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByTestId('celebration')).toBeNull();
    vi.useRealTimers();
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

  it('summons the demo from Settings and returns to the graveyard', async () => {
    await settle(setup(false));
    addTrial('Phantomflix', '2026-10-20', '15.49');
    goTo('Settings');
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(screen.getByRole('region', { name: 'Graveyard scene' })).toBeInTheDocument();
  });

  it('shows the landing without the form when the graveyard is empty', () => {
    setup();
    expect(screen.getByRole('button', { name: /summon/i })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Grave details' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });

  it('toggles Daylight mode with the keyboard-reachable button and persists it', async () => {
    const store = setup(false);
    goTo('Settings');
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
    goTo('Settings');
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
    const store = setup(daylight);
    await settle(store);
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }));
    expect(store.getState().settings.daylight).toBe(daylight);
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });

  it.each(NAV_ITEMS.map((i) => i.label))('has no axe violations in the %s view', async (label) => {
    const store = setup(false);
    await settle(store);
    act(() => store.getState().loadDemo(NOW));
    goTo(label);
    expect((await axe(document.body)).violations).toEqual([]);
  });

  it('has no axe violations when the form shows errors', async () => {
    await settle(setup());
    goTo('Add trial');
    fireEvent.click(screen.getByRole('button', { name: /bury it/i }));
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('sound toggle', () => {
  afterEach(() => setSoundEnabled(false));

  it('is off by default, exposes aria-pressed and persists the choice', () => {
    const store = setup();
    goTo('Settings');
    const toggle = screen.getByRole('button', { name: 'Sound: off' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(isSoundEnabled()).toBe(false);
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Sound: on' })).toHaveAttribute('aria-pressed', 'true');
    expect(store.getState().settings.soundOn).toBe(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('restores the saved choice on load', () => {
    const store = createGraveStore({ newId: () => 'x' });
    store.setState((s) => ({ settings: { ...s.settings, soundOn: true, daylight: true } }));
    render(<App store={store} clock={clock} />);
    goTo('Settings');
    expect(screen.getByRole('button', { name: 'Sound: on' })).toHaveAttribute('aria-pressed', 'true');
    expect(isSoundEnabled()).toBe(true);
  });

  it('plays a creak on bury and a thunder sting on cancel', () => {
    const created: string[] = [];
    const node: Record<string, unknown> = { frequency: {}, gain: {}, start: vi.fn(), stop: vi.fn(), getChannelData: () => [] };
    node.connect = () => node;
    const param = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    node.frequency = param;
    node.gain = param;
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return {
          createOscillator: () => (created.push('osc'), node),
          createBufferSource: () => (created.push('noise'), node),
          createBuffer: () => node,
          createBiquadFilter: () => node,
          createGain: () => node,
          destination: {},
          currentTime: 0,
          sampleRate: 10,
          close: vi.fn(),
        };
      }),
    );
    setup();
    goTo('Settings');
    fireEvent.click(screen.getByRole('button', { name: 'Sound: off' }));
    addTrial('Banshee Box', '2026-10-20', '14.95');
    expect(created).toEqual(['osc']);
    fireEvent.click(screen.getByRole('button', { name: /I cancelled/ }));
    expect(created).toEqual(['osc', 'osc', 'noise']);
    vi.unstubAllGlobals();
  });
});
