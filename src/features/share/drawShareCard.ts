import { formatMoney } from '../../domain/savings';
import type { ShareSummary } from '../../domain/shareCard';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const SHARE_HASHTAG = '#KiroweenHackathon26';

const DISPLAY = "'Pirata One', Georgia, serif";
const BODY = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Thrown when a 2D canvas context cannot be created. */
export class CanvasUnavailableError extends Error {}

/** Draws the "My Graveyard" card and resolves with a PNG blob. Shows totals only, never names or URLs. */
export async function drawShareCard(summary: ShareSummary): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new CanvasUnavailableError('Canvas is not available');
  await document.fonts?.ready;

  const sky = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  sky.addColorStop(0, '#12101a');
  sky.addColorStop(1, '#2a2140');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = '#ece8f5';
  ctx.beginPath();
  ctx.arc(CARD_WIDTH - 240, 240, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ece8f5';
  ctx.font = `120px ${DISPLAY}`;
  ctx.fillText('My Graveyard', CARD_WIDTH / 2, 520);

  ctx.fillStyle = '#9be28c';
  ctx.font = `bold 84px ${BODY}`;
  const totals = summary.totals.length > 0 ? summary.totals : [{ currency: 'USD', cents: 0 }];
  totals.forEach((t, i) => ctx.fillText(formatMoney(t.cents, t.currency), CARD_WIDTH / 2, 680 + i * 100));

  ctx.fillStyle = '#ece8f5';
  ctx.font = `44px ${BODY}`;
  const souls = `${summary.slain} ${summary.slain === 1 ? 'soul' : 'souls'} saved from charges`;
  ctx.fillText(souls, CARD_WIDTH / 2, 680 + totals.length * 100 + 40);

  ctx.fillStyle = '#ffd866';
  ctx.font = `bold 48px ${BODY}`;
  ctx.fillText(SHARE_HASHTAG, CARD_WIDTH / 2, CARD_HEIGHT - 120);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the card'))), 'image/png');
  });
}
