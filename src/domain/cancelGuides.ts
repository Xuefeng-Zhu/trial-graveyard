import { validUrl } from './trial'

export const normalizeService = (name: string) => name.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}+]/gu, '')

const guides = [
  ['Phantomflix', 'phantomflix', 'Membership'],
  ['Wraithwave Premium', 'wraithwave', 'Premium plan'],
  ['Cryptic Cloud', 'cryptic-cloud', 'Storage plan'],
  ['Hexlingo', 'hexlingo', 'Learning plan'],
  ['Hexlingo Max', 'hexlingo', 'Learning plan'],
  ['Banshee Box', 'banshee-box', 'Box subscription'],
  ['Grimoire+', 'grimoire', 'Membership'],
  ['Hollowtv', 'hollowtv', 'Streaming plan'],
  ['Moonnotes Plus', 'moonnotes', 'Workspace plan'],
  ['Necro Audiobooks', 'necro-audiobooks', 'Audiobook membership'],
  ['Spectral Fitness', 'spectral-fitness', 'Fitness membership'],
  ['Ghoul GPT Pro', 'ghoul-gpt', 'Pro plan'],
] as const

const cancelGuides = new Map(guides.map(([name, slug, section]) =>
  [normalizeService(name), { url: `https://${slug}.example/account`, section }]))

export function getCancelGuide(name: string, savedCancelUrl?: string) {
  const demo = cancelGuides.get(normalizeService(name))
  const url = savedCancelUrl && validUrl(savedCancelUrl) ? savedCancelUrl : demo?.url
  const steps = [
    demo ? `Open account settings and find ${demo.section}.` : 'Sign in where you originally started the trial.',
    demo ? 'Choose Cancel plan and follow the confirmation prompts.' : 'Open billing or subscriptions, then follow the cancellation prompts.',
    'Check the confirmation page or receipt for the effective date.',
  ]
  return { url, steps, demo: !!url && new URL(url).hostname.endsWith('.example'), searchUrl: 'https://www.google.com/' }
}
