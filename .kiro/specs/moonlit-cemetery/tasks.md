# Tasks: Moonlit Cemetery

Ordered and incremental. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [x] 1. Spec
  - [x] 1.1 Write `requirements.md`, `design.md`, `tasks.md`.

- [x] 2. Domain: motion mapping
  - [x] 2.1 `src/domain/motion.ts` with `motionFor` and `isMotionAllowed`. [M4.1 to M4.5, M8.1]
  - [x] 2.2 Example and property tests P-M1 to P-M7, keep 100% coverage. [M4]

- [x] 3. State: Calm mode
  - [x] 3.1 `settings.calm`, `toggleCalm`, migration default, updated store tests. [M8.2, M8.3]
  - [x] 3.2 `useMotionAllowed` hook with tests. [M8.1]

- [x] 4. Parallax scene
  - [x] 4.1 `ParallaxScene` with five layers driven by pointer, scroll and tilt via motion values. [M1]
  - [x] 4.2 Static render when motion is not allowed, with tests. [M1.5]

- [x] 5. Atmosphere
  - [x] 5.1 `particles.ts` pooled simulation with tests. [M2.1, M2.3]
  - [x] 5.2 Lazy `AtmosphereCanvas` (own chunk), pause when hidden, CSS moon pulse. [M2, M10.1]
  - [x] 5.3 Mount `MoonlitBackdrop` in the app.

- [x] 6. Visual tokens
  - [x] 6.1 Palette, serif font, glass utility, softer Daylight. Contrast tests stay green. [M8.4, M8.5]

- [x] 7. Tombstones and restlessness
  - [x] 7.1 Tombstone SVG with engraved name, countdown, price, depth rows, actions. [M3]
  - [x] 7.2 Glow, cracks, tremble, zombie hand with dirt, ghost, using `motionFor`. [M4]
  - [x] 7.3 Accessible list mirroring graves; keep Daylight list. [M3.3]

- [x] 8. Signature interactions
  - [x] 8.1 Intro, skippable, once per session. [M5.1]
  - [x] 8.2 Summon, bury with floating saved amount and counter roll. [M5.2, M5.3]
  - [x] 8.3 Hover and focus lift, wandering ghost. [M5.4, M5.5]

- [x] 9. Glass HUD, sound sync and mobile
  - [x] 9.1 HUD panels, Calm toggle in settings, all entry points. [M6]
  - [x] 9.2 Sound sync with animations. [M7]
  - [x] 9.3 360 px layout, bottom sheet. [M9]
  - [x] 9.4 Update App, graveyard and landing tests; axe on main views.

- [ ] 10. README and closure
  - [ ] 10.1 Screenshots, Kiro features table, bundle check. [M10]
