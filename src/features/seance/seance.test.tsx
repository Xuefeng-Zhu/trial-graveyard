import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { createGraveStore } from '../../state/store';
import { Seance } from './Seance';
import { PRIVACY_NOTE, pluralize } from './SeancePanel';

const NOW = new Date(2026, 9, 1, 12, 0, 0);

function setup() {
  let n = 0;
  const store = createGraveStore({
    backend: { getItem: () => null, setItem: () => {}, removeItem: () => {} } as never,
    newId: () => `id-${++n}`,
  });
  const utils = render(
    <Seance
      existing={store.getState().graves}
      clock={() => NOW}
      delayMs={0}
      onBury={(t) => store.getState().addGrave(t, NOW)}
    />,
  );
  return { store, ...utils };
}

async function reachReview() {
  fireEvent.click(screen.getByRole('button', { name: /Inbox Séance/ }));
  fireEvent.click(screen.getByRole('button', { name: /Connect Haunted Demo Inbox/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Allow' }));
  await screen.findByRole('button', { name: 'Bury selected' });
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('Seance', () => {
  it('opens the panel and greys out Gmail and Outlook', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Inbox Séance/ }));
    const dialog = screen.getByRole('dialog', { name: 'Inbox Séance' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gmail, coming soon' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Outlook, coming soon' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inbox Séance/ })).toHaveFocus();
  });

  it('returns to the connect step when consent is denied', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Inbox Séance/ }));
    fireEvent.click(screen.getByRole('button', { name: /Connect Haunted Demo Inbox/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    expect(await screen.findByText('You turned the spirits away. They will wait.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Haunted Demo Inbox/ })).toBeInTheDocument();
  });

  it('reviews, edits and buries only the checked trials, without storing email text', async () => {
    const { store } = setup();
    await reachReview();
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText('What the spirits can see')).toBeInTheDocument();

    const first = rows[0]!;
    const second = rows[1]!;
    const firstName = (within(first).getByLabelText('Name') as HTMLInputElement).value;
    expect(within(first).getByText(/spirit$/)).toBeInTheDocument();
    expect(first.querySelector('blockquote')?.textContent).not.toBe('');

    fireEvent.click(within(second).getByRole('checkbox'));
    fireEvent.change(within(first).getByLabelText('Price'), { target: { value: '1.23' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bury selected' }));

    const graves = store.getState().graves;
    expect(graves).toHaveLength(rows.length - 1);
    expect(graves[0]).toMatchObject({ name: firstName, priceCents: 123, status: 'active' });
    const saved = JSON.stringify(graves);
    expect(saved).not.toMatch(/snippet|messageId|dear customer/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(`${rows.length - 1} trials buried. Rest in peace.`)).toBeInTheDocument();
  });

  it('shows validation errors and buries nothing while a checked row is invalid', async () => {
    const { store } = setup();
    await reachReview();
    const first = screen.getAllByRole('listitem')[0]!;
    fireEvent.change(within(first).getByLabelText('Name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bury selected' }));
    expect(store.getState().graves).toHaveLength(0);
    expect(within(first).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not offer trials that are already buried', async () => {
    const { store, unmount } = setup();
    await reachReview();
    fireEvent.click(screen.getByRole('button', { name: 'Bury selected' }));
    const buried = store.getState().graves.length;
    unmount();
    render(
      <Seance existing={store.getState().graves} clock={() => NOW} delayMs={0} onBury={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Inbox Séance/ }));
    fireEvent.click(screen.getByRole('button', { name: /Connect Haunted Demo Inbox/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Allow' }));
    expect(await screen.findByText('The inbox is quiet. No restless trials found.')).toBeInTheDocument();
    expect(buried).toBeGreaterThan(0);
  });

  it('disconnect clears the detected trials', async () => {
    setup();
    await reachReview();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Connect Haunted Demo Inbox/ })).toBeInTheDocument();
  });

  it('states the privacy promise', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Inbox Séance/ }));
    expect(PRIVACY_NOTE).toMatch(/stays on this device/);
    expect(PRIVACY_NOTE).toMatch(/never stored/);
  });

  it('has no axe violations in the review state', async () => {
    setup();
    await reachReview();
    expect((await axe(document.body)).violations).toEqual([]);
  });

  it.each([
    [true, 'false'],
    [false, 'true'],
  ])('reduced motion=%s sets orb animation=%s', async (reduce, animated) => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: reduce,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as never;
    render(<Seance existing={[]} clock={() => NOW} delayMs={20} onBury={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Inbox Séance/ }));
    fireEvent.click(screen.getByRole('button', { name: /Connect Haunted Demo Inbox/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Allow' }));
    await waitFor(() => expect(document.querySelector('[data-animated]')).not.toBeNull());
    expect(document.querySelector('[data-animated]')).toHaveAttribute('data-animated', animated);
    await screen.findByRole('button', { name: 'Bury selected' });
  });
});

describe('pluralize', () => {
  it('uses singular for exactly one', () => {
    expect(`${pluralize(1, 'letter')}`).toBe('1 letter');
    expect(pluralize(1, 'spirit')).toBe('1 spirit');
  });
  it('uses plural otherwise', () => {
    expect(pluralize(0, 'letter')).toBe('0 letters');
    expect(pluralize(3, 'letter')).toBe('3 letters');
    expect(pluralize(2, 'spirit')).toBe('2 spirits');
  });
});
