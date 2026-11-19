# Tasks: Trial Graveyard MVP

Ordered and incremental. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [ ] 1. Scaffold the project
  - Create Vite + React 18 + TypeScript (strict) app in the repo root. Add zustand, idb-keyval, date-fns, framer-motion, vitest, @testing-library/react, jest-dom, fast-check, fake-indexeddb, vitest-axe, vite-plugin-pwa.
  - Create the folder layout from `structure.md`. Keep `.kiro/` committed; `.gitignore` must not list it.
  - Add npm scripts: `dev`, `build`, `test`, `typecheck`, and a GitHub Actions workflow running typecheck, tests, build. [R11.1]

- [ ] 2. Domain: trial model and stage calculation
  - [ ] 2.1 `src/domain/trial.ts`: types, validation (name, date, price, cadence, http(s) URL), factory. [R1.2, R1.3, R1.5]
  - [ ] 2.2 `src/domain/stage.ts`: `getStage`, `getViewState`, countdown label, using the threshold table from design section 3. [R2.1, R2.8]
  - [ ] 2.3 Example tests for every boundary (±1 ms) plus fast-check tests P-S1 to P-S8. 100% coverage. [R2]

- [ ] 3. Domain: savings math
  - [ ] 3.1 `src/domain/savings.ts`: `monthlyCents`, `savedCents`, `totalSavedByCurrency`, epitaph text, money formatting. [R4, R3.3]
  - [ ] 3.2 Property tests P-M1 to P-M8 and example tests.

- [ ] 4. Domain: ICS export
  - [ ] 4.1 `src/domain/ics.ts` with escaping, folding, VALARM. [R6]
  - [ ] 4.2 Tests including P-I1.

- [ ] 5. Receipt parser
  - [ ] 5.1 `src/lib/parse/` modules for money, cadence, date, url and name, plus `parseReceipt(text, refDate)`. [R5.1 to R5.4]
  - [ ] 5.2 Fixture corpus of about 15 receipts and example tests.
  - [ ] 5.3 Property tests P-P1 to P-P9. Fix any catastrophic regexes found.
  - [ ] 5.4 Feature-flagged LLM fallback stub, off by default, lazily imported, no network when off. [R5.7, R5.8]

- [ ] 6. State and persistence
  - [ ] 6.1 Zustand store with actions: add, update, delete, cancel, keep, undo, toggle daylight, load demo. [R1.6, R3, R9.4]
  - [ ] 6.2 idb-keyval storage adapter, schema version, migration, corrupt data reset, in-memory fallback with notice. [R9.1, R9.3, R9.5]
  - [ ] 6.3 `useNow` clock hook (60 s tick, refresh on visibility). [R2.7]
  - [ ] 6.4 Tests with fake-indexeddb including P-X1.

- [ ] 7. Design system
  - `src/design/`: tokens.css (colors checked for AA contrast, focus ring, spacing), gothic display font plus readable body font (self-hosted), muted-by-default sound helper, global reduced-motion CSS block. [R8.4, R8.7, R8.9, R10]

- [ ] 8. Editor
  - [ ] 8.1 `GraveForm`: fields, inline errors, autofocus, keyboard only flow. [R1]
  - [ ] 8.2 `PasteBox`: calls parser, prefills form, shows the empty-result message. [R5.5, R5.6]
  - [ ] 8.3 Component tests for validation and prefill. Manually time a new trial entry (target under 10 s). [R1] (Manual timing not possible in the sandbox; the form is a single screen with 6 fields, native tab order and Enter to submit.)

- [ ] 9. Daylight mode list (built first so the app is usable before the scene)
  - `src/features/daylight/DaylightList`: sorted list, stage badge text, countdown, "Cancel now", "I cancelled", "Keep it", undo toast, ICS buttons, Mausoleum total. [R2.8, R3, R6, R7, R8.2]
  - App shell with the Daylight toggle persisted in settings, "Summon demo graveyard" action. [R8.1, R8.3, R9.4]
  - Tests and axe check.

- [ ] 10. Haunted scene
  - [ ] 10.1 `Grave`, `Tombstone`, `Ghost`, `Zombie` components per stage with SVG art and CSS keyframes. [R2.2 to R2.6, R3.3, R3.4, R7.2]
  - [ ] 10.2 `Scene` layout, zombie move-to-front, roving tabindex and arrow-key navigation, aria labels, live region. [R8.6, R8.8]
  - [ ] 10.3 `Fog` canvas layer with capped particles, paused when hidden. Framer Motion transitions for cancel and keep.
  - [ ] 10.4 `Mausoleum` counter with animated count-up. [R7]
  - [ ] 10.5 Reduced-motion variants (`useReducedMotion`), static poses and the opacity-only fade. Tests with mocked `matchMedia`. [R8.4, R8.5]

- [ ] 11. Offline and polish
  - Configure vite-plugin-pwa precache and manifest, verify load offline after first visit. [R9.2]
  - Playful copy pass for empty states, errors and epitaphs. [R10]
  - Manual keyboard-only and screen reader pass, Lighthouse accessibility check.

- [ ] 12. Checkpoint
  - Run `npm run typecheck`, `npm test` (with coverage gate on `src/domain/`) and `npm run build`. All must pass.

- [ ] 13. Deploy to a public URL
  - Deploy `dist/` to Netlify, Vercel or GitHub Pages (set Vite `base` if using Pages).
  - Open the public URL, run "Summon demo graveyard", test Daylight mode, reduced motion and offline reload.
  - Add the public URL, screenshots and a short "Built with Kiro" section to README.md. Confirm LICENSE is MIT and `.kiro/` is committed. [R11]
