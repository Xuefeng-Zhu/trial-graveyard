# Design: Before the Bite

Follows `.kiro/steering/tech.md` and `structure.md`. Requirement IDs (B1..B5) refer to `requirements.md`.

## 1. Where things go

```
src/
  domain/
    haunting.ts        reminderTimes, buildHauntingIcs (B2)
    hero.ts            pickHero, heroCountdown, urgency (B1)
    cancelGuides.ts    cancelGuides map, normalizeService, getCancelGuide (B3)
    stats.ts           deriveStats (B4)
  features/
    hero/              Countdown hero card (B1)
    exorcism/          Exorcism panel (B3) and the stats panel (B4)
    daylight/          downloadIcs reused for haunting downloads (B2)
```

Domain functions are pure and take `now`. Date math uses date-fns.

## 2. Reminder times (B2)
- `early = chargeAt - 48h` as an absolute instant (`subHours`).
- `morning` is 09:00 in the local timezone on the charge date, found with `setHours(startOfHour(chargeAt), 9)`. Local `setHours` keeps 09:00 across DST changes.
- If the charge is earlier than 09:00 on that date, `morning = chargeAt`, so a reminder is never after the charge.
- Events start at the reminder instant (UTC form), last 30 minutes and have a `TRIGGER:PT0S` alarm.
- UIDs are `<id>-48h@trial-graveyard` and `<id>-morning@trial-graveyard`. Text goes through `escapeText` and lines through `foldLine` from `ics.ts`. The existing `buildIcs` is unchanged.

## 3. Hero (B1)
- `pickHero` returns the active grave with the smallest positive remaining time.
- `heroCountdown` clamps at zero and returns whole days and hours, with text "turns in Xd Yh".
- `urgency`: `calm` above 7 days, `uneasy` above 3 and up to 7 days (not in the spec, kept subtle), `restless` at 3 days or less, `rising` at 24 hours or less.

## 4. Cancel guides (B3)
- `normalizeService` lowercases and strips everything except letters, digits and `+`, so "Grimoire+" differs from "Grimoire".
- `getCancelGuide(name, savedCancelUrl)` prefers the grave's own saved link, because the user set it. Otherwise it uses the guide's link. Unknown services get generic steps. A Google search link is always returned.

## 5. Stats (B4)
- `survived`: cancelled with `cancelledAt` before `chargeAt`.
- `dodged`: price of survived trials whose `cancelledAt` falls in the current calendar year, per currency.
- `avgDaysUsed`: mean of `cancelledAt - createdAt` in days over cancelled trials, or `null`.
- `escaped`: active or kept trials whose `chargeAt` is not after `now`.

## 6. Testing
Property tests (fast-check) cover the date math. Unit tests cover `.ics` output, stats, guides and hero helpers. Domain coverage stays at 100%.
