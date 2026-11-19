// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { expect, it, vi } from 'vitest'
import { reference } from '../../domain/arbitraries'
import { demoInbox } from '../../lib/email'
import { useGraveyard } from '../../state/store'
import { SeancePanel } from './SeancePanel'
import { foundMessage, scanMessage } from './useSeance'

it.each([
  [{ read: 1, found: 1 }, 'The spirits have read 1 letter and found 1 restless trial.', '1 spirit found'],
  [{ read: 3, found: 3 }, 'The spirits have read 3 letters and found 3 restless trials.', '3 spirits found'],
] as const)('uses matching plurals for $0.read', (progress, scan, found) => {
  expect(scanMessage(progress)).toBe(scan)
  expect(foundMessage(progress.found)).toBe(found)
})

it('reviews and edits local demo receipts, then persists only confirmed fields', async () => {
  await vi.waitFor(() => expect(useGraveyard.getState().ready).toBe(true))
  useGraveyard.setState({ graves: [] })
  const onClose = vi.fn()
  const { container } = render(<main data-motion="false"><SeancePanel now={reference} onClose={onClose}
    makeProvider={(now, consent) => demoInbox(now, consent, 0)}
    onBury={trials => trials.forEach(input => useGraveyard.getState().addGrave(input, reference))} /></main>)
  const dialog = screen.getByRole('dialog', { name: 'Inbox Séance' })
  expect(within(dialog).getByRole('button', { name: 'Gmail, coming soon' })).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: 'Outlook, coming soon' })).toBeDisabled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Connect' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Connect' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Allow' }))
  await within(dialog).findByRole('button', { name: 'Bury selected (10)' })
  expect((await axe(container)).violations).toEqual([])
  const phantom = within(dialog).getByRole('group', { name: 'Phantomflix' })
  fireEvent.change(within(phantom).getByLabelText('Price'), { target: { value: '21.04' } })
  fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Select Hexlingo Max' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Bury selected (9)' }))
  const { graves } = useGraveyard.getState()
  expect(graves).toHaveLength(9)
  expect(graves[0].priceCents).toBe(2104)
  expect(JSON.stringify(graves)).not.toMatch(/Manage your plan|@|messageId|snippet/)
  expect(screen.getByRole('button', { name: 'Connect' })).toBeVisible()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledOnce()
})
