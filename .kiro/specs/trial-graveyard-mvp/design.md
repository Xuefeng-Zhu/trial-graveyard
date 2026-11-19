# Design: Trial Graveyard MVP

Follows `.kiro/steering/tech.md` and `structure.md`. Requirement IDs (R1..R11, P-*) refer to `requirements.md`.

## 1. Architecture

Static single-page app: Vite + React 18 + TypeScript strict. No server. Data lives in IndexedDB.

```
src/
  domain/            pure, no React, takes `now` as a parameter, 100% unit tested
    trial.ts         Grave type, validation, factory
    stage.ts         getStage, getViewState, countdown label
    savings.ts       monthlyCents, savedCents, totalSavedByCurrency
    ics.ts           buildIcs (pure string builder)
  lib/parse/         deterministic receipt parser (money.ts, date.ts, cadence.ts, url.ts, index.ts)
  state/             Zustand store, idb-keyval storage adapter, migrations, clock hook
  features/
    graveyard/       Scene, Grave, Zombie, Ghost, Tombstone, Fog, Mausoleum
    daylight/        DaylightList (accessible list view)
    editor/          GraveForm, PasteBox
  design/            tokens.css, typography, sounds (muted by default)
  app/               App shell, mode toggle, demo seed, service worker registration
```

Data flow: `store (graves, settings)` -> selectors -> `getViewState(grave, now)` -> presentational components. A `useNow(intervalMs = 60000)` hook supplies `now`, refreshing on `visibilitychange`. Components never call `Date.now()` directly, so tests inject a clock.

## 2. Data models

```ts
type Cadence = 'one-time' | 'weekly' | 'monthly' | 'yearly';
type Status = 'active' | 'cancelled' | 'kept';

interface Grave {
  id: string;                 // crypto.randomUUID()
  name: string;
  chargeAt: string;           // ISO 8601 with local offset, e.g. 2026-10-31T09:00:00-07:00
  priceCents: number;         // integer >= 0
  currency: string;           // ISO 4217, default 'USD'
  cadence: Cadence;
  cancelUrl?: string;         // http(s) only
  status: Status;
  cancelledAt?: string;
  keptAt?: string;
  createdAt: string;
}

interface Settings { daylight: boolean; soundOn: boolean; llmFallback: boolean; }
interface PersistedState { version: 1; graves: Grave[]; settings: Settings; }

type ViewState =
  | { kind: 'grave'; stage: Stage; remainingMs: number }
  | { kind: 'tombstone'; epitaph: string; savedCents: number }
  | { kind: 'ghost'; monthlyCents: number };

interface ParseResult {
  name?: Field<string>; priceCents?: Field<number>; currency?: Field<string>;
  cadence?: Field<Cadence>; chargeAt?: Field<string>; cancelUrl?: Field<string>;
}
type Field<T> = { value: T; confidence: number; source: string }; // source = matched substring
```

Dates are stored as ISO strings in local time (tech.md). Date-only inputs from the form default to 09:00 local so that the zombie window starts at a predictable hour. `remainingMs = Date.parse(chargeAt) - now.getTime()`, so stage math is on elapsed time and unaffected by DST.

Savings: `monthlyCents` = weekly `round(p*52/12)`, monthly `p`, yearly `round(p/12)`, one-time `0`. `savedCents = priceCents` for cancelled graves. Totals are grouped by currency (P-M8); the UI shows the totals per currency and the primary one big.

## 3. Stage state machine

Two layers.

**Lifecycle (user driven)**

```
active --"I cancelled"--> cancelled   (tombstone)
active --"Keep it"------> kept        (ghost)
cancelled/kept --undo (10 s window) or edit--> active
```

**Urgency (time driven, only while `active`)**. `R = chargeAt - now`:

```
sealed  --R<=7d-->  cracked  --R<=3d-->  churning  --R<=48h-->  zombie  --R<=0-->  overdue
```

Time only moves forward, but editing `chargeAt` can move a grave back, which is allowed. Each boundary belongs to the later (more urgent) stage, so `R = 7d` is `cracked`, `R = 3d` is `churning`, `R = 48h` is `zombie`, `R = 0` is `overdue`. The implementation is a single threshold table so the property tests can use an independent oracle:

```ts
const THRESHOLDS = [[0,'overdue'],[48*H,'zombie'],[72*H,'churning'],[168*H,'cracked']] as const;
// first row where R <= limit wins; otherwise 'sealed'
```

Note: `R <= 0` is checked first, so a charge exactly at `now` is `overdue`, and `1 ms` left is `zombie`.

## 4. Scene and animation approach

