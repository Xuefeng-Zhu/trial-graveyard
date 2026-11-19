# Requirements: Inbox Séance

Phase 7 of Trial Graveyard (GitHub issue #16). The user can "summon" trials from an email inbox instead of pasting receipts one by one. A provider abstraction lets real mail services plug in later. This phase ships only a mock provider, "Haunted Demo Inbox". Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`. This spec extends `.kiro/specs/trial-graveyard-mvp/` and reuses `parseReceipt` from `src/lib/parse`.

## Glossary
- **Provider**: an object implementing `EmailProvider` that can connect to a mailbox and stream messages.
- **Mock provider**: the in-memory "Haunted Demo Inbox" provider with fixture emails.
- **EmailMessage**: `{ id, from, subject, date, text }`, a single email as the scanner sees it.
- **Scanner**: the pure module that turns `EmailMessage` values into trial candidates.
- **Candidate**: a possible trial found by the scanner, with fields, a confidence score and a source snippet.
- **Distractor**: an email that is not a trial or renewal, such as shipping, a newsletter or a password reset.
- **Séance panel**: the dialog where the user connects a provider, watches the scan and reviews candidates.
- **Confirmed trial**: a candidate the user selected and buried. It is the only data stored.

## Requirements

### I1. Provider abstraction
User story: As a developer, I want a small provider interface so that Gmail or Outlook can be added without changing the scanner or the UI.
1. THE app SHALL define `EmailProvider` in `src/lib/email/types.ts` with `id`, `label`, `connect()`, `disconnect()`, `isConnected()` and `searchReceipts({ since }): AsyncIterable<EmailMessage>`.
2. THE app SHALL define `EmailMessage` as `{ id, from, subject, date, text }`, where `date` is an ISO 8601 string.
3. THE scanner and the UI SHALL depend only on `EmailProvider` and SHALL NOT import a concrete provider except to register it in a provider list.
4. THE Gmail and Outlook providers SHALL be out of scope for this phase.
5. THE repository SHALL contain `src/lib/email/providers/README.md` describing the planned Gmail provider (Google Identity Services, `gmail.readonly` scope) and the planned Outlook provider (MSAL.js, `Mail.Read` scope), both browser-only with no backend.
6. IF `searchReceipts` is called while the provider is not connected, THEN THE provider SHALL reject with a clear error.

### I2. Mock provider
1. THE mock provider SHALL have `id` "mock" and `label` "Haunted Demo Inbox".
2. WHEN `connect()` is called, THE mock provider SHALL resolve only after the user accepts a fake OAuth-style consent dialog, and SHALL reject if the user declines.
3. WHEN `searchReceipts` is called, THE mock provider SHALL stream about 12 fixture emails, each after a small delay.
4. THE fixtures SHALL include trial confirmations for Phantomflix, Wraithwave Premium, Cryptic Cloud, Hexlingo Max, Grimoire+, Spectral Fitness, Ghoul GPT Pro and Necro Audiobooks, at least two renewal notices, and three or four distractors (shipping, newsletter, password reset).
5. THE fixture dates SHALL be computed relative to the current time, so trial and charge dates stay in the future and the demo does not go stale.
6. WHEN `since` is given, THE mock provider SHALL omit emails dated before `since`.
7. WHEN `disconnect()` is called, THE mock provider SHALL report `isConnected()` as false.
8. THE delay SHALL be injectable so tests run without real waiting.

### I3. Scanner
1. THE scanner SHALL run each email body through `parseReceipt` with the email date as the reference date.
2. THE scanner SHALL add email-specific signals: subject keywords ("trial", "free for", "will be charged", "renews on") and a mapping from sender domain to service name.
3. THE scanner SHALL compute a confidence score from 0 to 1 for each candidate from the parsed field confidences and the email signals.
4. THE scanner SHALL ignore distractors and SHALL NOT emit a candidate for them.
5. THE scanner SHALL NOT emit a candidate that has no charge date.
6. THE scanner SHALL skip a candidate whose service and charge date match an existing grave.
7. WHEN several emails describe the same trial (same service and charge date), THE scanner SHALL emit one candidate, keeping the one with the higher confidence.
8. THE scanner SHALL be a pure function of its inputs, taking `now` as a parameter, with no network access.
9. THE scanner SHALL consume the provider stream incrementally and report progress after each email.

### I4. Inbox Séance UI
User story: As a user, I want to connect an inbox, watch the scan and choose which trials to bury.
1. THE app SHALL show an "Inbox Séance" button with a crystal-ball icon near "Paste a receipt".
2. WHEN the user activates the button, THE app SHALL open the Séance panel as a dialog with a focus trap, Escape to close and focus restored to the button.
3. THE panel SHALL offer "Connect" for "Haunted Demo Inbox" and SHALL show "Gmail, coming soon" and "Outlook, coming soon" as greyed, disabled options.
4. WHILE scanning, THE panel SHALL show a scanning animation and a live count of emails read and trials found, announced through a polite live region.
5. WHEN the scan ends, THE panel SHALL show a review list with one row per candidate, containing a checkbox, a confidence indicator, a snippet of the source email and editable name, price, cadence and charge date fields.
6. IF a candidate has confidence below 0.5, THEN THE row SHALL be unchecked by default and marked "faint spirit".
7. IF an edited row fails `validateTrial`, THEN THE row SHALL show an inline error and SHALL NOT be buried.
8. WHEN the user activates "Bury selected", THE app SHALL add each selected, valid candidate to the graveyard through `addGrave` and close the panel.
9. IF the scan finds no trials, THEN THE panel SHALL show a graveyard-voice empty message.
10. IF the provider throws during the scan, THEN THE panel SHALL show a short error message and keep any candidates already found.
11. THE panel SHALL be fully usable by keyboard and SHALL pass a vitest-axe check.

### I5. Motion and voice
1. WHERE the user prefers reduced motion, THE scanning animation SHALL be static and the live count SHALL still update.
2. THE panel copy SHALL follow the graveyard voice from `product.md` and SHALL stay clear enough that no state depends on the theme to be understood.
3. THE panel SHALL NOT rely on color alone to show confidence; THE row SHALL show a text label as well.

### I6. Privacy
1. THE app SHALL process emails only on the device, with no request to any server in this phase.
2. THE app SHALL store only confirmed trials as normal graves, and SHALL NOT store email bodies, subjects or sender addresses in the store, IndexedDB or localStorage.
3. WHEN the user activates "Disconnect" or closes the panel, THE app SHALL disconnect the provider and clear candidates, snippets and scan state from memory.
4. THE panel SHALL show a short "What the spirits can see" note stating that mail is read only on this device, only confirmed trials are kept, and bodies are never saved.

### I7. Tests
1. THE mock provider SHALL have unit tests for connect, decline, streaming, `since` filtering, relative dates and disconnect.
2. THE scanner SHALL have unit tests for trials, renewals, distractors, subject signals, sender mapping and both kinds of dedupe.
3. THE scanner SHALL have fast-check properties: it never emits a candidate without a charge date, and it never emits duplicates.
4. THE review flow SHALL have a component test with a vitest-axe check, covering connect, scan, select, edit and "Bury selected".
5. THE existing tests and the 100% coverage gate on `src/domain/**` SHALL keep passing.

### I8. Documentation
1. THE README SHALL have an "Inbox Séance" section describing the feature, the mock provider and the privacy model.
2. THE README "Kiro features used" table SHALL list this spec.
3. THE `.kiro/` directory SHALL stay committed.
