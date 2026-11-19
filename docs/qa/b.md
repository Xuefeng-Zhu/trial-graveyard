QA on the live app (1eed06d) found ways for the data to get duplicated or lost.

1. **Summon demo graveyard duplicates everything.** Clicking it again (Settings or landing) re-adds all 8 demo trials (12 → 20 graves) and doubles "Souls saved" ($11.99 → $23.98), with no confirmation. Make it idempotent (stable demo ids, skip ones already present) or offer "Replace with demo data?".
2. **No duplicate warning.** Saving a parsed receipt for "Phantomflix" when a Phantomflix grave already exists silently creates a second one. Warn when the name and charge date match an existing grave (case-insensitive), with "Bury anyway" / "Open existing".
3. **Delete has no Undo.** Confirm delete removes a grave permanently, while Exorcise / I cancelled / Keep it all offer Undo. Add the same Undo toast for delete.
4. **No data export/import or reset.** Because data is on-device only, add to Settings: "Export graveyard (JSON)", "Import graveyard (JSON)" with schema validation and a merge-or-replace choice, and "Clear all data" with a typed or double confirmation.

Add tests for idempotent demo seeding, dedupe detection, delete undo, and export→import round-trip (fast-check property: import(export(x)) deep-equals x). Keep typecheck, tests (504+) and the build green.
