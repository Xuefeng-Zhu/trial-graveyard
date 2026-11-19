import { addDays, format, formatISO, subDays } from 'date-fns'
import type { EmailMessage } from '../types'

export const senders = {
  'phantomflix.example': 'Phantomflix',
  'wraithwave.example': 'Wraithwave Premium',
  'cryptic-cloud.example': 'Cryptic Cloud',
  'hexlingo.example': 'Hexlingo Max',
  'grimoire.example': 'Grimoire+',
  'spectral-fitness.example': 'Spectral Fitness',
  'ghoul-gpt.example': 'Ghoul GPT Pro',
  'necro-audiobooks.example': 'Necro Audiobooks',
  'moonnotes.example': 'Moonnotes Plus',
  'hollowtv.example': 'Hollowtv',
} as const

export function buildFixtures(now: Date): EmailMessage[] {
  const receipts = Object.entries(senders).map(([domain, name], index) => {
    const renewal = index >= 8
    const date = format(addDays(now, 3 + index * 2), 'MMMM d, yyyy')
    return {
      id: `receipt-${index}`, from: `Billing <billing@${domain}>`,
      subject: renewal ? `Your ${name} plan renews on ${date}` : `Your ${name} free trial`,
      date: formatISO(subDays(now, index + 1)),
      text: `Welcome to ${name}.\n${renewal ? 'Renews on' : 'Trial ends'} ${date}. The charge will be $${8 + index}.99 per month.\nManage your plan at https://${domain}/account.`,
    }
  })
  const distractors = ['Your order shipped', 'Weekly newsletter', 'Password reset'].map((subject, index) => ({
    id: `letter-${index}`, from: 'Mail <mail@cobweb.example>', subject,
    date: formatISO(subDays(now, index + 11)),
    text: index === 0 ? `Expected arrival ${format(addDays(now, 4), 'yyyy-MM-dd')}.` : 'Greetings from the crypt!',
  }))
  return [...receipts, ...distractors]
}
