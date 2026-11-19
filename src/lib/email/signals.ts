import { senders } from './providers/fixtures'

export function emailSignals(subject: string, from: string) {
  const domain = /@([a-z\d.-]+)/i.exec(from)?.[1].toLowerCase() ?? ''
  const sender = Object.hasOwn(senders, domain) ? senders[domain as keyof typeof senders] : undefined
  const match = /\b(trial|free for|will be charged|renews on)\b/i.exec(subject)
  const distractor = !match && /\b(shipp(?:ed|ing)|newsletter|password reset)\b/i.test(subject)
  return { domain, sender, match: match?.[0].toLowerCase(), distractor }
}
