// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { trial } from '../../domain/arbitraries'
import { ShareButton } from './ShareButton'

const graves = [trial({ status: 'cancelled' })]
const png = new Blob(['image'], { type: 'image/png' })
const tryShare = vi.fn()
const click = vi.fn()

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(png))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click)
  Object.defineProperty(navigator, 'share', { configurable: true, value: tryShare })
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:card'), revokeObjectURL: vi.fn() }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(navigator, 'canShare')
})

it('shares a PNG using Web Share and passes axe', async () => {
  const { container } = render(<main><ShareButton graves={graves} /></main>)
  fireEvent.click(screen.getByRole('button', { name: 'Share my graveyard' }))
  await screen.findByText('Graveyard card shared.')
  expect(tryShare).toHaveBeenCalledWith({ files: [expect.objectContaining({ name: 'my-graveyard.png' })], text: '#KiroweenHackathon26' })
  expect((await axe(container)).violations).toEqual([])
})
it('downloads and announces a fallback when native file sharing is absent', async () => {
  Reflect.deleteProperty(navigator, 'share')
  render(<ShareButton graves={graves} />)
  fireEvent.click(screen.getByRole('button', { name: 'Share my graveyard' }))
  await screen.findByText('Graveyard card downloaded.')
  expect(click).toHaveBeenCalledOnce()
})
it('keeps a cancelled share quiet and reports a missing canvas', async () => {
  tryShare.mockRejectedValueOnce(new DOMException('Dismissed', 'AbortError'))
  render(<ShareButton graves={graves} />)
  const button = screen.getByRole('button', { name: 'Share my graveyard' })
  fireEvent.click(button)
  await vi.waitFor(() => expect(button).toBeEnabled())
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  expect(click).not.toHaveBeenCalled()
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null)
  fireEvent.click(button)
  await screen.findByText(/could not be drawn/)
})
it('hides the share action until a cancellation exists', () => {
  render(<ShareButton graves={[trial()]} />)
  expect(screen.queryByRole('button')).toBeNull()
})
