# Requirements: Retro Pixel Graveyard

Phase 14 redesign (issue #34) of Trial Graveyard as a retro pixel-art cemetery, matching `docs/design/concept-retro-pixel.png`. Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`. This spec replaces the visual layer of `.kiro/specs/moonlit-cemetery/` and does not change the stage, motion or savings rules in `src/domain/stage.ts`, `motion.ts` and `savings.ts`.

## Glossary
- **Palette**: Midnight `#120F23`, Deep Purple `#2C2142`, Violet `#8B5CF6`, Moon Lavender `#B8A9D9`, Toxic Green `#A8FF60`, Warning Orange `#FFB14A`, Critical Red `#FF586E`, Moonlight `#F2ECFF`.
- **Gravestone**: the pixel-art tile that represents one trial.
- **Visual state**: one of normal, warning, critical, cancelled, kept, plus a separate selected highlight.
- **XP**: cosmetic experience points. **Level**: derived from XP. **Quest**: the daily cosmetic goal.
- **Motion allowed**: true when the OS does not request reduced motion AND Calm mode is off.

## Requirements

### R1. Design system
1. THE app SHALL use the Palette as CSS tokens in `src/design/tokens.css`.
2. THE app SHALL use Press Start 2P for headings and numerals and Inter for body text, both self-hosted through `@fontsource`, with no third-party font requests.
3. THE app SHALL render pixel art with `image-rendering: pixelated` and integer scaling.
4. THE Palette text and background pairs SHALL meet WCAG AA contrast, checked in `src/design/design.test.ts`.

### R2. Cemetery scene
1. THE landing and graveyard views SHALL show the pixel backdrop `public/pixel/graveyard-bg.png` with the reaper sprite `public/pixel/reaper.png`.
2. THE moonlit scene in `src/features/moonlit` and the assets in `public/scene` SHALL be retired, and the PWA config SHALL stop listing them.
3. WHILE motion is not allowed, THE scene SHALL be static.

### R3. Gravestone states
1. THE app SHALL derive a visual state for each trial with a pure function in `src/domain/pixelState.ts`, using only `getViewState`, `getStage` and `motionFor`. It SHALL NOT repeat stage thresholds.
2. WHEN an active trial has 72 hours or less remaining and more than 48, THE gravestone SHALL be in the warning state with orange cracks, sparks and a badge such as "72h left".
3. WHEN an active trial has 48 hours or less remaining, or is overdue, THE gravestone SHALL be in the critical state with red cracks, a zombie hand and an urgent countdown.
4. WHEN a trial is cancelled, THE gravestone SHALL show the restored look with grass and flowers, the badge "Cancelled" and the confirmed savings.
5. WHEN a trial is kept, THE gravestone SHALL show the badge "Kept".
6. THE mapping SHALL be monotonic: less remaining time is never a lower urgency.
7. THE state SHALL always be shown in text as well as colour or animation.
8. EACH gravestone SHALL be keyboard focusable, with a visible selected state, and expose every action of the old grave.

### R4. Mobile
1. THE layout SHALL work from 360 px wide with no horizontal scroll and touch targets of at least 44 px.
2. THE accessible Daylight list view SHALL remain and mirror every trial.

### R5. Feature integration
1. THE Inbox Seance, Image Receipt OCR, cancellation guides, reminders (ICS), savings, share card and settings SHALL keep working and be restyled to the Palette.
2. WHEN the user presses Exorcise, THE app SHALL run the real `store.exorcise` flow, show the provider cancel link and steps, and SHALL NOT claim a provider cancellation until the user confirms with "It's exorcised".
3. THE undo window SHALL keep working for confirmed cancellations.

### R6. Gamification (cosmetic only)
1. THE app SHALL award XP for adding a trial (10), reviewing a trial (5) and confirming a cancellation (25), once per trial and kind.
2. THE app SHALL derive a graveyard level from total XP. THE level SHALL never decrease when XP increases and THE level progress SHALL be within 0 to 1.
3. THE app SHALL unlock cosmetic decorations and collectible gravestone styles by level, and let the user select an unlocked style.
4. THE app SHALL show a daily quest "Cancel 1 trial (0/1)" that resets each day.
5. THE gamification SHALL NOT use streaks, expiring rewards, penalties or notifications that pressure the user.
6. XP, level, quest and cosmetics SHALL NOT be read by, passed to or change any financial figure. `src/domain/xp.ts` SHALL NOT import `savings` or `stats`.
7. WHEN a confirmed cancellation is undone, THE app SHALL remove its XP.
8. THE XP ledger and selected style SHALL be persisted. Records saved before this feature SHALL load with defaults.

### R7. Polish
1. WHILE motion is allowed, THE app SHALL animate sparks, the zombie hand, the reaper and celebrations. WHILE not allowed, none of these SHALL move.
2. WHERE sound is used, IT SHALL be off by default and muted until the user turns it on.
3. WHEN a cancellation is confirmed, THE app SHALL show a short celebration (static under reduced motion).

### R8. Content and legal
1. THE app SHALL NOT use third-party trademarks or logos. Sample services SHALL be Phantomflix, Wraithwave, Cryptic Cloud, Hexlingo, Banshee Box and Grimoire+, or original pixel or monogram icons.
2. WRITTEN content SHALL NOT use em dashes.

### R9. Validation
1. `npm run typecheck`, `npm test` (100% coverage of `src/domain`), `npm run build` and the accessibility tests SHALL pass.
2. Screenshots at 360 px and 1440 px SHALL be captured in `docs/screenshots`.
