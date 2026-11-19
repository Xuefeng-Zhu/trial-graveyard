// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
import { useGraveyard } from '../state/store'

beforeEach(async () => {
  await vi.waitFor(() => expect(useGraveyard.getState().ready).toBe(true))
  useGraveyard.setState({ graves: [], undoEntry: undefined, settings: { daylight: false, soundOn: false, calm: false, llmFallback: false } })
  location.hash = ''
})

it('fills a receipt, validates inline, saves and resets the next editor', async () => {
  location.hash = 'add'
  render(<App />)
  expect(screen.getByLabelText('Service name')).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Bury trial' }))
  expect(screen.getByText('Give this grave a service name.')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Paste a receipt'), { target: { value: 'Your Phantomflix trial ends 2027-11-15. $13.99 monthly.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Read receipt' }))
  await screen.findByText(/Fields filled/)
  expect(screen.getByLabelText('Service name')).toHaveValue('Phantomflix')
  expect(screen.getByLabelText('Charge date')).toHaveValue('2027-11-15')
  fireEvent.click(screen.getByRole('button', { name: 'Bury trial' }))
  expect(useGraveyard.getState().graves).toHaveLength(1)
  fireEvent.click(screen.getByRole('link', { name: 'Add trial' }))
  expect(screen.getByLabelText('Service name')).toHaveValue('')
})

it('supports arrow navigation, explicit cancellation and undo', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }))
  const first = screen.getByRole('button', { name: /^Phantomflix / })
  first.focus()
  fireEvent.keyDown(first, { key: 'ArrowRight' })
  expect(screen.getByRole('button', { name: /^Hexlingo / })).toHaveFocus()
  fireEvent.click(first)
  const dialog = screen.getByRole('dialog')
  expect(useGraveyard.getState().graves.find(grave => grave.name === 'Phantomflix')?.status).toBe('active')
  fireEvent.click(within(dialog).getByRole('button', { name: 'I cancelled' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(useGraveyard.getState().graves.find(grave => grave.name === 'Phantomflix')?.status).toBe('active')
})

it('exposes Daylight and nav state, honours reduced motion and passes axe', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  try {
    const { container } = render(<App />)
    expect(container.querySelector('[data-motion="false"]')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Daylight mode: OFF' }))
    expect(screen.getByRole('button', { name: 'Daylight mode: ON', pressed: true })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Graveyard', current: 'page' })).toBeVisible()
    expect(screen.getByRole('list', { name: 'Trials by charge date' })).toBeVisible()
    expect((await axe(container)).violations).toEqual([])
  } finally { vi.unstubAllGlobals() }
})

it('shows a static landing with accessible sound and Daylight settings', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  try {
    const { container } = render(<App />)
    expect(screen.getByText('Every free trial is a grave. Cancel before it rises.')).toBeVisible()
    expect(container.querySelector('img[data-static="true"]')).toBeTruthy()
    expect((await axe(container)).violations).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Sound: OFF', pressed: false }))
    expect(screen.getByRole('button', { name: 'Sound: ON', pressed: true })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Daylight mode: OFF' }))
    expect(container.querySelector('img[data-static]')).toBeNull()
  } finally { vi.unstubAllGlobals() }
})

it('asks before saving a duplicate and can open the existing grave', async () => {
  location.hash = 'add'
  useGraveyard.getState().addGrave({
    name: 'Phantomflix', chargeAt: new Date(2027, 10, 15, 9).toISOString(), priceCents: 1399, cadence: 'monthly', currency: 'USD',
  }, new Date())
  render(<App />)
  fireEvent.change(screen.getByLabelText('Paste a receipt'), { target: { value: 'Your PHANTOMFLIX trial ends 2027-11-15. $13.99 monthly.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Read receipt' }))
  await screen.findByText(/Fields filled/)
  fireEvent.click(screen.getByRole('button', { name: 'Bury trial' }))
  const warning = screen.getByRole('dialog', { name: 'Grave already found' })
  expect(within(warning).getByRole('button', { name: 'Bury anyway' })).toBeVisible()
  expect(useGraveyard.getState().graves).toHaveLength(1)
  fireEvent.click(within(warning).getByRole('button', { name: 'Open existing' }))
  expect(screen.getByRole('dialog', { name: 'Phantomflix' })).toBeVisible()
  expect(useGraveyard.getState().graves).toHaveLength(1)
})

it('exorcises a trial only after confirmation and restores it on undo', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Summon demo graveyard' }))
  fireEvent.click(screen.getByRole('button', { name: 'Exorcise next trial' }))
  const dialog = screen.getByRole('dialog', { name: 'Exorcise Wraithwave Premium' })
  expect(within(dialog).getByText('Cancel with the provider')).toBeVisible()
  expect(useGraveyard.getState().graves.find(grave => grave.id === 'demo-wraithwave')?.status).toBe('active')
  fireEvent.click(within(dialog).getByRole('button', { name: 'It’s exorcised' }))
  expect(useGraveyard.getState().graves.find(grave => grave.id === 'demo-wraithwave')?.status).toBe('cancelled')
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(useGraveyard.getState().graves.find(grave => grave.id === 'demo-wraithwave')?.status).toBe('active')
})
