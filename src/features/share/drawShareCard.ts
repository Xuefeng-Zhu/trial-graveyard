import type { buildShareSummary } from '../../domain/shareCard'
import { formatMoney } from '../../domain/savings'

export async function drawShareCard(summary: ReturnType<typeof buildShareSummary>) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  await document.fonts?.ready
  context.imageSmoothingEnabled = false
  context.fillStyle = '#120f23'
  context.fillRect(0, 0, 1080, 1350)
  context.fillStyle = '#2c2142'
  context.fillRect(54, 54, 972, 1242)
  context.strokeStyle = '#8b5cf6'
  context.lineWidth = 8
  context.strokeRect(72, 72, 936, 1206)
  context.fillStyle = '#b8a9d9'
  for (const [x, y, w, h] of [[439, 166, 202, 150], [461, 144, 158, 194], [491, 125, 98, 232]]) {
    context.fillRect(x, y, w, h)
  }
  context.fillStyle = '#583d82'
  for (const [x, y, w, h] of [[473, 184, 38, 31], [557, 222, 57, 39], [513, 278, 39, 52]]) context.fillRect(x, y, w, h)
  context.textAlign = 'center'
  context.fillStyle = '#f2ecff'
  context.font = '48px "Press Start 2P", monospace'
  context.fillText('My Graveyard', 540, 460, 900)
  context.font = '38px Inter, sans-serif'
  context.fillText(`${summary.slain} ${summary.slain === 1 ? 'charge' : 'charges'} marked cancelled`, 540, 570)
  context.fillStyle = '#a8ff60'
  const columns = Math.max(1, Math.ceil(summary.totals.length / 10))
  const rows = Math.ceil(summary.totals.length / columns)
  const width = 850 / columns
  const lineHeight = Math.min(62, 430 / Math.max(1, rows))
  context.font = `700 ${Math.min(49, lineHeight * .75)}px Inter, sans-serif`
  summary.totals.forEach(({ currency, cents }, index) =>
    context.fillText(formatMoney(cents, currency), 115 + width * (index % columns + .5), 665 + Math.floor(index / columns) * lineHeight, width - 8))
  context.fillStyle = '#b8a9d9'
  context.font = '36px Inter, sans-serif'
  context.fillText('#KiroweenHackathon26', 540, 1190)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob)
    else reject(new Error('PNG unavailable'))
  }, 'image/png'))
}
