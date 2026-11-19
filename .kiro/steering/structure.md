---
inclusion: always
---
# Structure
- `src/domain/`: pure logic (trial model, grave stage calculation, savings). No React here; 100% unit tested.
- `src/lib/parse/`: receipt and email parsers.
- `src/lib/email/`: email provider interface, the mock provider and the receipt scanner. No network calls.
- `src/features/graveyard/`: the haunted scene (graves, zombies, ghosts, fog).
- `src/features/daylight/`: the accessible list view.
- `src/features/editor/`: the add/edit trial form and the paste-to-parse box.
- `src/features/seance/`: the Inbox Séance panel (connect, scan, review, bury).
- `src/design/`: tokens, typography (a gothic display font plus a readable body font), and sounds (muted by default).
- Keep components small. Domain functions are pure and deterministic, and they take `now` as a parameter.
