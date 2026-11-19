import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function rgb(hex: string) {
  return (hex.match(/\w\w/g) ?? []).map(pair => {
    const value = parseInt(pair, 16) / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  })
}
function luminance(hex: string) {
  const [r, g, b] = rgb(hex)
  return .2126 * r + .7152 * g + .0722 * b
}
function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (high + .05) / (low + .05)
}
function readTokens(css: string) {
  return Object.fromEntries(Array.from(css.matchAll(/--([\w-]+):\s*(#[a-f\d]+|white|var\(--[\w-]+\));/gi), ([, name, value]) => [name, value]))
}
const [dark, light] = tokens.split("[data-daylight='true']")
const darkTokens = readTokens(dark)
const lightTokens = { ...darkTokens, ...readTokens(light) }
function resolve(values: Record<string, string>, key: string): string {
  const value = values[key]
  if (value === 'white') return '#ffffff'
  if (value.startsWith('var(--')) return resolve(values, value.slice(6, -1))
  return value
}

for (const [mode, values] of [['Graveyard', darkTokens], ['Daylight', lightTokens]] as const) {
  it.each(['ink', 'muted', 'accent', 'warning', 'danger'].flatMap(foreground => ['bg', 'panel', 'raised'].map(background => [foreground, background])))(
    `${mode} text pair %s on %s meets AA`, (foreground, background) => {
      expect(contrast(resolve(values, foreground), resolve(values, background))).toBeGreaterThanOrEqual(4.5)
    })
  it(`${mode} primary button text meets AA`, () => {
    expect(contrast(resolve(values, 'accent-ink'), resolve(values, 'accent'))).toBeGreaterThanOrEqual(4.5)
  })
}
it.each([['#211633', '#e9dcff'], ['#ffcf86', '#180f2e'], ['#ffb1bc', '#180f2e'], ['#c5ff90', '#180f2e'], ['#d8edff', '#180f2e']])
  ('keeps gravestone plaques and state badges readable %s on %s', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })
