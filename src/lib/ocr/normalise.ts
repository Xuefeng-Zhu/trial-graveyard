// Zero-width and control characters (keeps \n, \r and \t).
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200d\u2060\ufeff]/g;

/**
 * Cleans raw OCR text before parsing. Idempotent: the output is a fixed point.
 * Each step only ever removes or collapses, and the order is chosen so that no
 * step can create input for an earlier one.
 */
export function normaliseOcrText(raw: string): string {
  return raw
    .replace(INVISIBLE, '')
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201f]/g, '"')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/(?<=\p{L})-\n(?=\p{L})/gu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
