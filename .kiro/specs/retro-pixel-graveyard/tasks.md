# Tasks: Retro Pixel Graveyard

Ordered by the phases of issue #34. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [x] 0. Baseline
  - [x] 0.1 Merge pixel assets, install `@fontsource/press-start-2p`.

## Phase 1: Audit
- [ ] 1.1 List screens, components and tests that depend on `features/moonlit` and `public/scene`. [R2.2]
- [ ] 1.2 Record contrast and trademark audit of current copy and samples. [R1.4, R8]

## Phase 2: Design system
- [ ] 2.1 Palette tokens, Press Start 2P + Inter, pixel utilities. [R1]
- [ ] 2.2 Contrast tests for the Palette. [R1.4]

## Phase 3: Cemetery scene
- [x] 3.1 Spec written (`requirements.md`, `design.md`, `tasks.md`).
- [x] 3.2 Domain: `pixelState.ts` with example and property tests. [R3.1 to R3.7]
- [ ] 3.3 Pixel backdrop and reaper scene; retire `features/moonlit` and `public/scene`. [R2]
- [ ] 3.4 Gravestone component for all five states plus selected. [R3, R3.8]

## Phase 4: Mobile
- [ ] 4.1 360 px layout, touch targets, no horizontal scroll. [R4.1]
- [ ] 4.2 Daylight list view restyled. [R4.2]

## Phase 5: Feature integration
- [x] 5.1 Domain: `xp.ts` with example and property tests, XP never touches money. [R6.1 to R6.7]
- [x] 5.2 State: ledger, style selection, migration default, store tests. [R6.7, R6.8]
- [ ] 5.3 HUD: level, XP bar, daily quest, collection of decorations and styles. [R6.2 to R6.5]
- [ ] 5.4 Inbox Seance restyle. [R5.1]
- [ ] 5.5 Image Receipt OCR restyle. [R5.1]
- [ ] 5.6 Cancellation and Exorcise flow using `store.exorcise`, no early claims. [R5.2, R5.3]
- [ ] 5.7 Reminders, savings, share card and settings restyle. [R5.1]
- [ ] 5.8 Call `reviewGrave` when a trial is opened. [R6.1]
- [ ] 5.9 Replace remaining third-party names with fictional ones. [R8.1]

## Phase 6: Polish
- [ ] 6.1 Motion for sparks, zombie hand, reaper, gated by motion allowed. [R7.1]
- [ ] 6.2 Optional sound, muted by default. [R7.2]
- [ ] 6.3 Cancellation celebration. [R7.3]

## Phase 7: Validation
- [ ] 7.1 `npm run typecheck`, `npm test` with 100% domain coverage, `npm run build`. [R9.1]
- [ ] 7.2 Accessibility tests (vitest-axe). [R9.1]
- [ ] 7.3 Screenshots at 360 px and 1440 px in `docs/screenshots`. [R9.2]
- [ ] 7.4 Em dash and trademark sweep. [R8]
