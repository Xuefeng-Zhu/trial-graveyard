# Trial Graveyard

A haunted tracker for free trials and subscriptions. Every trial is a grave. As the charge date nears, the grave cracks open, and within 48 hours a zombie shambles out to remind you to cancel. Cancelled trials get a tombstone and an epitaph with the money saved.

Built with Kiro for Kiroween 2026 (Costume Contest).

**Live:** https://xuefeng-zhu.github.io/trial-graveyard/ (deployed by GitHub Actions to GitHub Pages on every push to `main`).

The app is local-first and works offline after the first visit (service worker precache).

## Run it

```sh
npm ci          # install
npm run dev     # dev server
npm test        # unit and property tests, with a 100% coverage gate on src/domain/
npm run typecheck
npm run build   # typecheck, then build to dist/ (base path /trial-graveyard/ by default, see Deploy)
npm run preview # serve the production build
```

## Before the bite

Trial Graveyard catches free trials before the first charge. The graveyard view leads with the trial closest to charging, then gives you four ways to kill it in time.

- **Countdown hero:** the next trial to charge is featured with a live "turns in 2d 5h" countdown and the amount. It is calm beyond 7 days, uneasy within 7, restless within 3 days and rising within 24 hours. Rising shakes and glows, and stays still when you prefer reduced motion.
- **Haunting reminders:** "Add haunting to calendar" on any trial downloads an `.ics` with two reminders, 48 hours before the charge and at 09:00 local on the charge day (never after the charge itself). "Export all hauntings" bundles every active trial. Each reminder has a stable UID, so importing again updates it instead of duplicating. Everything is built in the browser.
- **Exorcism:** "Exorcise" opens a panel with the service's cancel link and 2 to 4 steps from a local guide. Demo brands use `.example` links, and unknown services get generic steps plus a web search link. "It's exorcised" buries the trial, adds it to souls saved, and can be undone.
- **Trial hacker stats:** trials survived, dollars dodged this year, average days used before cancelling and trials that escaped, all derived from your graves.

## Deploy

The public base path is resolved in `vite.base.ts`: `VITE_BASE` if set, else `/` when `VERCEL` is set, else `/trial-graveyard/`. The PWA manifest `scope` and `start_url`, the workbox `navigateFallback` and Vite's `base` all use it, and runtime assets use `import.meta.env.BASE_URL`.

- **GitHub Pages:** no configuration needed. `.github/workflows/deploy.yml` runs typecheck, tests and build on every push to `main` with the default `/trial-graveyard/` base, then publishes `dist/`.
- **Vercel:** import the repo. Vercel sets `VERCEL`, so the base becomes `/`. `vercel.json` sets the build command (`npm run build`), output directory (`dist`), the `vite` framework preset and an SPA rewrite of non-file routes to `/index.html`.
- **Anywhere else:** set `VITE_BASE` at build time, for example `VITE_BASE=/ npm run build` for a root domain or `VITE_BASE=/apps/graveyard/ npm run build` for a sub-path.

## Screenshots

The Retro Pixel pass (see `.kiro/specs/retro-pixel-graveyard/`) was captured in headless Chromium with the demo graveyard loaded. The visual target is `docs/design/concept-retro-pixel.png`.

![Desktop graveyard at 1440px: pixel backdrop, gravestones, reaper, daily quest and the Exorcise Trials button](docs/screenshots/retro-pixel-desktop-1440.png)
![Mobile layout at 360px wide with the swipeable grave row and the bottom navigation](docs/screenshots/retro-pixel-mobile-360.png)

The share card image is still a placeholder (`placeholder-share-card.png`).

![My Graveyard share card with totals and the hashtag](docs/screenshots/placeholder-share-card.png)

## Retro Pixel design

