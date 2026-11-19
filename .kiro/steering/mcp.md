---
inclusion: always
---
# MCP servers

Configured in `.kiro/settings/mcp.json`. The GitHub server reads its token from the `GITHUB_TOKEN` environment variable. Never write a real token into the config or any committed file.

## fetch (`uvx mcp-server-fetch`)
Use it to read real web pages while working on the app:
- Fetch a service's actual cancellation page, so a demo or fixture "Cancel now" URL and the steps in the copy match reality.
- Fetch a service's pricing page, to check prices and cadence used in demo data and receipt fixtures.
- Fetch only public pages. Do not paste fetched page text into the repo; keep the URL and the facts needed.

## github (`npx -y @modelcontextprotocol/server-github`)
Use it for repository work in Xuefeng-Zhu/trial-graveyard:
- File follow-up issues for work found but out of scope for the current task (one issue per problem, with a short reproduction or pointer to the file).
- Read issues and pull requests to get context before starting a phase.
- Do not push to `main` or merge pull requests through it. Changes go through a pull request that says "Closes #<issue>".
