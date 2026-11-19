// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reference } from '../../domain/arbitraries'
import { createFakeEngine } from '../../lib/ocr/fake'
import { sampleText } from '../../lib/ocr/sample.fixture'
import { ImageReceipt } from './ImageReceipt'

const file = new File(['demo'], 'sample.png', { type: 'image/png' })
const revoke = vi.fn()

beforeEach(() => {
  class PreviewUrl extends URL {
    static createObjectURL = () => 'blob:receipt'
    static revokeObjectURL = revoke
  }
  vi.stubGlobal('URL', PreviewUrl)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); revoke.mockClear() })

const preprocess = async () => document.createElement('canvas')
it('previews an upload and prefills the receipt, then removes the preview', async () => {
  const onParsed = vi.fn()
  const { container } = render(<main><ImageReceipt engine={createFakeEngine({ text: sampleText, confidence: 95 })}
    now={reference} onParsed={onParsed} onManual={vi.fn()} preprocess={preprocess} /></main>)
  fireEvent.change(screen.getByLabelText('Choose an image'), { target: { files: [file] } })
  await screen.findByText('The spirits read this image clearly.')
  expect(screen.getByAltText('Selected receipt preview')).toHaveAttribute('src', 'blob:receipt')
  expect(onParsed).toHaveBeenCalledWith(expect.objectContaining({
    name: expect.objectContaining({ value: 'Phantomflix' }),
    chargeAt: expect.objectContaining({ source: 'December 15, 2026' }),
  }))
  expect((await axe(container)).violations).toEqual([])
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
  expect(screen.queryByAltText('Selected receipt preview')).toBeNull()
  expect(revoke).toHaveBeenCalledWith('blob:receipt')
})
it('reports OCR progress and cancels the running engine', async () => {
  const aborted = vi.fn()
  render(<ImageReceipt now={reference} onParsed={vi.fn()} onManual={vi.fn()} preprocess={preprocess} engine={{
    recognize: (_image, { signal, onProgress }) => new Promise((_resolve, reject) => {
      onProgress?.(20)
      signal?.addEventListener('abort', () => { aborted(); reject(signal.reason) })
    }),
  }} />)
  fireEvent.change(screen.getByLabelText('Use camera'), { target: { files: [file] } })
  const progress = await screen.findByRole('progressbar')
  await screen.findByText('The spirits are deciphering…')
  expect(progress).toHaveAttribute('max', '100')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel reading' }))
  expect(aborted).toHaveBeenCalledOnce()
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.getByText('The spirits were sent back to rest.')).toBeVisible()
})
it('offers a manual entry path for low confidence and invalid uploads', async () => {
  const manual = vi.fn()
  render(<ImageReceipt now={reference} onParsed={vi.fn()} onManual={manual} preprocess={preprocess}
    engine={createFakeEngine({ text: sampleText, confidence: 30 })} />)
  fireEvent.change(screen.getByLabelText('Choose an image'), { target: { files: [file] } })
  await screen.findByText('The spirits had trouble reading this image.')
  fireEvent.click(screen.getByRole('button', { name: 'Enter it by hand' }))
  expect(manual).toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Choose an image'), { target: { files: [new File(['text'], 'demo.txt', { type: 'text/plain' })] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('That file is not an image.')
})
