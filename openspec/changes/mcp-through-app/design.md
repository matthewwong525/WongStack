# Design

## Context

See proposal.md for why. WongStack already has a door that passes one request on to a saved key's service: `POST /api/direct/<key>/read` and `/change`, built in `app/worker/api/forward.ts` from each key's `forward` entry in `app/worker/keys.ts` ([use a key directly](../../../wiki/stack/company-api.md#use-a-key-directly)). It adds the key, checks the caller's level, refuses a path outside the base, bounds the answer and logs each call. `<key>.read` runs `GET`, `HEAD` and the `lookups` the entry names; anything else needs `<key>.change`. A chat reaches it through `node scripts/company-api.mjs call <key>.read --file -`.

An MCP server speaks JSON-RPC over one `POST` path (streamable HTTP): `initialize`, the `notifications/initialized` notice, then `tools/list` and `tools/call`, with an `Mcp-Session-Id` header the server hands out and the client sends back. Answers come as JSON or as server-sent events. One `POST` path means `lookups` can't tell a search from a delete: the tool name in the body decides.

ClaymooApp (PR #1781, `openspec/changes/archive/2026-10-21-epidemic-sound-through-app/`) solved this with a sorter, `rpcEffect(body, readTools)` in `packages/worker-lib/service-door/mcp.ts`, and a shared client, `.agents/skills/shared/mcp-session.mjs`. This change ports both, minus Claymoo's service door, its local-key fallback and its Epidemic Sound and Canva specifics.

## Goals / Non-Goals

**Goals:** a key's `forward` can name an MCP server, sorted per tool; a session spans calls; a keyless public server works; one generic helper; the wiki makes "through the app, on demand" the rule; tests prove the whole path against a stub server.

**Non-Goals:** OAuth-signed MCP servers; the event stream opened by `GET`; MCP resources and prompts (only tools); a sample entry in `keys.ts`; an MCP server of the app's own.

## Decisions

1. **`forward.mcp: { path, reads }`.** `path` is the server's endpoint under `base` (`"mcp"`), `reads` the tools that only look things up, by name. A key with `mcp` forwards that one path and nothing else: any other path is `not_allowed`, so the key reaches no other page on the host.
   - *Alternative:* a separate MCP door and route family. Rejected: the direct door already holds the key, levels, bounds, redirect refusal and logging; a second door duplicates them.
2. **The sorter, `app/worker/api/mcp.ts`.** `rpcEffect(body, reads)` ported as is: `initialize`, `notifications/initialized` and `tools/list` are look-ups; `tools/call` is a look-up only when its tool is in `reads`; any other method, a batch, an unreadable body, or a malformed name is a change. `looksUp` uses it for a `POST` to the MCP path; `GET` stays a look-up and `DELETE` (ending a session) a change, by the existing rules. `problem()` rejects an `mcp` path that leaves `base` and a `reads` entry that isn't a tool name; `lookups` and `mcp` together are refused, since `mcp` decides.
   - *Alternative:* trusting each tool's `readOnlyHint` at call time. Rejected: a `tools/list` per call, and the service could relabel a tool without review.
3. **The session header and accept header.** An MCP action's input gains optional `session`, sent as `Mcp-Session-Id`; its output gains `session` from the service's answer header. `Accept` becomes `application/json, text/event-stream` and `Mcp-Protocol-Version` is sent. Event-stream answers come back as text, as any non-JSON answer does today; the client parses them.
4. **A keyless entry.** `secret` and `header` become optional together. `problem()` requires both when the key has secrets, and neither when `secrets` is empty. With none, the door sends no credential header and the "answer holds the key" check is skipped. A key with no secrets already counts as saved (`saved()` is `every` over an empty list), so its row is `ready`.
5. **The client, `scripts/mcp-session.mjs`.** Ported from Claymoo: `rpcAnswer` (JSON or SSE), `mcpSession({ send, client })` with `initialize` once, the `initialized` notice, the session carried across calls, `tools()` and `tool(name, args)`; `toolText(result)`. `send(kind, input)` calls `<key>.read` or `<key>.change`; `directSend(call, key)` tries `.read` first and, on `not_a_lookup`, sends `.change`, which is safe because a refused look-up reaches nothing. A service status of 400 or more becomes the helper's error. The 429 waits and `trimmed` are left out: the company helper already bounds answers.
6. **The default helper: `company-api.mjs mcp <key> tools [<name>]` and `mcp <key> tool <name> --file -`.** `tools` prints one line per tool (name, first sentence of its description); `tools <name>` prints that tool's input schema; `tool` prints the tool's text, bounded like `call`. A per-service helper may wrap `mcpSession` for friendlier commands.
7. **The services list.** `/api/services` rows gain `mcp: true` for an MCP key, and `serviceLines` prints `  tools: node scripts/company-api.mjs mcp <id> tools` under it.
8. **The rule in the wiki.** `wiki/stack/company-api.md` gets a section *Use an MCP server through the app*: why (tool descriptions in every chat), never in `.mcp.json` or a chat's settings, how to set one up (entry, `reads` from the server's own read-only hints reviewed by hand, an unknown tool a change), and the helper. `service-catalogue.md` names the `tools` line; `AGENTS.md`'s company-actions rule links the section.

## Testing

- `app/worker/api/mcp.test.ts`: the sorter's table.
- `app/worker/api/forward.test.ts`: a stub MCP service (SSE answers, a session header) through `dispatch` — session opens and the header round-trips, tools list, a read tool runs on `.read`, a change tool and an unknown tool are `not_a_lookup` on `.read` and run on `.change`, a batch is a change, another path is refused, a keyless entry sends no credential, and `problem()` cases.
- `scripts/tests/mcp-session.test.mjs`: the client against a stub door that sorts with the same rules — SSE and JSON answers, the read-then-change fallback, session carried, `isError` and a service refusal become errors; and the `mcp` command's printing.
- A live, throwaway run: `forwardRoutes` with real `fetch` against DeepWiki's public server (`https://mcp.deepwiki.com/mcp`, no key), with `reads` naming two of its three tools, then the third called on `.read` to show it sorted as a change. Not committed: a committed test must not need the network.

## Risks / Trade-offs

- [A tool wrongly listed in `reads` lets Read change things] → the wiki says to list only tools the server marks read-only, reviewed by hand; an unknown tool is a change.
- [The 30-second limit of a direct call] → long MCP jobs are usually started and polled; a slower tool is reported as a timeout, outcome unknown.
- [An answer streamed for a long time] → the existing 1 MB bound and the timeout stop it.
