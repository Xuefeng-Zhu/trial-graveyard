import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { createFakeEngine } from '../../lib/ocr/fake';
import { PasteBox } from './PasteBox';
import {
  CANCELLED,
  DECIPHERING,
  ENGINE_FAILED,
  LOW_CONFIDENCE_MESSAGE,
  NOT_AN_IMAGE,
  NO_TEXT,
  PRIVACY_NOTE,
} from './ImageReceipt';

const NOW = new Date('2026-10-20T12:00:00Z');
const TEXT = 'Your trial ends on November 15. You will be charged $13.99/month. https://www.disneyplus.com/account';
const png = () => new File(['x'], 'shot.png', { type: 'image/png' });
const preprocess = async (f: Blob) => f;

function setup(engine: ReturnType<typeof createFakeEngine>) {
  const onParsed = vi.fn();
  const onManual = vi.fn();
  const utils = render(
    <PasteBox now={() => NOW} onParsed={onParsed} onManual={onManual} engine={engine} preprocess={preprocess} />,
  );
  return { onParsed, onManual, ...utils };
}
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const choose = (file: File, label = 'Choose an image') => fireEvent.change(input(label), { target: { files: [file] } });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('ImageReceipt', () => {
  it('has the right inputs and privacy note', () => {
    setup(createFakeEngine({ text: TEXT, confidence: 90 }));
    expect(input('Choose an image')).toHaveAttribute('accept', 'image/*');
    expect(input('Take a photo')).toHaveAttribute('capture', 'environment');
    expect(screen.getByText(PRIVACY_NOTE)).toBeInTheDocument();
    expect(screen.getByText('Try a sample screenshot')).toBeInTheDocument();
  });

  it('reads a file, shows a preview, prefills and shows the raw text', async () => {
    const { onParsed } = setup(createFakeEngine({ text: TEXT, confidence: 90 }));
    choose(png());
    await waitFor(() => expect(onParsed).toHaveBeenCalledOnce());
    expect(onParsed.mock.calls[0]![0].priceCents.value).toBe(1399);
    expect(screen.getByAltText(/preview/i)).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByText('What the spirits read')).toBeInTheDocument();
    expect(screen.getByLabelText('Text read from the image')).toHaveValue(TEXT);
    expect(screen.getByText(/read this clearly/)).toBeInTheDocument();
    expect((await axe(document.body)).violations).toEqual([]);
  });

  it('shows progress with a cancel button, and cancels', async () => {
    const { onParsed } = setup(createFakeEngine({ text: TEXT, confidence: 90, steps: [40], hang: true }));
    choose(png());
    expect(await screen.findByText(DECIPHERING)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect((await axe(document.body)).violations).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText(CANCELLED)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('reads from the camera input and a clipboard paste', async () => {
    const { onParsed, container } = setup(createFakeEngine({ text: TEXT, confidence: 90 }));
    choose(png(), 'Take a photo');
    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(1));
    fireEvent.paste(container.querySelector('section')!, { clipboardData: { files: [png()] } });
    await waitFor(() => expect(onParsed).toHaveBeenCalledTimes(2));
    fireEvent.paste(container.querySelector('section')!, { clipboardData: { files: [] } });
    expect(onParsed).toHaveBeenCalledTimes(2);
  });

  it('accepts a dropped image and rejects a dropped non-image', async () => {
    const { onParsed } = setup(createFakeEngine({ text: TEXT, confidence: 90 }));
    const zone = screen.getByTestId('image-zone');
    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText(NOT_AN_IMAGE)).toBeInTheDocument();
    expect(onParsed).not.toHaveBeenCalled();
    fireEvent.drop(zone, { dataTransfer: { files: [png()] } });
    await waitFor(() => expect(onParsed).toHaveBeenCalled());
  });

  it('shows a friendly message and manual fallback for low confidence', async () => {
    const { onManual } = setup(createFakeEngine({ text: TEXT, confidence: 20 }));
    choose(png());
    expect(await screen.findByText(LOW_CONFIDENCE_MESSAGE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter it by hand' }));
    expect(onManual).toHaveBeenCalled();
    expect((await axe(document.body)).violations).toEqual([]);
  });

  it('handles no text and engine failure', async () => {
    const a = setup(createFakeEngine({ text: '  ', confidence: 90 }));
    choose(png());
    expect(await screen.findByText(NO_TEXT)).toBeInTheDocument();
    a.unmount();
    setup(createFakeEngine({ text: '', confidence: 0, error: new Error('boom') }));
    choose(png());
    expect(await screen.findByText(ENGINE_FAILED)).toBeInTheDocument();
  });

  it('re-reads edited text and removes the image', async () => {
    const { onParsed } = setup(createFakeEngine({ text: 'nothing useful 5', confidence: 90 }));
    choose(png());
    await screen.findByText('What the spirits read');
    expect(onParsed).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Text read from the image'), { target: { value: TEXT } });
    fireEvent.click(screen.getByRole('button', { name: 'Read again' }));
    expect(onParsed).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(screen.queryByAltText(/preview/i)).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('loads the sample screenshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x'], { type: 'image/png' }) })));
    const { onParsed } = setup(createFakeEngine({ text: TEXT, confidence: 90 }));
    fireEvent.click(screen.getByText('Try a sample screenshot'));
    await waitFor(() => expect(onParsed).toHaveBeenCalled());
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    fireEvent.click(screen.getByText('Try a sample screenshot'));
    expect(await screen.findByText(ENGINE_FAILED)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
