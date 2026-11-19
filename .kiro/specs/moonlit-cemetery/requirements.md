# Requirements: Moonlit Cemetery

Phase 13 redesign of Trial Graveyard as a cinematic, animated moonlit cemetery, matching `docs/design/concept-moonlit.jpg` (midnight indigo, moonlight silver, ectoplasm green `#7CFFB2` accents, serif headings, clean sans body, glassy floating panels). Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`. This spec extends `.kiro/specs/haunted-polish/` and does not change the stage or savings rules in `src/domain/stage.ts` and `savings.ts`.

## Glossary
- **Scene**: the full-viewport layered background (sky, hills, graves, fog, foreground).
- **Motion allowed**: true when the OS does not request reduced motion AND Calm mode is off.
- **Calm mode**: an in-app, persisted setting that turns off decorative motion.
- **Restlessness**: the animation state of a grave derived from its urgency.
- **Atmosphere**: the canvas particle system (fog bands, fireflies, wisps, shooting star).
- **HUD**: the glass floating panels over the scene.

## Requirements

### M1. Parallax scene
User story: As a visitor, I want a living, layered cemetery so that the app feels cinematic.
1. THE Scene SHALL fill the viewport and render 4 to 5 depth layers in this order: sky, hills, graves, fog, foreground.
2. WHILE motion is allowed, THE layers SHALL move at different depths in response to pointer movement and scroll.
3. WHERE the device reports orientation events, THE layers SHALL also respond to device tilt.
4. THE Scene SHALL move layers using `transform` only, SHALL not read layout in animation loops and SHALL update at most once per animation frame.
5. WHILE motion is not allowed, THE Scene SHALL render static layers with no parallax.

### M2. Living atmosphere
1. WHILE motion is allowed, THE Atmosphere SHALL draw drifting fog bands, fireflies or wisps and an occasional shooting star on a canvas.
2. THE moon glow SHALL pulse slowly through a CSS animation while motion is allowed.
3. THE Atmosphere SHALL be loaded lazily in its own chunk and SHALL cap pixel ratio and particle count.
4. WHEN the document is hidden, THE Atmosphere SHALL stop its animation loop, and SHALL resume when visible.
5. WHILE motion is not allowed, THE Atmosphere SHALL draw nothing or one static frame.

### M3. Tombstones as the trial list
1. EACH trial SHALL be shown as a tombstone with engraved name, countdown, price and depth rows by urgency.
2. EACH tombstone SHALL be keyboard focusable and expose every action of the old grave.
3. THE app SHALL offer an accessible list equivalent that mirrors every grave, and Daylight mode SHALL keep its list view.

### M4. Restlessness by urgency
1. THE app SHALL map each view state to an animation state with a pure function in `src/domain/motion.ts`.
2. WHEN an active grave has 72 hours or less remaining, THE tombstone SHALL glow, show cracks and tremble.
3. WHEN an active grave has 24 hours or less remaining, or is overdue, THE tombstone SHALL also show a zombie hand and dirt.
4. WHEN a grave is kept, THE app SHALL show a ghost above it. Cancelled graves SHALL be calm.
5. THE mapping SHALL be monotonic in urgency and SHALL reuse the existing stage thresholds without changing them.
6. A text label (`stageLabel`) SHALL remain, so animation is never the only signal.

### M5. Signature interactions
1. THE app SHALL play a skippable intro once per session (moon rises, camera pans, graves rise).
2. WHEN a trial is added, THE app SHALL play a summon animation.
3. WHEN a trial is cancelled, THE app SHALL play a bury animation and float the saved amount, and the souls saved counter SHALL roll up.
4. THE tombstones SHALL lift on hover and focus.
5. WHERE motion is allowed, A wandering ghost SHALL drift across the scene and flee when clicked.

### M6. Glass HUD
1. THE HUD SHALL show "Next to rise" with a "Bury it" action, the add, paste, screenshot and Seance entry points, souls saved and settings.
2. THE settings SHALL include sound, Daylight mode and Calm mode.
3. ALL existing features SHALL stay reachable.

### M7. Sound sync
1. THE app SHALL play the matching sound with summon, bury, keep and undo animations, and SHALL stay muted by default.

### M8. Motion accessibility
1. WHILE the OS prefers reduced motion OR Calm mode is on, THE app SHALL show a static scene, make transitions instant, run no parallax and draw no particles.
2. THE Calm mode setting SHALL persist across sessions.
3. Stored data from before Calm mode existed SHALL load with Calm mode off.
4. WHILE Daylight mode is on, THE app SHALL use a softer light palette and keep working.
5. ALL text and focus colours SHALL keep a contrast of at least 4.5:1 (focus ring 3:1).

### M9. Mobile
1. AT a 360 px viewport width, THE app SHALL have no horizontal page scroll, with tombstones in a swipeable row or a stacked hill, and the HUD as a bottom sheet.

### M10. Performance
1. THE app SHALL use Framer Motion for animation, SHALL keep initial JavaScript reasonable and SHALL load the particle system lazily.
2. THE Atmosphere SHALL hold about 60 fps on a mid-range laptop.
3. ALL demo data and copy SHALL use fictional brands.

## Correctness properties
- P-M1 the animation state for any view state has `intensity` in [0, 1].
- P-M2 kept graves map to ghost, cancelled graves to calm.
- P-M3 for active graves the level never becomes calmer as remaining time shrinks (monotonic).
- P-M4 hand and dirt imply glow, cracks and tremble.
- P-M5 level agrees with remaining time thresholds (72 h restless, 24 h rising, overdue rising).
- P-M6 stages churning, zombie and overdue are never calm; sealed and cracked always are.
- P-M7 motion allowed equals not OS reduced and not Calm.
