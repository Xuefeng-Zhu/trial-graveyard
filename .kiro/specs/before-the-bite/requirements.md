# Requirements: Before the Bite

Phase 11 for Trial Graveyard (issue #26, "Kill it before it bites"). The app catches free trials before the first charge, so this phase makes that the hero. Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`.

## Glossary
- **Hero**: the active trial with the nearest future charge time, featured on the graveyard view.
- **Haunting**: a calendar reminder for a trial. Two per trial: 48 hours before the charge and 09:00 local on the charge date.
- **Exorcism**: the guided flow that shows how to cancel a service and buries the trial.
- **Souls saved**: the running total of money saved by buried trials.

## Requirements

### B1. Countdown hero
1. THE graveyard view SHALL feature the hero with a live "turns in Xd Yh" countdown and its charge amount.
2. WHEN more than 7 days remain, THE hero SHALL look calm. WHEN 3 days or less remain, THE hero SHALL look restless. WHEN 24 hours or less remain, THE hero SHALL look rising, with a spooky animation.
3. WHERE the user prefers reduced motion, THE hero SHALL not animate.
4. THE countdown SHALL never be negative.
5. THE countdown SHALL be readable as text, so colour or animation is never the only signal.

### B2. Haunting reminders
1. EACH trial SHALL have an "Add haunting to calendar" action that downloads an RFC 5545 `.ics` file.
2. THE file SHALL hold two VEVENTs, each with a VALARM: 48 hours before the charge and 09:00 local on the charge date.
3. THE reminder SHALL never be later than the charge time.
4. THE app SHALL offer "Export all hauntings" for every active trial in one file.
5. THE files SHALL be built on the device. No network request SHALL be made.
6. EACH event SHALL have a UID that is stable for the trial. Text values SHALL be escaped per RFC 5545, and lines folded at 75 octets with CRLF endings.

### B3. Exorcism flow
1. EACH trial SHALL have an "Exorcise" action that opens a panel with the service's cancel link and 2 to 4 steps.
2. THE steps SHALL come from a local `cancelGuides` map keyed by the normalized service name. Fictional demo brands SHALL use `*.example` URLs.
3. IF the service is unknown, THEN THE panel SHALL show a generic guide and a web search link.
4. WHEN the user confirms "It's exorcised", THE app SHALL bury the trial and add its amount to souls saved.

### B4. Trial-hacker stats
1. THE app SHALL show trials survived (buried before the charge), dollars dodged this calendar year, average days used before cancelling and trials that escaped (charged).
2. THE stats SHALL be derived only from the stored graves.

### B5. Quality
1. THE new controls SHALL be keyboard accessible and labelled, and SHALL work at 360px wide.
2. THE copy SHALL be spooky but clear.
3. THE date math SHALL have property tests: month end, Feb 29, DST in America/Los_Angeles, 7, 14 and 30 day trials, reminder never after the charge, countdown never negative.
4. THE `.ics` builder SHALL have unit tests for folding, CRLF and escaping.
5. THE landing entry points (Summon demo graveyard, Paste a receipt, Inbox Seance, Try a sample screenshot) SHALL stay reachable.
