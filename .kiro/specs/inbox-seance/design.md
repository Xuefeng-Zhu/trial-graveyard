# Design: Inbox Séance

Follows `.kiro/steering/tech.md` and `structure.md`. Requirement IDs (I1..I8) refer to `requirements.md`. Builds on `src/lib/parse`, `src/domain/trial.ts` and the store in `src/state/store.ts`.

## 1. Where things go

```
src/
  lib/
    email/
      types.ts            EmailProvider, EmailMessage, Candidate, ScanProgress (I1)
      scanner.ts          pure scanEmails(stream, existing, now, onProgress) (I3)
      signals.ts          subject keywords and sender-domain map (I3.2)
      index.ts            barrel and provider list [mockProvider] (I1.3)
      providers/
        mock.ts           createMockProvider({ delayMs, now, confirm }) (I2)
        fixtures.ts       relative-date fixture emails (I2.4, I2.5)
        README.md         planned Gmail and Outlook providers (I1.5)
      scanner.test.ts, scanner.property.test.ts, providers/mock.test.ts (I7)
  features/
    seance/
      SeanceButton.tsx    crystal-ball button (I4.1)
      SeancePanel.tsx     dialog: connect, scan, review (I4.2 to I4.11)
      ReviewRow.tsx       checkbox, confidence, snippet, editable fields (I4.5 to I4.7)
      useSeance.ts        state machine hook (idle, consent, scanning, review, error)
      seance.module.css
      index.ts
      seance.test.tsx     review flow and vitest-axe (I7.4)
  app/App.tsx             renders SeanceButton next to "Paste a receipt"
```

The scanner is pure and takes `now`. Only `providers/mock.ts` touches timers, and the delay is injectable.

## 2. Provider interface (I1)
```ts
export interface EmailMessage { id: string; from: string; subject: string; date: string; text: string }

export interface EmailProvider {
  readonly id: string;
  readonly label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  searchReceipts(opts: { since: Date }): AsyncIterable<EmailMessage>;
}
```
`searchReceipts` is an async generator so the scanner can show live progress. Gmail (Google Identity Services token client, `gmail.readonly`, `users.messages.list` then `get`) and Outlook (MSAL.js popup login, `Mail.Read`, Graph `/me/messages`) both fit this shape and run in the browser with no backend. Details live in `providers/README.md`.

## 3. Mock provider (I2)
- `connect()` calls an injected `confirm()` that the UI implements as a fake consent dialog ("Haunted Demo Inbox wants to read receipts. Allow / Decline"). Decline rejects with `ConsentDeniedError`.
- Fixtures are built by `buildFixtures(now)`: 8 trial confirmations (Phantomflix, Wraithwave Premium, Cryptic Cloud, Hexlingo Max, Grimoire+, Spectral Fitness, Ghoul GPT Pro, Necro Audiobooks), 2 renewal notices, and 3 distractors (shipping, newsletter, password reset), 13 in total. Email dates are 1 to 20 days before `now`, and trial end or charge dates are written as absolute dates 3 to 25 days after `now`.
- The generator awaits `delay(delayMs)` before each yield (default 250 ms). Tests pass `delayMs: 0`.
- `searchReceipts` throws if not connected, and filters out emails older than `since`.

## 4. Scanner (I3)
```ts
export interface Candidate {
  key: string;                 // normalised service + charge date
  messageId: string;
  fields: { name; priceCents; currency; cadence; chargeDate; cancelUrl? };
  confidence: number;          // 0..1
  snippet: string;             // up to 160 chars around the charge sentence
  signals: string[];           // e.g. 'subject:trial', 'sender:phantomflix.example'
}
export async function scanEmails(
  messages: AsyncIterable<EmailMessage>,
  existing: Grave[],
  now: Date,
  onProgress?: (p: { read: number; found: number }) => void,
): Promise<Candidate[]>;
```
Per email:
1. `parseReceipt(text, emailDate)`. If no charge date, skip (I3.5). This also drops distractors, which carry no charge date.
2. Name: parsed name if confident, else the sender-domain map (`phantomflix.example` to "Phantomflix"), else the capitalised domain label.
3. Confidence = `0.6 * mean(field confidence of name, price, date) + 0.25 * subjectSignal + 0.15 * senderKnown`, clamped to 0..1. `subjectSignal` is 1 if the subject matches `trial`, `free for`, `will be charged` or `renews on`, else 0. `senderKnown` is 1 if the domain is in the map.
4. A distractor-only subject (shipped, newsletter, password reset) with no subject signal is dropped even if the body parses a date.

Dedupe (I3.6, I3.7):
- `key = lower(name) + '|' + chargeDate (YYYY-MM-DD)`.
- Drop a candidate whose key matches an existing grave's name and charge date.
- Among candidates with the same key keep the highest confidence; ties keep the earlier email.
- Output is sorted by charge date, then name.

## 5. UI flow (I4, I5)
States: `idle` to `consent` to `scanning` to `review` (or `error`).
- `idle`: provider list. Mock has a "Connect" button. Gmail and Outlook render as disabled buttons with `aria-disabled` and the text "Gmail, coming soon" and "Outlook, coming soon", styled greyed with text contrast at least 4.5:1 on their background.
- `consent`: fake consent dialog rendered inside the panel.
- `scanning`: a crystal ball with swirling mist (CSS animation) and `role="status"` text "The spirits have read 5 letters and found 3 restless trials." With reduced motion the ball is static and only the text changes.
- `review`: a list of `ReviewRow`. Each has a checkbox, confidence badge with a text label ("strong spirit", "faint spirit"), the snippet, and name, price, cadence and date inputs. Row edits use `formValues` helpers and `validateTrial`. "Bury selected" calls `addGrave(validTrial, now)` per selected row.
- The panel uses the same dialog pattern as the editor (focus trap, Escape, restore focus). Closing calls `provider.disconnect()` and resets hook state.
- Copy example: empty result "The inbox is quiet. No restless trials found."

## 6. Privacy (I6)
- No `fetch` or network calls. Scanner and mock run in memory.
- Only `addGrave` writes to the store, and it receives only validated trial fields. Snippets and bodies live in hook state and are dropped on disconnect or close.
- The "What the spirits can see" note sits in the panel footer in plain text.
- A test spies on the persisted store and asserts that no email text appears in the saved state.

## 7. Testing plan (I7)
- `mock.test.ts`: connect accepted and declined, not-connected rejection, 12 to 13 messages, `since` filter, dates relative to injected `now`, disconnect.
- `scanner.test.ts`: each trial fixture yields the expected service and date, renewals, distractors ignored, subject and sender signals raise confidence, duplicate emails collapse, existing graves skipped.
- `scanner.property.test.ts` (fast-check, random message arrays): every candidate has a valid charge date; keys are unique; running the scan twice on the same input gives the same output.
- `seance.test.tsx`: connect, scan, review rows, uncheck one, edit a price, "Bury selected", assert graves in store, run `axe` on the review state, reduced motion with mocked `matchMedia`.

## 8. Requirement coverage
| Area | Requirements |
|---|---|
| Provider abstraction | I1 |
| Mock provider | I2 |
| Scanner | I3 |
| UI | I4, I5 |
| Privacy | I6 |
| Tests | I7 |
| README | I8 |
