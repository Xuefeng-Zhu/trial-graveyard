import { format } from 'date-fns'

export const xpByKind = { add: 10, review: 5, cancel: 25 }
export type XpKind = keyof typeof xpByKind
export interface XpEntry { kind: XpKind; graveId: string; at: string }

export const styles = [
  { id: 'classic', label: 'Classic', level: 1 },
  { id: 'mossy', label: 'Mossy', level: 3 },
  { id: 'obsidian', label: 'Obsidian', level: 6 },
  { id: 'rose-quartz', label: 'Rose quartz', level: 10 },
] as const
export const decorations = [
  { id: 'lantern', label: 'Lantern', level: 2 },
  { id: 'pumpkin', label: 'Pumpkin', level: 3 },
  { id: 'flower', label: 'Flower bed', level: 5 },
  { id: 'raven', label: 'Raven', level: 8 },
] as const
export type StyleId = typeof styles[number]['id']
export const MAX_LEVEL = 20

export function uniqueXp(entries: readonly XpEntry[]) {
  const seen = new Set<string>()
  return entries.filter(({ kind, graveId }) => {
    const key = JSON.stringify([kind, graveId])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function totalXp(entries: readonly XpEntry[]) {
  return uniqueXp(entries).reduce((sum, entry) => sum + xpByKind[entry.kind], 0)
}

export function xpForLevel(level: number) {
  return 100 * level * (level - 1) / 2
}

export function levelForXp(xp: number) {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  return level
}

export function xpProgress(xp: number) {
  const level = levelForXp(xp)
  const base = xpForLevel(level)
  return level === MAX_LEVEL ? 1 : Math.max(0, (xp - base) / (xpForLevel(level + 1) - base))
}

export function styleUnlocked(id: StyleId, xp: number) {
  return styles.some(style => style.id === id && levelForXp(xp) >= style.level)
}

export function dailyQuest(entries: readonly XpEntry[], now: Date) {
  const date = format(now, 'yyyy-MM-dd')
  return uniqueXp(entries).some(entry => entry.kind === 'cancel' && entry.at.slice(0, 10) === date) ? 1 : 0
}
