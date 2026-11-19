# Tasks: Inbox Séance

Ordered and incremental. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [ ] 1. Spec
  - Write `requirements.md`, `design.md` and `tasks.md` for this feature. [I8.3]

- [ ] 2. Provider abstraction and mock provider
  - [ ] 2.1 `src/lib/email/types.ts` with `EmailProvider` and `EmailMessage`, plus `index.ts` barrel. [I1.1 to I1.3, I1.6]
  - [ ] 2.2 `src/lib/email/providers/README.md` describing the planned Gmail (Google Identity Services, `gmail.readonly`) and Outlook (MSAL.js, `Mail.Read`) providers, browser-only. [I1.4, I1.5]
  - [ ] 2.3 `providers/fixtures.ts` with relative-date fixtures: 8 trials, 2 renewals, 3 distractors. [I2.4, I2.5]
  - [ ] 2.4 `providers/mock.ts` "Haunted Demo Inbox" with fake consent, streaming with injectable delay, `since` filter and disconnect. [I2.1 to I2.3, I2.6 to I2.8]
  - [ ] 2.5 `providers/mock.test.ts`. [I7.1]

- [ ] 3. Scanner
  - [ ] 3.1 `signals.ts` and `scanner.ts`: `parseReceipt` per email, subject and sender signals, confidence score, progress callback. [I3.1 to I3.4, I3.8, I3.9]
  - [ ] 3.2 Dedupe against existing graves and among emails, no candidate without a charge date. [I3.5 to I3.7]
  - [ ] 3.3 `scanner.test.ts` examples. [I7.2]
  - [ ] 3.4 `scanner.property.test.ts` with fast-check properties. [I7.3]

- [ ] 4. Séance UI
  - [ ] 4.1 `useSeance.ts` state machine and `SeanceButton` placed near "Paste a receipt" in `App.tsx`. [I4.1, I4.2]
  - [ ] 4.2 `SeancePanel` connect step with greyed "Gmail, coming soon" and "Outlook, coming soon", fake consent dialog. [I4.3, I2.2]
  - [ ] 4.3 Scanning view with live count and reduced-motion variant. [I4.4, I5.1]
  - [ ] 4.4 `ReviewRow` and review list with confidence labels, snippet, editable fields, validation, "Bury selected", empty and error states. [I4.5 to I4.10, I5.2, I5.3]
  - [ ] 4.5 Privacy note "What the spirits can see", disconnect and clear state on close. [I6.1 to I6.4]

- [ ] 5. Component tests
  - `seance.test.tsx` for the review flow, store contents without email text, reduced motion and a vitest-axe check. [I4.11, I6.2, I7.4, I7.5]

- [ ] 6. Documentation
  - README "Inbox Séance" section and a row for this spec in the "Kiro features used" table. [I8.1, I8.2]
