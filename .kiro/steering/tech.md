---
inclusion: always
---
# Tech stack
- Vite + React 18 + TypeScript (strict). No server needed for the core app.
- Styling: CSS modules plus CSS custom properties for the design tokens. Pixel sprites are SVG built from character maps; animation uses stepped CSS keyframes. Fonts are self-hosted through `@fontsource` (Press Start 2P, Inter), never a CDN.
- State: Zustand, persisted to IndexedDB (idb-keyval). Data is local-first.
- Date math uses date-fns. All dates are stored as ISO strings in the user's local timezone.
- Receipt parsing: a deterministic regex/heuristic parser in `src/lib/parse/` comes first and must work offline. An optional LLM fallback is behind a feature flag; it's never required.
- Testing: Vitest + Testing Library. Use property-based tests with fast-check for the date and stage logic and for the parser.
- Deployment: a static build (Netlify, Vercel or GitHub Pages). It needs a public URL for the judges.
- License: MIT. The /.kiro folder must be committed and never gitignored.
