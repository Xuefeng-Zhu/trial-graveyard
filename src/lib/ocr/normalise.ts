export function normaliseOcrText(text: string): string {
  return text.normalize('NFKC').replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\ufeff]/g, '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/(?<=\p{L})-\s*\n\s*(?=\p{L})/gu, '')
    .replace(/(?<=\d)\|+(?=\d)/g, match => '1'.repeat(match.length))
    .split('\n').map(line => line.replace(/[^\S\n]+/g, ' ').trim()).filter(Boolean).join('\n').normalize('NFKC')
}
