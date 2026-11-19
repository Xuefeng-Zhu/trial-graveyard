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
npm run build   # typecheck, then build to dist/ (base path /trial-graveyard/)
npm run preview # serve the production build
```

## Built with Kiro

- **Steering:** `.kiro/steering/` holds the product metaphor, tech stack and project structure, always included in the agent's context so the costume stays consistent.
- **Spec-driven development:** `.kiro/specs/trial-graveyard-mvp/` has requirements, design and a phased task list. Each phase was implemented against the spec and ticked off in `tasks.md`. A second spec, `.kiro/specs/haunted-polish/`, covers the landing screen, epitaphs, sound, share card and mobile pass.
- **Agent hooks:** `.kiro/hooks/` has five hooks: test-on-save, domain-property-guard, spec-sync, a11y-check and spooky-copy.
- **MCP:** `.kiro/settings/mcp.json` configures a `fetch` server and a GitHub server, explained in `.kiro/steering/mcp.md`. The token comes from `GITHUB_TOKEN`.
- **Property-based tests:** fast-check covers stage boundaries, savings math, ICS export and the receipt parser, alongside example tests.
- **GitHub-issue driven agent PRs:** each phase was a GitHub issue, and an agent opened a pull request that closed it.

### Kiro features used

| Feature | Where | What it does here |
|---|---|---|
| Steering | `.kiro/steering/` (product, structure, tech, mcp) | Keeps the haunted metaphor, stack and MCP usage consistent. |
| Specs (2) | `.kiro/specs/trial-graveyard-mvp/`, `.kiro/specs/haunted-polish/` | Requirements, design and tasks for the MVP and the polish pass. |
| Hooks (5) | `.kiro/hooks/` | Test on save, domain property guard, spec sync, a11y check, spooky copy. |
| MCP | `.kiro/settings/mcp.json` | `fetch` for real cancellation and pricing pages, GitHub for follow-up issues. |
| Property-based tests | `src/domain/`, `src/lib/parse/` | fast-check for stages, savings, ICS and the receipt parser. |
| Agent PRs from issues | GitHub issues | Each phase is an issue that an agent closes with a pull request. |

## License

MIT
