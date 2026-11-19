import { addDays, formatISO } from 'date-fns'

const months = 'January February March April May June July August September October November December'.toLowerCase().split(' ')
const month = months.map(value => value.slice(0, 3) + (value.length > 3 ? `(?:${value.slice(3)})?` : '')).join('|')
const pattern = new RegExp(String.raw`\b(?:(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?|(${month})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?|(\d{1,2})(?:st|nd|rd|th)?\s+(${month})(?:,?\s+(\d{4}))?)\b`, 'gi')
const chargeLabel = /(?:trial ends?|first charge|will be charged|renews?|next (?:charge|billing)|charge date|billed|billing begins)/i

export function extractDate(text: string, refDate: Date) {
  let strongest: { value: string; confidence: number; source: string } | undefined
  for (const match of text.matchAll(pattern)) {
    const [, isoYear, isoMonth, isoDay, usMonth, usDay, usYear, nameFirst, nameDay, nameYear, dayFirst, dayMonth, dayYear] = match
    const monthNumber = Number(isoMonth ?? usMonth ?? (1 + months.findIndex(value => value.startsWith((nameFirst ?? dayMonth).toLowerCase().slice(0, 3)))))
    const day = Number(isoDay ?? usDay ?? nameDay ?? dayFirst)
    const explicitYear = isoYear ?? usYear ?? nameYear ?? dayYear
    const year = explicitYear ? Number(explicitYear) : refDate.getFullYear()
    let date = new Date(year, monthNumber - 1, day, 9)
    if (!explicitYear && date < refDate && day === date.getDate() && monthNumber === date.getMonth() + 1) {
      date = new Date(year + 1, monthNumber - 1, day, 9)
    }
    if (date.getDate() !== day || date.getMonth() + 1 !== monthNumber || year < 100) continue
    const prefix = text.slice(Math.max(0, match.index - 85), match.index)
    const confidence = chargeLabel.test(prefix.split(/[.!?\n]/).at(-1) ?? '') ? 0.98 : 0.63
    if (!strongest || confidence > strongest.confidence) strongest = { value: formatISO(date), confidence, source: match[0] }
  }
  if (strongest) return strongest
  const relative = /\b(?:trial ends? in|will be charged in|renews in)\s+(\d{1,3})\s+days?\b/i.exec(text)
  if (relative && Number.isFinite(+refDate)) {
    const date = addDays(refDate, Number(relative[1]))
    date.setHours(9, 0, 0, 0)
    return { value: formatISO(date), confidence: 0.78, source: relative[0] }
  }
}
