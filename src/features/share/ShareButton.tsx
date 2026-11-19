import { useState } from 'react';
import { buildShareSummary } from '../../domain/shareCard';
import type { Grave } from '../../domain/trial';
import { CanvasUnavailableError, SHARE_HASHTAG, drawShareCard } from './drawShareCard';

export const SHARE_FILENAME = 'my-graveyard.png';
export const NO_CANVAS_TEXT = 'Your browser cannot draw the card, so there is nothing to share yet.';
export const SHARE_DOWNLOADED_TEXT = 'Graveyard card downloaded';
export const SHARE_FAILED_TEXT = 'The spirits could not draw the card. Try again.';

export interface ShareButtonProps {
  graves: readonly Pick<Grave, 'status' | 'priceCents' | 'currency'>[];
  className?: string;
}

function download(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SHARE_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Draws the "My Graveyard" card and shares it, or downloads it. Shown only once a grave is cancelled. */
export function ShareButton({ graves, className }: ShareButtonProps) {
  const [message, setMessage] = useState('');
  if (!graves.some((g) => g.status === 'cancelled')) return null;

  const share = async (): Promise<void> => {
    setMessage('');
    try {
      const blob = await drawShareCard(buildShareSummary(graves));
      const file = new File([blob], SHARE_FILENAME, { type: 'image/png' });
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: SHARE_HASHTAG });
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          throw e;
        }
        return;
      }
      download(blob);
      setMessage(SHARE_DOWNLOADED_TEXT);
    } catch (e) {
      setMessage(e instanceof CanvasUnavailableError ? NO_CANVAS_TEXT : SHARE_FAILED_TEXT);
    }
  };

  return (
    <div>
      <button type="button" className={className} onClick={() => void share()}>
        Share my graveyard
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