- **Layout**: an SVG scene (viewBox scaled to the container) with a ground plane. Graves are placed in rows by sort order (charge date). Zombies are HTML/SVG elements promoted toward the front: transform `translateY` and `scale` increase with urgency, with `zIndex` above other graves. Ghosts float in a band above the graves. Tombstones are in the Mausoleum strip and in the scene corner.
- **Per stage visuals**: sealed (plain stone), cracked (crack SVG overlay), churning (dirt particles with CSS keyframes and a `--glow` green drop-shadow pulse), zombie (arm sprite rises, then a Framer Motion `animate` shamble loop that moves toward the front), overdue (zombie plus a red "Overdue" tag).
- **Fog and particles**: one `<canvas>` layer with a capped particle count (about 40), drawn by `requestAnimationFrame`, paused when the tab is hidden and when reduced motion or Daylight mode is on.
- **Tech split**: CSS keyframes for cheap loops (glow, ghost bob). Framer Motion for orchestrated entrances, the zombie shamble, layout changes and the undo/cancel transitions.
- **Reduced motion**: a single `useReducedMotion()` hook (Framer Motion's hook, backed by `matchMedia('(prefers-reduced-motion: reduce)')`, subscribed to changes) feeds a `motion` context value. A global CSS block `@media (prefers-reduced-motion: reduce)` sets `animation: none !important` on scene classes as a safety net. With reduced motion: zombies show a static pose placed in the front row, fog is a static gradient, ghosts are static, the canvas loop does not start, and state changes use a 150 ms opacity fade (R8.4). Urgency is still shown by pose, glow color, border and text label.
- **Daylight mode**: skips the scene entirely. The route renders `DaylightList`, a semantic `<ul>` sorted by charge date with a stage text badge, price, countdown, and the same three actions. No continuous animation and a light, high contrast theme using the same tokens.
- **Accessibility**: each grave is a `role="listitem"` (or `button`-like group) with an `aria-label` such as "Phantomflix, zombie, charges in 5 hours, $15.49 monthly". Arrow keys move a roving tabindex across graves; Enter opens the action panel; Escape closes it. A visible focus ring token is used everywhere. `aria-live="polite"` announces stage changes and the Mausoleum total update. Sounds are off by default and are triggered only by user actions.

## 5. Receipt parser

Pipeline in `src/lib/parse/index.ts`: normalize (NFKC, collapse whitespace) -> extract money (symbol or code, thousands and decimal handling, to integer cents) -> extract cadence by keywords ("/mo", "per month", "monthly", "annually", "per year", "weekly") -> extract dates (labelled phrases like "trial ends", "first charge", "renews on" win over bare dates; relative to a `refDate` parameter for year-less dates) -> extract URLs (prefer links with "cancel", "manage", "account") -> guess name (from "Your {X} trial", "Welcome to {X}", the sender line or the domain). All regexes avoid nested quantifiers and input is truncated to 50 KB (P-P9). `parseReceipt(text, refDate)` is pure. An optional `llmFallback` module is imported lazily and only used when `settings.llmFallback` is on and fewer than 3 fields were found; the default build contains no network call.

## 6. Persistence and offline

Zustand `persist` with a custom `StateStorage` over `idb-keyval` (`get`, `set`, `del`). `version: 1` plus a `migrate` function; a Zod-free hand validator rejects corrupt records and resets with a notice (R9.5). If IndexedDB throws, the storage adapter falls back to memory and sets `persistenceAvailable = false`. Offline support uses `vite-plugin-pwa` (Workbox precache) with a web manifest.

## 7. ICS export

`buildIcs(graves, now)` returns a string: `VCALENDAR` with one `VEVENT` per grave, `UID = {id}@trial-graveyard`, `DTSTAMP`, an all-day `DTSTART;VALUE=DATE` on the charge date, and a `VALARM` with `TRIGGER:-PT24H`. Text escaping and 75-octet line folding (UTF-8 aware) live in small helpers. The UI downloads it using a `Blob` and an anchor with `download`.

## 8. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Domain | Vitest + fast-check | All P-S*, P-M*, P-I1, P-X1. Example tests for each boundary. Coverage gate 100% on `src/domain/`. |
| Parser | Vitest + fast-check + fixtures | P-P1..P-P9, plus a fixture corpus of about 15 realistic receipts (Phantomflix, Necro Audiobooks, Wraithwave, Cryptic Cloud, a yearly plan, non-US formats). |
| Components | Testing Library + jest-dom | Form validation (R1), action buttons and undo (R3), Daylight list, Mausoleum counter, keyboard navigation, aria labels. |
| Reduced motion | Testing Library with mocked `matchMedia` | With reduce on, no looping animation classes or canvas loop; static pose is rendered. |
| Persistence | fake-indexeddb | Round trip, migration, corrupt data fallback. |
| Accessibility | vitest-axe on key screens | No serious violations in both modes. |
| E2E smoke (manual or Playwright, optional) | | Add trial, paste receipt, cancel, see counter, reload offline. |

fast-check generators: `arbChargeOffsetMs` (integers biased toward the boundaries ±1 ms), `arbGrave`, `arbReceipt` (template plus noise), run with a fixed seed in CI and `numRuns >= 200`. Failing seeds are recorded as regression examples. All domain tests pass `now` explicitly; no fake timers are needed there.

CI (GitHub Actions): `npm ci`, `tsc --noEmit`, `vitest run --coverage`, `vite build`.

## 9. Deployment

`vite build` outputs `dist/`. Deploy to Netlify or Vercel (or GitHub Pages with `base` set) using the free tier. The public URL is added to README.md and the submission. The deploy is verified by loading the URL, running the demo seed and reloading offline.

## 10. Risks
- Stage boundaries ambiguity in the steering: resolved in section 3.
- Parser variety: mitigated with fixtures and the manual edit step.
- Scene performance on low-end phones: capped particles, canvas paused when hidden, Daylight mode as the escape hatch.
