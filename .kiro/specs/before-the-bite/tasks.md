# Tasks: Before the Bite

Ordered and incremental. Requirement references are in brackets.

- [ ] 1. Spec
  - [ ] 1.1 Write `requirements.md`, `design.md` and this file.

- [ ] 2. Domain layer
  - [ ] 2.1 `src/domain/haunting.ts`: `reminderTimes` and `buildHauntingIcs`. [B2]
  - [ ] 2.2 `src/domain/hero.ts`: `pickHero`, `heroCountdown`, `urgency`. [B1]
  - [ ] 2.3 `src/domain/cancelGuides.ts`: guides map and `getCancelGuide`. [B3]
  - [ ] 2.4 `src/domain/stats.ts`: `deriveStats`. [B4]

- [ ] 3. Domain tests
  - [ ] 3.1 Property tests for month end, Feb 29, DST in America/Los_Angeles, 7/14/30 day trials, reminder never after charge, countdown never negative. [B5.3]
  - [ ] 3.2 Unit tests for `.ics` folding, CRLF and escaping, stats, guides and hero. [B5.4]

- [ ] 4. Countdown hero
  - [ ] 4.1 Hero card with live countdown, amount and urgency styling, in the Scene and Daylight views. [B1]
  - [ ] 4.2 Reduced-motion handling. [B1.3]

- [ ] 5. Hauntings and exorcism
  - [ ] 5.1 "Add haunting to calendar" per trial and "Export all hauntings". [B2]
  - [ ] 5.2 Exorcism panel with guide, steps and "It's exorcised". [B3]
  - [ ] 5.3 Souls saved updates on exorcism, with undo. [B3.4]

- [ ] 6. Stats and docs
  - [ ] 6.1 Trial-hacker stats panel. [B4]
  - [ ] 6.2 Demo data uses the fictional brands. [B3.2]
  - [ ] 6.3 README "Before the bite" section and Kiro features table. [B5]
