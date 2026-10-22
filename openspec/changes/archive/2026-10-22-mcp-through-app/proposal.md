# Proposal

**Status:** shipped
**Branch:** mcp-through-app
**Open questions:** none

## Why

An MCP server connected straight to a chat loads every one of its tool descriptions into every chat, even the many that never use it. That fills the chat's room before work starts and grows with each server added. ClaymooApp fixed this for Epidemic Sound by sending the server through the app and calling it only when a task needs it. WongStack should make that the default for every MCP server, so no install learns it the hard way.

## What Changes

- **An MCP server goes through the app, called only when needed.** The app holds the server's address and key, the chat holds nothing, and the chat runs a short command only when a task calls for the service. Nothing goes in the chat's own server settings.
  ```mermaid
  flowchart LR
    chat["chat, on demand"] --> app["app: holds key"] --> server["MCP server"]
  ```
- **The app sorts each call into a look-up or a change.** Opening the session, listing tools, and the tools named as look-ups need *Read*. Any other tool, including one the service adds later, counts as a change and needs *Read & write*.
  | Call | Counts as |
  |-|-|
  | open, list tools | look-up |
  | a tool named as a look-up | look-up |
  | any other tool, or one added later | change |
  | anything unreadable | change |
- **One command works for every MCP server.** `services` marks an MCP service, and one helper lists its tools and calls one, so adding a server needs only its entry in the app. A service-specific helper with friendlier commands stays optional.
- **A server with no key works the same way.** A public MCP server is set up with no key, and still goes through the app, so people's levels and the look-up/change sort still apply.
- **The wiki makes it the rule.** The page on using services says why an MCP server never goes in a chat's settings, and how to add one.

**Non-goals:** no MCP server is set up in the template; no sign-in-based (OAuth) MCP servers; no change to how other services are used directly; the app itself still offers no MCP server of its own.

## Capabilities

### New Capabilities

### Modified Capabilities
- `key-access`: a key's direct use can name an MCP server, sorted per tool into look-ups and changes, with its session kept across calls; a public service can be set up with no key.

## Impact

- `app/worker/keys.ts` (`Forward` gains `mcp`; `secret`/`header` optional for a keyless entry), `app/worker/api/forward.ts` (MCP sorting, session header, MCP accept header), `app/worker/api/mcp.ts` (new sorter), `app/worker/api/services.ts` (marks MCP services), and their tests.
- `scripts/mcp-session.mjs` (new shared client), `scripts/company-api.mjs` (`mcp` command), script tests.
- `wiki/stack/company-api.md`, `wiki/stack/service-catalogue.md`, `AGENTS.md`, `CHANGELOG.md`.

## Decision log

- **2026-10-21** — Assumed: build on the existing direct-use door (`<key>.read` / `<key>.change`) rather than a new MCP door, because it already holds the key, checks levels, bounds answers and logs each call; MCP adds only the per-tool sort and the session header.
- **2026-10-21** — Assumed: the read list is an allow-list in the key's entry, not the server's own read-only hints, because the app would have to fetch the tool list on every call and the service could relabel a tool without review (ClaymooApp's reason).
- **2026-10-21** — Assumed: one generic helper command (`company-api.mjs mcp`) is the default helper, because then a new server needs only its entry; a per-service helper stays optional.
- **2026-10-21** — Assumed: the helper tries the look-up action first and, when the app answers that it isn't a look-up, sends it as a change, because a refused look-up sends nothing to the service, so trying it is safe.
- **2026-10-21** — Assumed: allow an entry with no key, because the request asked that a keyless server work too, and going through the app still keeps it out of the chat and under people's levels.
- **2026-10-21** — Assumed: ship no sample MCP entry; the live proof runs against DeepWiki's public server in a throwaway test, because a default service in every install is a separate choice.
- **2026-10-21** — Assumed: no local-key fallback like ClaymooApp's, because WongStack's rule is that the app holds business keys.
- **2026-10-22** — Built: a services row names the MCP path, `mcp: { path }`, not `mcp: true`, because the helper needs the path to open a session and the row is where it already looks.
- **2026-10-22** — Built: the MCP door tests sit in `app/worker/api/forward-mcp.test.ts` with their own made-up registry, and setup checks in `app/worker/apps/keys.test.ts` beside the others, so the existing `forward.test.ts` route lists stay as they are.
- **2026-10-22** — Built: the DeepWiki sample entry lives in the wiki section, not as a comment in `keys.ts`, because the comment rule allows two lines of at most 120 characters.
- **2026-10-22** — Observed: DeepWiki's server sends no `Mcp-Session-Id` (it is stateless), so the live run proved tools, a look-up and the change sort, and the session round trip rests on the stub tests.
- **2026-10-22** — Assumed: the helper's `tools` follows the server's next-page marker for at most 20 pages, then stops with an error, because a server that pages without end must not loop the helper.
- **2026-10-22** — Assumed: a tool name follows MCP's own rule, 1 to 128 letters, digits, `_`, `.`, `/` or `-`, because the read list matches exact names, so a wider rule only lets more real tools be listed.
- **2026-10-22** — Saved for review: built, second look found four issues, all fixed, reread clean; the owner decides on publishing.
- **2026-10-22** — Archived for publishing as 44.3.0 on the owner's `/ship`.
