QA on the live app (1eed06d) found accessibility and feedback gaps (beyond the 4 in #36).

1. **Settings toggles lack state.** "Daylight mode" and "Calm mode" show on/off only by colour (green fill). Use `aria-pressed` (or role=switch with aria-checked) plus visible ON/OFF text, matching how "Sound: on/off" already works.
2. **Nav tabs lack a current marker.** Graveyard / Quests / Collection / Add trial / Savings / Settings mark the active tab only by a green outline. Add `aria-current="page"` and a non-colour indicator (e.g. ▶ marker or underline).
3. **HUD readout runs together.** It's announced as "Next chargeHollowtv: Overdue". Add a separator or a visually-hidden colon or space, or structure it as dt/dd.
4. **Duplicate text in Mausoleum.** It exposes both "Souls saved" and "Souls saved: $11.99". De-duplicate (aria-hidden on the decorative label, or a single labelled value).
5. **Low-contrast small text.** "XP is only for fun. It never changes your savings." (Quests), the receipt-reader privacy paragraph, and the disabled Collection items (Mossy, Obsidian, Rose quartz) are too dim on dark purple. Meet WCAG AA 4.5:1 for text; disabled items can be dimmer but should stay legible, with "Locked" text.
6. **No feedback on downloads.** "Add to calendar", "Export all active to calendar" and "Share my graveyard" download files with no on-page confirmation, and the share status region stays empty. Announce through the live region, e.g. "Calendar file downloaded".
7. **Reload loses the current view.** Reload always returns to Graveyard. Persist the last tab (URL hash or localStorage).

Add tests (Testing Library role/state queries; an axe check if it's cheap). Keep typecheck, tests (504+) and the build green.
