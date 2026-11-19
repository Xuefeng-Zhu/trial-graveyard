const symbols: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP' }
const currency = 'USD|EUR|GBP|CAD|AUD|NZD|CHF|JPY|SEK|NOK|DKK|INR|MXN|BRL|PLN|CNY|SGD|HKD|ZAR'
const amount = String.raw`\d{1,12}(?:(?:[., ]\d{3}){1,3})?(?:[.,]\d{1,2})?(?!\d)`
const moneyPattern = new RegExp(`([€£$]|\\b(?:${currency})\\b)\\s*(${amount})|(${amount})\\s*\\b(${currency})\\b`, 'gi')

export function digitsToCents(text: string) {
  const clean = text.replace(/ /g, '')
  const fraction = /[.,](\d{1,2})$/.exec(clean)
  const whole = (fraction ? clean.slice(0, fraction.index) : clean).replace(/[.,]/g, '')
  return Number(whole) * 100 + Number((fraction?.[1] ?? '').padEnd(2, '0'))
}

export function extractMoney(text: string) {
  let result: { cents: number; currency: string; source: string } | undefined
  for (const match of text.matchAll(moneyPattern)) {
    const cents = digitsToCents(match[2] ?? match[3])
    if (!Number.isSafeInteger(cents) || cents > 999_999_999_999) continue
    const found = { cents, currency: symbols[match[1]] ?? (match[1] ?? match[4]).toUpperCase(), source: match[0] }
    result ??= found
    if (cents > 0) return found
  }
  return result
}
