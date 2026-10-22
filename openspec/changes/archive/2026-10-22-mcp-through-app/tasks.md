# Tasks

## 1. App: the door sorts MCP calls

- [x] 1.1 Add `app/worker/api/mcp.ts` with `rpcEffect`, and `app/worker/api/mcp.test.ts` with the sorting table
- [x] 1.2 `keys.ts` and `key-levels.ts`: `Forward` gains `mcp: { path, reads }`; `secret` and `header` optional for a keyless key; comment the example entry
- [x] 1.3 `forward.ts`: MCP path only, per-tool look-ups, session in and out, MCP accept and protocol headers, keyless sends no credential, `problem()` rules
- [x] 1.4 `services.ts`: rows mark an MCP key
- [x] 1.5 `forward.test.ts` and `services.test.ts`: a stub MCP service through dispatch, keyless entry, setup checks, the services mark

## 2. Scripts: the shared client and helper

- [x] 2.1 Add `scripts/mcp-session.mjs` (answer parsing, session, tools, tool text, read-then-change send)
- [x] 2.2 `company-api.mjs`: `mcp <key> tools [name]` and `mcp <key> tool <name> --file -`; `serviceLines` prints the tools line
- [x] 2.3 `scripts/tests/mcp-session.test.mjs` and `company-api` test additions against a stub door

## 3. Docs

- [x] 3.1 `wiki/stack/company-api.md`: *Use an MCP server through the app*; `service-catalogue.md`: the tools line
- [x] 3.2 `AGENTS.md`: the company-actions rule links the section
- [x] 3.3 `CHANGELOG.md`: `## Next (minor)` entry

## 4. Verify

- [x] 4.1 Live keyless run against DeepWiki's public MCP server through `forwardRoutes` with real fetch: session, tools list, a look-up forwarded, a change sorted as a change (throwaway, not committed)
- [x] 4.2 App tests, script tests, `node .github/scripts/checks.mjs --worktree`
- [x] 4.3 `/save`: saved PR with its preview
