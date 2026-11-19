import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NO_CANVAS_TEXT, ShareButton } from './ShareButton';

const cancelled = [{ status: 'cancelled' as const, priceCents: 1399, currency: 'USD' }];

function mockCanvas(): void {
  const ctx = {
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })));
}

function mockNavigator(share?: unknown, canShare?: unknown): void {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
}

function mockUrl() {
  const create = vi.fn(() => 'blob:x');
  const revoke = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { create, revoke, click };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockNavigator(undefined, undefined);
});

const press = () => fireEvent.click(screen.getByRole('button', { name: 'Share my graveyard' }));

describe('ShareButton', () => {
  it('renders nothing without a cancelled grave', () => {
    const { container } = render(<ShareButton graves={[{ status: 'active', priceCents: 1, currency: 'USD' }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shares the PNG through navigator.share when files are supported', async () => {
    mockCanvas();
    const share = vi.fn().mockResolvedValue(undefined);
    mockNavigator(share, () => true);
    const { create } = mockUrl();
    render(<ShareButton graves={cancelled} />);
    press();
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0]![0] as { files: File[]; text: string };
    expect(arg.files[0]!.name).toBe('my-graveyard.png');
    expect(arg.text).toBe('#KiroweenHackathon26');
    expect(create).not.toHaveBeenCalled();
  });

  it('downloads the PNG when file sharing is unavailable', async () => {
    mockCanvas();
    mockNavigator(undefined, undefined);
    const { create, revoke, click } = mockUrl();
    render(<ShareButton graves={cancelled} />);
    press();
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    expect(screen.getByRole('status')).toHaveTextContent('Graveyard card downloaded');
  });

  it('does nothing more when the user dismisses the share sheet', async () => {
    mockCanvas();
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'));
    mockNavigator(share, () => true);
    const { create } = mockUrl();
    render(<ShareButton graves={cancelled} />);
    press();
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows a message and does not throw without canvas', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ShareButton graves={cancelled} />);
    press();
    expect(await screen.findByText(NO_CANVAS_TEXT)).toBeInTheDocument();
  });

  it('shows a generic message when sharing fails for another reason', async () => {
    mockCanvas();
    mockNavigator(vi.fn().mockRejectedValue(new Error('boom')), () => true);
    render(<ShareButton graves={cancelled} />);
    press();
    expect(await screen.findByText(/could not draw the card/)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ShareButton graves={cancelled} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
