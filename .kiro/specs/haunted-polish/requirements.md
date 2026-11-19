# Requirements: Haunted Polish

A polish pass on Trial Graveyard for the Kiroween 2026 submission: a cinematic first screen, personalised epitaphs, optional sound, a shareable card and a mobile layout. Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`. This spec extends `.kiro/specs/trial-graveyard-mvp/` and does not change its stage or savings rules.

## Glossary
- **Landing screen**: the first screen shown when the graveyard has no graves.
- **Epitaph**: the text on a tombstone for a cancelled grave.
- **Souls saved**: the running total of money saved by cancelled graves, shown in the Mausoleum.
- **Share card**: the "My Graveyard" PNG image drawn on a canvas.

## Requirements

### H1. Cinematic first screen
User story: As a first-time visitor, I want an atmospheric first screen so that I understand the app and can try it at once.
1. WHEN the graveyard has no graves, THE app SHALL show the landing screen with fog, a moon, a one-line pitch and a "Summon demo graveyard" button.
2. WHEN the user activates "Summon demo graveyard", THE app SHALL load the demo graves and show the graveyard.
3. WHERE the user prefers reduced motion, THE landing screen SHALL render fog and moon as static images with no animation.
4. THE "Summon demo graveyard" button SHALL be reachable by keyboard, have a visible focus ring and have text contrast of at least 4.5:1.
5. WHILE Daylight mode is on, THE landing screen SHALL show the pitch and the button without fog or moon artwork.

### H2. Personalised epitaphs and souls saved
1. THE epitaph formatter SHALL produce text in the form "Here lies {name} · {price}/{cadence short} · slain {Mon YYYY}", for example "Here lies Phantomflix · $13.99/mo · slain Nov 2026".
2. THE formatter SHALL use `cancelledAt` for the slain month and year, and SHALL format the price with the grave's currency.
3. IF a grave has a one-time cadence, THEN THE epitaph SHALL show the price without a cadence suffix.
4. WHEN a grave is cancelled, THE tombstone SHALL show the personalised epitaph.
5. THE Mausoleum SHALL show a "souls saved" total per currency, equal to the sum of `savedCents` of all cancelled graves in that currency.
6. WHEN a cancellation is undone, THE souls saved total SHALL return to its previous value.
7. THE epitaph text SHALL be available to assistive technology as plain text, not only as an image or SVG text.

### H3. Optional sound effects
1. THE app SHALL be muted by default.
2. THE app SHALL provide a sound toggle that is keyboard accessible, has an accessible name and exposes its state with `aria-pressed`.
3. WHEN the user changes the toggle, THE app SHALL persist the choice in `settings.soundOn` and restore it on the next load.
4. WHILE sound is on, WHEN the user buries a grave, THE app SHALL play a creak.
5. WHILE sound is on, WHEN the user cancels a grave, THE app SHALL play a thunder sting.
6. THE sounds SHALL be generated with the Web Audio API and THE repository SHALL contain no audio files.
7. IF Web Audio is unavailable or throws, THEN THE app SHALL continue without sound and without an error.
8. THE app SHALL NOT use sound as the only signal for any state.

### H4. Shareable "My Graveyard" card
1. THE app SHALL offer a "Share my graveyard" action when at least one grave is cancelled.
2. WHEN the user activates it, THE app SHALL draw a PNG on a canvas showing the total saved per currency, the number of graves slain and the hashtag `#KiroweenHackathon26`.
3. WHERE the Web Share API can share files, THE app SHALL share the PNG through `navigator.share`.
4. IF the Web Share API is unavailable, or the user dismisses the share sheet, THEN THE app SHALL fall back to downloading the PNG, except when the user dismissed it on purpose (`AbortError`), where nothing is downloaded.
5. THE card SHALL contain no grave names or cancel URLs, only totals, so sharing leaks no private data.
6. IF canvas is unavailable, THEN THE app SHALL show a short message and SHALL NOT throw.

### H5. Mobile layout
1. THE app SHALL be usable at a viewport width of 360px with no horizontal scrolling.
2. THE interactive controls SHALL have a touch target of at least 44px by 44px.
3. THE graveyard scene, landing screen, editor and Mausoleum SHALL reflow to a single column at widths below 480px.
4. THE text SHALL remain readable without zoom (body text at least 16px).

### H6. README screenshots
1. THE README SHALL have a "Screenshots" section with images or a GIF of the landing screen, the graveyard with a zombie, a tombstone epitaph, the share card and the mobile layout.
2. THE images SHALL have alt text and live in `docs/screenshots/`.
3. THE README SHALL have a "Kiro features used" table listing steering, specs, hooks, MCP, property-based tests and agent PRs from issues.

### H7. Property-based tests
1. THE epitaph formatter SHALL have fast-check properties for: contains the grave name, contains the formatted price, contains the slain month and year, never contains "undefined" or "NaN", and is deterministic.
2. THE savings totals SHALL have fast-check properties for: total equals the sum of cancelled graves per currency, non-negative, independent of order, unchanged by active and kept graves, and cancel then undo restores the total.
3. `src/domain/` SHALL keep its 100% coverage gate.

### H8. Accessibility and safety (cross-cutting)
1. THE app SHALL pass the vitest-axe tests for the landing screen, the sound toggle and the share action.
2. THE new text and controls SHALL meet AA contrast using the tokens in `src/design/tokens.css`.
3. THE new copy SHALL follow the tone in `.kiro/steering/product.md`.
