---
inclusion: always
---
# Structure
- `src/domain/`: pure logic (trial model, grave stage calculation, savings). No React here; 100% unit tested.
- `src/lib/parse/`: receipt and email parsers.
- `src/lib/email/`: email provider interface, the mock provider and the receipt scanner. No network calls.
- `src/features/cemetery/`: the pixel graveyard scene, gravestones, top nav, bottom HUD, details panel and the other views.
- `src/features/atmosphere/`: pixel fireflies and the cancellation celebration, gated by motion.
- `src/features/graveyard/`: the Mausoleum and reduced-motion hook.
- `src/features/daylight/`: the accessible list view.
- `src/features/editor/`: the add/edit trial form and the paste-to-parse box.
- `src/features/seance/`: the Inbox Séance panel (connect, scan, review, bury).
- `src/design/`: tokens, the Retro Pixel palette, typography (self-hosted Press Start 2P plus Inter), `pixel/` sprites and assets (backdrop and reaper in `public/pixel/`), and sounds (muted by default).
- Keep components small. Domain functions are pure and deterministic, and they take `now` as a parameter.
