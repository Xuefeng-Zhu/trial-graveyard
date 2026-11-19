const brands = /\b(?:Phantomflix|Wraithwave(?: Premium)?|Cryptic Cloud|Hexlingo(?: Max)?|Banshee Box|Grimoire\+|Hollowtv|Moonnotes(?: Plus)?|Necro Audiobooks|Spectral Fitness|Ghoul GPT Pro)(?![\p{L}\d])/iu

export function extractName(text: string) {
  const known = brands.exec(text)
  if (known) return { value: known[0], source: known[0], confidence: 0.96 }
  const match = /(?:\byour[ \t]+([^\n.!?;:]{1,70}?)[ \t]+(?:free[ \t]+)?trial\b|\bwelcome to[ \t]+([^\n.!?;:]{1,70}))/i.exec(text)
  const source = (match?.[1] ?? match?.[2])?.trim()
  const value = source?.split(/\s+(?:your|free|trial|plan|premium|subscription)\b/i)[0].trim()
  return value && source ? { value, source, confidence: 0.76 } : undefined
}
