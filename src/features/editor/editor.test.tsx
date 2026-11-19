import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraveForm } from './GraveForm';
import { NOTHING_FOUND, PasteBox } from './PasteBox';
import { prefillFromParse } from './formValues';
import type { FormValues } from './formValues';
import type { ParseResult } from '../../lib/parse';

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('GraveForm', () => {
  it('focuses the name field when it opens (R1.4)', () => {
    render(<GraveForm onSubmit={() => {}} />);
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('renders pixel-styled controls that are all labelled', () => {
    render(<GraveForm onSubmit={vi.fn()} />);
    for (const label of ['Name', 'Charge date', 'Price', 'Currency', 'Cadence', 'Cancel URL (optional)']) {
      expect(screen.getByLabelText(label).className).toMatch(/input/);
    }
    expect(screen.getByLabelText('Charge date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Cadence').tagName).toBe('SELECT');
  });

  it('saves a valid grave and resets the form', () => {
    const onSubmit = vi.fn();
    render(<GraveForm onSubmit={onSubmit} />);
    type('Name', '  Phantomflix ');
    type('Charge date', '2026-10-31');
    type('Price', '15.49');
    type('Cadence', 'yearly');
    type('Cancel URL (optional)', 'https://phantomflix.example/cancel');
    fireEvent.submit(screen.getByRole('form', { name: 'Grave details' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      name: 'Phantomflix',
      priceCents: 1549,
      currency: 'USD',
      cadence: 'yearly',
      cancelUrl: 'https://phantomflix.example/cancel',
    });
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it.each([
    ['empty name', { Name: '', 'Charge date': '2026-10-31', Price: '5' }, 'Name', 'Every grave needs a name.'],
    ['missing date', { Name: 'A', 'Charge date': '', Price: '5' }, 'Charge date', 'That date is not on any calendar I know.'],
    ['negative price', { Name: 'A', 'Charge date': '2026-10-31', Price: '-1' }, 'Price', 'Enter a price of 0 or more.'],
    ['non-numeric price', { Name: 'A', 'Charge date': '2026-10-31', Price: 'abc' }, 'Price', 'Enter a price of 0 or more.'],
    [
      'non-http URL',
      { Name: 'A', 'Charge date': '2026-10-31', Price: '5', 'Cancel URL (optional)': 'javascript:alert(1)' },
      'Cancel URL (optional)',
      'Cancel links must start with http:// or https://.',
    ],
  ])('shows an inline error and does not save: %s', (_n, fields, label, message) => {
    const onSubmit = vi.fn();
    render(<GraveForm onSubmit={onSubmit} />);
    for (const [l, v] of Object.entries(fields)) type(l, v);
    fireEvent.submit(screen.getByRole('form', { name: 'Grave details' }));
    expect(onSubmit).not.toHaveBeenCalled();
    const input = screen.getByLabelText(label);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(message);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(input).toHaveFocus();
  });

  it('accepts a zero price', () => {
    const onSubmit = vi.fn();
    render(<GraveForm onSubmit={onSubmit} />);
    type('Name', 'Free thing');
    type('Charge date', '2026-10-31');
    type('Price', '0');
    fireEvent.submit(screen.getByRole('form', { name: 'Grave details' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('clears an error once the field is edited', () => {
    render(<GraveForm onSubmit={() => {}} />);
    fireEvent.submit(screen.getByRole('form', { name: 'Grave details' }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    type('Name', 'A');
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  it('uses native form controls in tab order and submits with Enter via a submit button', () => {
    render(<GraveForm onSubmit={() => {}} onCancel={() => {}} />);
    const controls = screen.getByRole('form').querySelectorAll('input, select, button');
    controls.forEach((c) => expect(c).not.toHaveAttribute('tabindex'));
    expect(screen.getByRole('button', { name: /bury it/i })).toHaveAttribute('type', 'submit');
  });

  it('calls onCancel', () => {
    const onCancel = vi.fn();
    render(<GraveForm onSubmit={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Never mind' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

function Harness({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const [prefill, setPrefill] = useState<Partial<FormValues>>();
  const [version, setVersion] = useState(0);
  return (
    <>
      <PasteBox
        now={() => new Date(2026, 9, 1, 12)}
        onParsed={(r) => {
          setPrefill(prefillFromParse(r));
          setVersion((v) => v + 1);
        }}
      />
      <GraveForm prefill={prefill} prefillVersion={version} onSubmit={onSubmit} />
    </>
  );
}

describe('PasteBox', () => {
  it('prefills the form from a receipt without saving', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/paste a receipt/i), {
      target: {
        value:
          'Welcome to Phantomflix! Your free trial ends on October 31, 2026. After that you will be charged $15.49/month. https://www.phantomflix.example/cancelplan',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Read the receipt' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Phantomflix');
    expect(screen.getByLabelText('Charge date')).toHaveValue('2026-10-31');
    expect(screen.getByLabelText('Price')).toHaveValue('15.49');
    expect(screen.getByLabelText('Cadence')).toHaveValue('monthly');
    expect(screen.getByLabelText('Cancel URL (optional)')).toHaveValue('https://www.phantomflix.example/cancelplan');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps edits the user can still make after prefill', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/paste a receipt/i), {
      target: { value: 'Phantomflix trial ends October 31, 2026, $15.49/month' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Read the receipt' }));
    type('Price', '9.99');
    expect(screen.getByLabelText('Price')).toHaveValue('9.99');
  });

  it('shows the empty-result message and leaves the form usable', () => {
    const onParsed = vi.fn();
    render(<PasteBox now={() => new Date()} onParsed={onParsed} />);
    fireEvent.change(screen.getByLabelText(/paste a receipt/i), { target: { value: 'hello there' } });
    fireEvent.click(screen.getByRole('button', { name: 'Read the receipt' }));
    expect(screen.getByRole('status')).toHaveTextContent(NOTHING_FOUND);
    expect(onParsed).not.toHaveBeenCalled();
  });
});

describe('prefillFromParse', () => {
  it('skips unknown fields', () => {
    const r: ParseResult = { name: { value: 'X', confidence: 1, source: 'X' } };
    expect(prefillFromParse(r)).toEqual({ name: 'X' });
  });
});
