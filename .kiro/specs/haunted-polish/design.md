# Design: Haunted Polish

Follows `.kiro/steering/tech.md` and `structure.md`. Requirement IDs (H1..H8) refer to `requirements.md`. Builds on the MVP design in `.kiro/specs/trial-graveyard-mvp/design.md`.

## 1. Where things go

```
src/
  domain/
    epitaph.ts            pure formatEpitaph(grave) (H2)
    savings.ts            existing; totalSavedByCurrency reused for souls saved (H2.5)
    shareCard.ts          pure buildShareSummary(graves): totals, slain count (H4.2, H4.5)
    arbitraries.ts        add graveArb variants for cancelled graves (H7)
  design/
    sounds.ts             extend SoundName with 'creak' and 'thunder', synthesised (H3)
  features/
    landing/              Landing.tsx, landing.module.css, index.ts (H1)
    share/                ShareButton.tsx, drawShareCard.ts (canvas), share.test.tsx (H4)
    graveyard/            Tombstone.tsx uses formatEpitaph; Mausoleum.tsx shows souls saved (H2)
  app/                    App.tsx renders Landing when graves is empty; sound toggle in the header
docs/screenshots/         PNG and GIF files for the README (H6)
```

The domain functions stay pure and take no clock. The canvas and Web Share code live in `features/share/` only.

## 2. Landing screen (H1)
- Layers: CSS gradient sky, a moon (inline SVG with a soft glow), and the existing `Fog` component with a low particle cap.
- Content: `h1` app name, one-line pitch ("Every free trial is a grave. Cancel before it rises."), and a primary button "Summon demo graveyard" that calls the store's `loadDemo`.
- Reduced motion: `useReducedMotion()` (existing) swaps `Fog` for a static fog gradient and disables the moon glow animation. The global reduced-motion CSS block in `global.css` is the backstop.
- Daylight mode: render only the heading, pitch and button.
- The landing screen shows only when `graves.length === 0`; adding a trial or loading the demo replaces it.

## 3. Epitaph formatter (H2)
```ts
const SHORT: Record<Cadence, string> = { weekly: 'wk', monthly: 'mo', yearly: 'yr', 'one-time': '' };

export function formatEpitaph(g: Grave): string {
  const price = formatMoney(g.priceCents, g.currency);       // existing in savings.ts
  const cadence = SHORT[g.cadence] ? `/${SHORT[g.cadence]}` : '';
  const slain = format(parseISO(g.cancelledAt ?? g.createdAt), 'MMM yyyy', { locale: enUS });
  return `Here lies ${g.name} · ${price}${cadence} · slain ${slain}`;
}
```
- Month and year are taken in the instant's own offset so tests are stable across time zones. Use `Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })` on the ISO date if `date-fns` would use the local zone.
- The existing epitaph in `savings.ts` is kept as the fallback for graves without `cancelledAt`.
- Souls saved: `Mausoleum` shows `totalSavedByCurrency(graves)` with an `aria-live="polite"` region so cancellations are announced.

## 4. Sound (H3)
- `sounds.ts` keeps the module-level `enabled` flag, still false by default. `Settings.soundOn` (already in the data model) is the persisted source; the app calls `setSoundEnabled(settings.soundOn)` on load and when the toggle changes.
- Creak: a sawtooth oscillator with a slow frequency glide (about 90 to 140 Hz) through a bandpass filter and a short gain envelope, 0.6 s.
- Thunder sting: a noise buffer (random samples) through a low-pass filter whose cutoff falls, with a fast attack and a 1 s decay.
- Master gain is at most 0.15. The `AudioContext` is created lazily on a user action and closed after the sound, and every call is wrapped in try/catch (existing pattern).
- Toggle: a button with `aria-pressed` and a text label ("Sound: off" / "Sound: on").

## 5. Share card (H4)
- `buildShareSummary(graves)` returns `{ totals: {currency, cents}[], slain: number }` from cancelled graves only.
- `drawShareCard(summary): Promise<Blob>` draws a 1080x1350 canvas: dark gradient, moon, title "My Graveyard", totals, "N souls saved from charges", and `#KiroweenHackathon26`. It uses `canvas.toBlob`. The system font stack and the self-hosted display font are used once loaded (`document.fonts.ready`).
- `ShareButton`:
  1. Build the blob and a `File` named `my-graveyard.png`.
  2. If `navigator.canShare?.({ files: [file] })`, call `navigator.share({ files, text: '#KiroweenHackathon26' })`. An `AbortError` ends quietly.
  3. Otherwise download through an object URL on a temporary anchor (same approach as `features/daylight/downloadIcs.ts`) and revoke the URL.
  4. If `getContext('2d')` is null, show an inline message.

## 6. Mobile pass (H5)
- Breakpoint `@media (max-width: 480px)` in each feature CSS module. Scene scales through viewBox and percentage widths; the editor and Mausoleum stack in one column.
- Controls get `min-height: 44px; min-width: 44px`. Body size stays at 16px.
- Manual check at 360px in browser devtools; record screenshots for the README.

## 7. README (H6)
- Add "Screenshots" under "Run it" and a "Kiro features used" table before "License". The `spec-sync` hook keeps counts correct.

## 8. Testing
| Area | Tests |
|---|---|
| `formatEpitaph` | Example: "Here lies Disney+ · $13.99/mo · slain Nov 2026". Properties P-E1 to P-E5 (H7.1). |
| Savings totals | Properties P-T1 to P-T5 (H7.2) with `fc.array(graveArb)` and `fc.shuffledSubarray`. |
| `buildShareSummary` | Example and property: no grave name appears in the output (H4.5). |
| `Landing` | Renders pitch and button, button loads the demo, reduced-motion variant has no animated nodes, axe passes. |
| Sound toggle | Defaults off, persists, `aria-pressed` correct, `playSound` is a no-op when muted or when `AudioContext` is missing. |
| `ShareButton` | Mocked canvas and `navigator.share`: share path, download fallback, AbortError, no canvas. |

Property IDs: P-E1 name present, P-E2 price present, P-E3 month and year present, P-E4 no "undefined" or "NaN", P-E5 deterministic. P-T1 total equals sum, P-T2 non-negative, P-T3 order independent, P-T4 ignores active and kept graves, P-T5 cancel then undo restores total.

## 9. Risks
- Time zones in the epitaph month: use UTC-based formatting and test with graves near month boundaries.
- Canvas is not implemented in jsdom: mock `HTMLCanvasElement.prototype.getContext` and `toBlob` in tests.
- Autoplay rules: audio starts only from a click or key press handler.
