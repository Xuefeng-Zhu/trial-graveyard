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
