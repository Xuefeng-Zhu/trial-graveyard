# Decisions

- The six Kiro specs define delivery order. The retro-pixel direction applies from the first release. Earlier scene tasks use their functional equivalents in the pixel cemetery.
- The charge instant itself is overdue, as defined in the MVP boundary table. All urgency windows use elapsed milliseconds. Date-only form values use 09:00 local time, and editing unchanged dates preserves the original instant.
- Demo seeds have stable identifiers. Sample services and cancellation destinations are fictional. A user-provided cancellation link opens only through a deliberate click.
- Each saved amount represents one confirmed charge avoided, grouped by currency. Weekly and yearly projections are used only for the monthly equivalent of kept subscriptions.
- Numeric dates in pasted receipts use US month/day order. An explicit year overrides year inference. The editor exposes the source date and keeps it editable.
- The feature-flagged fallback reserves a local parser extension. Receipt text stays in the browser with either setting.
- OCR downloads versioned npm assets from the app origin. Workbox caches the worker, core and language assets after first use. The app has no runtime dependency on a public OCR CDN.
- The HUD and Savings use the same next-charge, overdue and seven-day risk selectors. The Mausoleum and stats use the same lifetime savings definition. Trials survived and first charges dodged this year use the narrower pre-charge definition.
- Backup merge identifies graves by stable ID and keeps local settings. Replace and clear require an explicit confirmation. Cancellation guides for unknown services link to a search homepage without placing service names in the URL.
- The retro audit found no earlier Moonlit Cemetery source or assets in the seed. The supplied backdrop and Reaper are used directly at integer scales. Original character-map icons and two-letter monograms identify fictional services.
- A desktop sidebar and a handheld carousel share the same review actions and charge selectors. The URL hash restores the last tab on reload. Daylight mode shows the full sorted list with the same controls.
- XP is an independent ledger. A demo seed earns only add XP, and restoring a cancellation removes its cancellation XP while preserving later edits. Backups merge progress for imported IDs and retain local records for conflicting IDs.
- Séance imports hold the selected batch for correction when a selected row is invalid or became a duplicate during review.

## Validation

- The production build passed Chromium checks at 360, 390, 430, 768, and 1440 px. The checks covered keyboard navigation and focus, the accessibility tree, axe, calendar and JSON downloads, a backup merge, last-tab restoration, and offline reload. Lighthouse accessibility scored 100.
- The 360 px automated entry flow filled the six fields and submitted with the keyboard in under one second. Human typing time varies.
- A separate `VITE_BASE=/trial-preview/` build read the sample image online and then again offline. Neither run made a request outside the app origin.
