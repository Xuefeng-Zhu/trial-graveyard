# Requirements: Trial Graveyard MVP

Trial Graveyard is a local-first tracker for free trials and subscriptions. A haunted graveyard communicates urgency, status and savings. Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`.

## Glossary
- **Grave**: one trial or subscription.
- **Remaining time** `R`: `chargeAt - now` in milliseconds, where `chargeAt` is the next charge instant and `now` is a parameter.
- **Stage**: the visual urgency state of an active grave.
- **Mausoleum**: the view that shows the total money saved.
- **Daylight mode**: the accessible list view.

## Stage boundary definition
The steering text gives overlapping boundaries (7-3, 3-2 days, 48 hours). This spec fixes them. Boundaries use elapsed time, not calendar days, and the closer-to-charge stage owns each boundary instant.

| Stage | Condition on `R` |
|---|---|
| `sealed` | `R > 7d` (604,800,000 ms) |
| `cracked` | `3d < R <= 7d` |
| `churning` | `48h < R <= 3d` (green glow) |
| `zombie` | `0 < R <= 48h` |
| `overdue` | `R <= 0` (charge date passed, still active) |

Stage is only computed for graves whose status is `active`. Graves with status `cancelled` render as tombstones and `kept` graves render as ghosts.

## Requirements

### R1. Add a trial quickly
User story: As a user, I want to add a trial in under 10 seconds so that I actually record it.
1. THE editor SHALL accept name, charge date, price, cadence (`one-time`, `weekly`, `monthly`, `yearly`) and cancel URL.
2. WHEN the user submits a form with a non-empty name, a valid charge date and a price >= 0, THE system SHALL create an active grave and show it in the graveyard.
3. IF name is empty, the date is invalid, or the price is negative or not a number, THEN THE editor SHALL show an inline error and SHALL NOT save.
4. WHEN the editor opens, THE name field SHALL have focus, and the form SHALL be completable with keyboard only (Tab and Enter).
5. WHERE a cancel URL is entered, THE system SHALL accept only `http:` and `https:` URLs.
6. THE user SHALL be able to edit and delete any grave.

### R2. Grave stages
1. THE domain function `getStage(grave, now)` SHALL return the stage from the table above for active graves.
2. WHILE a grave is `sealed`, THE graveyard SHALL render an intact tombstone.
3. WHILE a grave is `cracked`, THE graveyard SHALL render visible cracks.
4. WHILE a grave is `churning`, THE graveyard SHALL render churning earth with a faint green glow.
5. WHILE a grave is `zombie`, THE graveyard SHALL render a zombie that moves toward the front of the screen and a "Cancel now" call to action.
6. WHILE a grave is `overdue`, THE graveyard SHALL render it as a zombie with an "Overdue" label and offer "I cancelled" and "Keep it".
7. WHEN `now` advances across a boundary, THE graveyard SHALL update the stage without a page reload (re-evaluated at least once per minute and on tab focus).
8. THE system SHALL also expose the stage as text (for example "Zombie, charges in 5 hours") so color or animation is never the only signal.

### R3. Grave actions
1. EVERY active grave SHALL show a "Cancel now" link that opens the cancel URL in a new tab with `rel="noopener noreferrer"`.
2. IF a grave has no cancel URL, THEN THE "Cancel now" control SHALL be disabled and explain why in text.
3. WHEN the user chooses "I cancelled", THE system SHALL set status to `cancelled`, record `cancelledAt`, and show a tombstone with the epitaph "Here lies {name}. Saved you {price}/{cadence}."
4. WHEN the user chooses "Keep it", THE system SHALL set status to `kept` and show a ghost with its monthly cost.
5. THE user SHALL be able to undo the last status change for at least 10 seconds.

### R4. Savings math
1. THE monthly-equivalent of a price SHALL be: weekly `price * 52 / 12`, monthly `price`, yearly `price / 12`, one-time `0`.
2. THE saved amount of a cancelled grave SHALL be the one charge avoided, equal to its price in cents, regardless of cadence. (Future recurring charges are not projected, to avoid overstating savings.)
3. THE Mausoleum total SHALL be the sum of saved amounts of all cancelled graves, computed in integer cents and formatted only at display time.
4. THE kept ghost SHALL show its monthly-equivalent cost.
5. IF there are no cancelled graves, THEN THE Mausoleum SHALL show 0.00 and a friendly empty-state message.
6. Money SHALL be stored as integer minor units (cents) with a currency code (default `USD`).

### R5. Receipt parsing
1. WHEN the user pastes text into the paste box, THE parser SHALL return suggested values for name, price, currency, cadence, charge date and cancel URL, each with a confidence, and leave unknown fields undefined.
2. THE parser SHALL run offline using deterministic regex and heuristics in `src/lib/parse/`.
3. THE parser SHALL support `$`, `€`, `£` and ISO currency codes, and date formats like `2026-10-31`, `Oct 31, 2026`, `31 October 2026` and `10/31/2026` (US order, documented).
4. THE parser SHALL support phrases such as "trial ends", "first charge on", "will be charged", "renews on", "per month", "/mo", "annually".
5. WHEN fields are parsed, THE editor SHALL prefill them and the user SHALL be able to edit them before saving. THE parser SHALL NOT save anything itself.
6. IF the text has no recognizable fields, THEN THE editor SHALL show "Nothing haunting here. Try the form instead." and keep the form usable.
7. WHERE the LLM fallback feature flag is enabled and the browser is online, THE system MAY call the LLM only when deterministic parsing finds fewer than 3 fields. THE app SHALL work fully with the flag off (default).
8. THE parser SHALL NOT send pasted text over the network unless the flag is on.

### R6. Calendar reminder
1. THE user SHALL be able to export a `.ics` file for one grave or for all active graves.
2. EACH event SHALL be set on the charge date, with a title "Cancel {name} before {price} charge", a `VALARM` 24 hours before, and the cancel URL in the description.
3. THE file SHALL be valid iCalendar (CRLF line endings, escaped `,` `;` `\n`, lines folded at 75 octets, stable `UID`).

### R7. Mausoleum and ghosts
1. THE Mausoleum SHALL show the running total saved (the "souls saved" counter) and the list of tombstones.
2. THE graveyard SHALL show kept subscriptions as ghosts above the graves with their monthly cost.
3. WHEN a grave becomes cancelled, THE counter SHALL update to the new total.

### R8. Accessibility and Daylight mode
1. THE app SHALL provide a "Daylight mode" toggle reachable by keyboard from every screen.
2. WHEN Daylight mode is on, THE app SHALL show a calm list (sorted by charge date) with the same data and the same actions, and no continuous animation.
3. THE choice SHALL persist across reloads.
4. WHILE `prefers-reduced-motion: reduce` is set, THE app SHALL replace continuous and large motion (zombie shamble, fog drift, ghost drift, particles) with static poses, and SHALL limit transitions to opacity changes under 200 ms.
5. WHERE the user has set reduced motion, THE app SHALL default to Daylight mode off but SHALL still show the static scene, and the toggle SHALL remain available.
6. EVERY interactive element SHALL be reachable by keyboard with a visible focus ring, and graves SHALL be navigable with arrow keys inside the graveyard.
7. THE text contrast SHALL be at least WCAG AA (4.5:1 for body text).
8. THE scene SHALL expose an accessible name for each grave (name, stage, days remaining, price) for screen readers.
9. Sounds SHALL be muted by default and SHALL never be the only signal.

### R9. Local-first and offline
1. THE app SHALL store all data in IndexedDB via Zustand persistence and require no account.
2. WHEN the app loads offline after a first visit, THE app SHALL work fully (service worker caches the static assets).
3. IF IndexedDB is unavailable, THEN THE app SHALL fall back to in-memory state and show a notice that data will not be saved.
4. THE app SHALL provide a "Summon demo graveyard" action that loads about 8 sample graves covering all stages, a cancelled grave and a kept grave.
5. THE persisted state SHALL carry a schema version, and loading older or corrupt data SHALL not crash the app (migrate or reset with notice).

### R10. Tone
1. UI copy SHALL be darkly playful and never blame or insult the user.

### R11. Delivery
1. THE repo SHALL be MIT licensed and `.kiro/` SHALL stay committed and not gitignored.
2. THE app SHALL build to a static bundle and be deployed to a public URL listed in the README.

## Correctness properties (property-based tests with fast-check)

Domain code takes `now` as a parameter. Generators use integer millisecond offsets so tests are deterministic and avoid timezone and DST flakiness.

### Stage calculation (`src/domain/stage.ts`)
- **P-S1 Total and exhaustive**: for any `chargeAt`, `now`, `getStage` returns exactly one of the five stages, and never throws.
- **P-S2 Boundary exactness**: for `R` equal to 604,800,000 ms the stage is `cracked`; at +1 ms it is `sealed`. For 259,200,000 ms it is `churning`; +1 gives `cracked`. For 172,800,000 ms it is `zombie`; +1 gives `churning`. For 0 it is `overdue`; 1 ms gives `zombie`.
- **P-S3 Monotonic**: if `R1 <= R2` then `severity(getStage(R1)) >= severity(getStage(R2))`, where severity is sealed < cracked < churning < zombie < overdue.
- **P-S4 Time moves forward only**: for fixed `chargeAt` and `now1 <= now2`, stage severity at `now2` >= severity at `now1`.
- **P-S5 Translation invariance**: shifting both `chargeAt` and `now` by the same offset (including across DST changes) does not change the stage.
- **P-S6 Status gating**: `cancelled` and `kept` graves are never reported as an urgency stage (the view-state function returns `tombstone` or `ghost`).
- **P-S7 Agrees with oracle**: stage equals a simple reference implementation that compares `R` against a sorted threshold list.
- **P-S8 Countdown text**: for `R > 0`, the label's hours or days value is `ceil` of the remaining time in the chosen unit and never negative.

### Receipt parser (`src/lib/parse/`)
- **P-P1 Never throws**: for any string (including arbitrary unicode and very long input), `parseReceipt` returns a result object.
- **P-P2 Deterministic**: the same input and same reference date give an equal result.
- **P-P3 Round trip price**: for any generated cents amount, currency symbol and cadence phrase embedded in noise text, the parser recovers the same cents and currency.
- **P-P4 Round trip date**: for any valid date rendered in each supported format and embedded in noise text, the parser recovers the same calendar date.
- **P-P5 Noise robustness**: adding leading or trailing text that contains no digits, currency symbols or date words does not change the result.
- **P-P6 Whitespace and case insensitive**: collapsing or expanding whitespace and changing case of keywords does not change the recovered fields.
- **P-P7 No invented fields**: if a field is present in the result, its value appears (after normalization) in the input; empty or digit-free input gives an empty result.
- **P-P8 Valid outputs**: any returned price is a non-negative integer of cents, any date is a valid date, any URL uses `http` or `https`.
- **P-P9 Linear time**: parsing 100 KB of input finishes within 200 ms (guards against catastrophic regex backtracking).

### Savings math (`src/domain/savings.ts`)
- **P-M1 Integer cents**: all outputs are integers.
- **P-M2 Non-negative**: for any non-negative price, monthly-equivalent and totals are >= 0.
- **P-M3 Cadence consistency**: `abs(monthly(yearly p) * 12 - p) <= 6` cents and `abs(monthly(weekly p) * 12 - p * 52) <= 6` cents (rounding happens once, to the nearest cent; the bound allows for it times 12), and `monthly(monthly p) = p`.
- **P-M3b Saved equals price**: `saved(g) = g.priceCents` for any cancelled grave.
- **P-M4 Additive**: `total(A ++ B) = total(A) + total(B)` for any two lists of graves.
- **P-M5 Order independent**: any permutation of the list gives the same total.
- **P-M6 Only cancelled count**: adding an active or kept grave never changes the total; changing a grave to cancelled increases the total by exactly its saved amount.
- **P-M7 Empty is zero**: `total([]) = 0`.
- **P-M8 Currency safety**: totals are computed per currency and never add cents of different currencies together.

### Other
- **P-I1 ICS validity**: for any set of graves, every output line is at most 75 octets, ends in CRLF, and unescaped `,` `;` or newline never appear inside TEXT values.
- **P-X1 Persistence round trip**: serialize then deserialize any valid state returns an equal state.
