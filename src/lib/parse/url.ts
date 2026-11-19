import { validUrl } from '../../domain/trial'

export function extractUrl(text: string) {
  const urls = Array.from(text.matchAll(/https?:\/\/[^\s<>"\])]+/gi), match => match[0].replace(/[.,;!?]+$/, '')).filter(validUrl)
  const preferred = urls.find(url => /cancel|manage|account|billing/i.test(url))
  const value = preferred ?? urls[0]
  return value ? { value, source: value, confidence: preferred ? 0.97 : 0.55 } : undefined
}