- **Palette:** midnight `#120F23`, deep purple `#2C2142`, violet `#8B5CF6`, lavender `#B8A9D9`, toxic green `#A8FF60`, orange `#FFB14A`, red `#FF586E` and moonlight `#F2ECFF`. They are CSS custom properties in `src/design/tokens.css`, and `src/design/design.test.ts` checks the text and border pairs for WCAG contrast.
- **Fonts, self-hosted:** Press Start 2P (`@fontsource/press-start-2p`) for titles and HUD labels, Inter for body text and prices. Both ship in the bundle, so there are no font CDN requests and they work offline.
- **Pixel grid rules:** sprites are drawn from character maps in `src/design/pixel/` and rendered as SVG with `shape-rendering: crispEdges`. The 384x216 backdrop and the reaper are drawn with `image-rendering: pixelated` at a whole-number scale that follows the viewport width. Borders are 4px steps and there are no blurs or gradients on UI chrome.
- **Graveyard:** the scene fills the viewport. Gravestones sit in a wrapping row on the path (a swipeable snap row on phones) with the reaper beside the first one. The most urgent grave is outlined with green corner brackets by default. The details panel opens only when you activate a grave (a bottom sheet on phones).
- **States:** normal (plenty of time), approaching (7 days or less: cracks and a warning glow), critical (48 hours or less: red cracks, sparks and a zombie hand), kept (a plain stone) and cancelled (vines and a "saved" badge). The mapping is a pure function in `src/domain/pixelState.ts`.
- **Cosmetic XP:** levels, streaks, the daily quest and the collection of stone styles and decorations come from `src/domain/xp.ts`. XP never reads or writes the savings math, so the money totals are the same with or without it.
- **Motion, Calm and sound:** sparks, the rising hand, the reaper bob and the cancellation celebration run only when motion is allowed. That means no OS reduced-motion preference and Calm mode off. Sound cues are muted by default and follow the sound toggle.
- **Accessibility:** every grave is a button with a full text status for screen readers, targets are at least 44px, focus rings are visible, vitest-axe checks the main views, and the Daylight list stays available as a plain accessible view. The mobile nav is Graveyard, Quests, Add, Savings and Settings, and has no horizontal overflow at 360, 390, 430 and 768px.
- **Brands:** monogram tiles and fictional service names stand in for real logos.

## Inbox Séance

The crystal-ball button next to "Paste a receipt" opens the Inbox Séance. It connects to an inbox, scans receipt emails for trials, and lists what it found so you can review them and bury the ones you want.

- **How it works:** connect a provider, allow access in a consent step, watch the spirits count up as emails are read, then review each detected trial. Every row has a checkbox, a confidence label, a short source snippet and editable name, date, price and cadence. "Bury selected" adds the checked trials to the graveyard. Trials you already buried do not come back.
- **Mock provider:** for now the only provider is the "Haunted Demo Inbox", an in-memory inbox of fake receipts with relative dates. There are no network calls. Gmail and Outlook show as "coming soon" (see `src/lib/email/providers/README.md`).
- **Privacy:** everything stays on the device. Only the trials you confirm are stored, email bodies are never stored, and Disconnect (or closing the panel) clears everything the spirits saw. The panel explains this under "What the spirits can see".
- **Motion:** the scanning orb stays still when you prefer reduced motion.

## Image receipts

Under "Paste a receipt" you can also show the spirits a screenshot or photo of a confirmation. The text is read on your device and fills the same form as a pasted receipt.

