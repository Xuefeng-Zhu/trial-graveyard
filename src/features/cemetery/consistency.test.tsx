import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graveWith, H } from '../../domain/arbitraries';
import type { Grave } from '../../domain/trial';
import { AtRisk } from '../haunting';
import { BottomHud } from './BottomHud';
import { DetailsPanel } from './DetailsPanel';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const at = (hours: number, o: Partial<Grave> = {}) =>
  graveWith({ chargeAt: new Date(NOW.getTime() + hours * H).toISOString(), ...o });
afterEach(cleanup);

describe('BottomHud next charge', () => {
  it('shows the soonest upcoming trial, not the overdue one, and a separate overdue count', () => {
    const graves = [at(-4, { id: 'a', name: 'Hollowtv' }), at(3, { id: 'b', name: 'Wraithwave Premium' })];
    render(<BottomHud graves={graves} now={NOW} ledger={[]} onOpenQuests={vi.fn()} onExorcise={vi.fn()} />);
    expect(screen.getByText(/Wraithwave Premium:/)).toBeInTheDocument();
    expect(screen.queryByText(/Hollowtv:/)).not.toBeInTheDocument();
    expect(screen.getByTestId('hud-overdue')).toHaveTextContent('1 overdue');
    expect(screen.getByTestId('at-risk')).toHaveTextContent('At risk this week: $15.49');
  });

  it('with only overdue trials says no upcoming charges and still exorcises the overdue one', () => {
    const onExorcise = vi.fn();
    render(<BottomHud graves={[at(-4, { id: 'a' })]} now={NOW} ledger={[]} onOpenQuests={vi.fn()} onExorcise={onExorcise} />);
    expect(screen.getByText('No upcoming charges.')).toBeInTheDocument();
    screen.getByRole('button', { name: /Exorcise Trials/ }).click();
    expect(onExorcise).toHaveBeenCalledWith('a');
  });
});

describe('AtRisk', () => {
  it('renders nothing when no active trial charges this week', () => {
    const { container } = render(<AtRisk graves={[at(5, { status: 'cancelled' })]} now={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DetailsPanel rows', () => {
  it('Status is the state word and Remaining is the time', () => {
    render(<DetailsPanel grave={at(57)} now={NOW} modal={false} onClose={vi.fn()} onExorcise={vi.fn()} onCancelled={vi.fn()} onKeep={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onExport={vi.fn()} onHaunt={vi.fn()} />);
    const row = (k: string) => screen.getByText(k, { selector: 'dt' }).parentElement as HTMLElement;
    expect(within(row('Status')).getByText('Warning')).toBeInTheDocument();
    expect(within(row('Remaining')).getByText(/charges in 57 hours/)).toBeInTheDocument();
  });
});
