export const MAX_EDGE = 1600;

export interface Size {
  width: number;
  height: number;
}

/** Scales so the long edge is at most `max`. Never upscales; keeps the aspect ratio. */
export function fitWithin(width: number, height: number, max: number = MAX_EDGE): Size {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const scale = max / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Rewrites RGBA pixels in place to luma gray. Alpha is kept. */
export function toGrayscale(data: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i + 3 < data.length; i += 4) {
    const y = Math.round(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
  return data;
}

/** Decodes, downscales to 1600 px on the long edge and grayscales on a canvas. */
export async function preprocessImage(blob: Blob): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot decode images.');
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('This browser has no canvas.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height);
    toGrayscale(pixels.data);
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  } finally {
    bitmap.close?.();
  }
}