- **How it works:** choose an image, take a photo (on mobile), drop one on the box, or paste one from the clipboard. The image is shrunk to about 1600 px on the long edge and turned gray, then read with [tesseract.js](https://github.com/naptha/tesseract.js) (English). A progress bar with a Cancel button shows while the spirits are deciphering. The fields are prefilled for you to check. A confidence hint and a collapsible "What the spirits read" section show the raw text, which you can fix and read again.
- **Try it:** "Try a sample screenshot" loads a generated Phantomflix receipt from `public/samples/` (made by `scripts/make-samples.py`, all data invented).
- **Lazy loading:** `tesseract.js` is loaded with a dynamic `import()` only after you pick an image, so it is a separate chunk and the main bundle does not grow. The worker, core and English data are fetched on first use and cached by the service worker (`tesseract-assets`), so image receipts work offline afterwards. These assets are not self-hosted: the first read contacts `cdn.jsdelivr.net` and `tessdata.projectnaptha.com`, which can see that the feature was used. The image itself is never sent, and the UI says so.
- **Privacy:** the image never leaves the device. Only the trial you confirm is saved, never the image or the OCR text. The UI says so, and also mentions the CDN download.
- **When it cannot read:** no text gives a friendly message and an "Enter it by hand" button that jumps to the form. A low-confidence read (under 40%) does not prefill the form, but keeps the raw text for you to fix and read again. A picture the browser cannot decode (HEIC, for example) gets its own message.
- **Testing:** OCR sits behind an `OcrEngine` interface (`src/lib/ocr/types.ts`). Tests use a fake engine and never download models.
- **Motion:** the progress shimmer stops when you prefer reduced motion.

## Built with Kiro

- **Steering:** `.kiro/steering/` holds the product metaphor, tech stack and project structure, always included in the agent's context so the costume stays consistent.
- **Spec-driven development:** `.kiro/specs/trial-graveyard-mvp/` has requirements, design and a phased task list. Each phase was implemented against the spec and ticked off in `tasks.md`. A second spec, `.kiro/specs/haunted-polish/`, covers the landing screen, epitaphs, sound, share card and mobile pass. A third spec, `.kiro/specs/inbox-seance/`, covers the Inbox Séance. A fourth, `.kiro/specs/image-receipts/`, covers image receipts. A fifth, `.kiro/specs/moonlit-cemetery/`, covers the earlier parallax scene, which Retro Pixel replaced. A sixth, `.kiro/specs/before-the-bite/`, covers the countdown hero, haunting reminders, exorcism flow and stats. A seventh, `.kiro/specs/retro-pixel-graveyard/`, covers the pixel-art redesign, cosmetic XP and the reaper.
- **Agent hooks:** `.kiro/hooks/` has five hooks: test-on-save, domain-property-guard, spec-sync, a11y-check and spooky-copy.
- **MCP:** `.kiro/settings/mcp.json` configures a `fetch` server and a GitHub server, explained in `.kiro/steering/mcp.md`. The token comes from `GITHUB_TOKEN`.
- **Property-based tests:** fast-check covers stage boundaries, savings math, ICS export and the receipt parser, alongside example tests.
- **GitHub-issue driven agent PRs:** each phase was a GitHub issue, and an agent opened a pull request that closed it.

### Kiro features used

| Feature | Where | What it does here |
|---|---|---|
| Steering | `.kiro/steering/` (product, structure, tech, mcp) | Keeps the haunted metaphor, stack and MCP usage consistent. |
| Specs (7) | `.kiro/specs/trial-graveyard-mvp/`, `.kiro/specs/haunted-polish/`, `.kiro/specs/inbox-seance/`, `.kiro/specs/image-receipts/`, `.kiro/specs/moonlit-cemetery/`, `.kiro/specs/before-the-bite/`, `.kiro/specs/retro-pixel-graveyard/` | Requirements, design and tasks for the MVP, the polish pass, the Inbox Séance, image receipts, the Moonlit Cemetery redesign, before the bite and the Retro Pixel redesign. |
| Hooks (5) | `.kiro/hooks/` | Test on save, domain property guard, spec sync, a11y check, spooky copy. |
| MCP | `.kiro/settings/mcp.json` | `fetch` for real cancellation and pricing pages, GitHub for follow-up issues. |
| Property-based tests | `src/domain/`, `src/lib/parse/` | fast-check for stages, savings, ICS, the receipt parser and date math (reminder times, countdown, month ends, leap days and DST). |
| Agent PRs from issues | GitHub issues | Each phase is an issue that an agent closes with a pull request. |

## License

MIT
