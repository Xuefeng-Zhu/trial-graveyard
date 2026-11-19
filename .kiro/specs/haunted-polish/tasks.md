# Tasks: Haunted Polish

Ordered and incremental. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [x] 1. Domain: personalised epitaph formatter
  - [x] 1.1 `src/domain/epitaph.ts` with `formatEpitaph(grave)` using UTC month and year and the money formatter in `savings.ts`. [H2.1 to H2.3]
  - [x] 1.2 Example tests including "Here lies Phantomflix · $13.99/mo · slain Nov 2026", one-time and non-USD cases. Keep 100% coverage.

- [x] 2. Property tests for epitaph and savings totals
  - [x] 2.1 Extend `src/domain/arbitraries.ts` with a cancelled-grave arbitrary (random name, currency, cadence, `cancelledAt`). [H7]
  - [x] 2.2 Properties P-E1 to P-E5 for `formatEpitaph`. [H7.1]
  - [x] 2.3 Properties P-T1 to P-T5 for `totalSavedByCurrency`. [H7.2]

- [x] 3. Tombstone epitaph and souls saved
  - Use `formatEpitaph` in `Tombstone.tsx`, show the per-currency souls saved total in `Mausoleum.tsx` with a polite live region, and check that undo restores the total. Update graveyard tests. [H2.4 to H2.7]

- [x] 4. Cinematic landing screen
  - [x] 4.1 `src/features/landing/Landing.tsx` and CSS module: supplied pixel backdrop, Reaper, pitch, "Summon demo graveyard" button wired to `loadDemo`. [H1.1, H1.2, H1.4]
  - [x] 4.2 Reduced-motion and Daylight variants. Render it from `App.tsx` when there are no graves. [H1.3, H1.5]
  - [x] 4.3 Tests with mocked `matchMedia` plus a vitest-axe check. [H8.1]

- [x] 5. Sound effects
  - [x] 5.1 Add `creak` and `thunder` to `src/design/sounds.ts`, synthesised with Web Audio and still muted by default. No audio files. [H3.1, H3.6, H3.7]
  - [x] 5.2 Sound toggle in the app header with `aria-pressed`, persisted in `settings.soundOn` and applied on load. [H3.2, H3.3]
  - [x] 5.3 Play the creak on bury and the thunder sting on cancel while sound is on. Tests for the muted default, persistence and missing `AudioContext`. [H3.4, H3.5]

- [x] 6. Share summary and canvas card
  - [x] 6.1 `src/domain/shareCard.ts` with `buildShareSummary(graves)` (totals and slain count, no names or URLs) and tests, including a property that names never appear. [H4.2, H4.5]
  - [x] 6.2 `src/features/share/drawShareCard.ts`: 1080x1350 canvas with totals and `#KiroweenHackathon26`, returns a PNG blob. [H4.2]

- [x] 7. Share button
  - `src/features/share/ShareButton.tsx`: Web Share API with files, download fallback, quiet `AbortError`, no-canvas message. Show it only when a grave is cancelled. Tests with mocked canvas and `navigator.share`, plus an axe check. [H4.1, H4.3, H4.4, H4.6, H8.1]

- [x] 8. Mobile layout pass
  - Add `@media (max-width: 480px)` rules to the landing, scene, editor, daylight and Mausoleum CSS modules. Single column, 44px touch targets, no horizontal scroll at 360px. Check manually in devtools at 360px. [H5]

- [x] 9. README screenshots and Kiro features table
  - Capture screenshots and a GIF into `docs/screenshots/`, add a "Screenshots" section with alt text, and a "Kiro features used" table (steering, specs 2, hooks 5, MCP, property-based tests, agent PRs). [H6]

- [x] 10. Checkpoint
  - Run `npm run typecheck`, `npm test` (100% domain coverage gate) and `npm run build`. Manual keyboard, reduced-motion and contrast pass on the new screens. Confirm all tasks above are ticked and the `spec-sync` hook has updated the README counts. [H8]
