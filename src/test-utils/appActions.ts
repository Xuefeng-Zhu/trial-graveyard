import { fireEvent, screen } from '@testing-library/react';

/** Clicks a main navigation item such as "Savings". */
export function goTo(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

const type = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

/** Opens the Add view, fills the form and buries the trial. The app returns to the graveyard view. */
export function addTrial(name: string, date: string, price: string, url = '', cadence = ''): void {
  goTo('Add trial');
  type('Name', name);
  type('Charge date', date);
  type('Price', price);
  if (url) type('Cancel URL (optional)', url);
  if (cadence) type('Cadence', cadence);
  fireEvent.click(screen.getByRole('button', { name: /bury it/i }));
}
