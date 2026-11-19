export function fitWithin(width: number, height: number, max = 1600) {
  if (width < 1 || height < 1 || !Number.isFinite(width + height)) throw new Error('Image dimensions unavailable')
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function toGrayscale(data: Uint8ClampedArray) {
  for (let offset = 0; offset < data.length; offset += 4) {
    const luma = Math.round(data[offset] * .299 + data[offset + 1] * .587 + data[offset + 2] * .114)
    data[offset] = data[offset + 1] = data[offset + 2] = luma
  }
  return data
}

async function decodeImage(blob: Blob) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    return { image: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() }
  }
  const src = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = src
    await image.decode()
    return { image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(src) }
  } catch (error) {
    URL.revokeObjectURL(src)
    throw error
  }
}

export async function preprocessImage(blob: Blob, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const { image, width, height, dispose } = await decodeImage(blob)
  try {
    signal?.throwIfAborted()
    const canvas = document.createElement('canvas')
    const size = fitWithin(width, height)
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Image canvas unavailable')
    context.fillStyle = 'white'
    context.fillRect(0, 0, size.width, size.height)
    context.drawImage(image, 0, 0, size.width, size.height)
    const pixels = context.getImageData(0, 0, size.width, size.height)
    toGrayscale(pixels.data)
    context.putImageData(pixels, 0, 0)
    return canvas
  } finally { dispose() }
}
