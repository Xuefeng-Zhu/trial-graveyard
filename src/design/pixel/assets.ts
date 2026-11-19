/** URL of a file in `public/`, honouring the Vite base path (GitHub Pages serves from a sub-path). */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export const BACKDROP_URL = assetUrl('pixel/graveyard-bg.png');
export const REAPER_URL = assetUrl('pixel/reaper.png');
export const BACKDROP_SIZE = { width: 384, height: 216 } as const;
export const REAPER_SIZE = { width: 49, height: 56 } as const;
