# Tasks

## 1. Prove the sign-in first

- [ ] 1.1 With a throwaway route on a preview, run Add's discovery and registration against `https://mcp.canva.com/mcp` and one sign-in round trip (the owner signs in at Canva in their own browser), then one `tools/list`. Repeat discovery and registration only for `https://mcp.notion.com/mcp`. Record what each returned (registration answer shape, token lifetime, whether the refresh token rotates, `readOnlyHint` coverage, tool-list size) in `evidence.md`, never a token. Stop and report if Canva refuses the return address. Remove the throwaway route before 3.3.

## 2. Keys say what they are for

- [x] 2.1 Add required `purpose` and optional `docs` to `Key` in `app/worker/keys.ts`; fill both for `cloudflare` and `purpose` for `code`; update the commented examples.
- [x] 2.2 `app/worker/keys.test.ts`: fail on a missing or over-long purpose, and on a `forward` key with no HTTPS `docs`, naming the key.

## 3. Worker: MCP store, sign-in and calls

- [x] 3.1 Migration `schema/migrations/<ts>_mcp_connections.sql`: `wong_mcp_servers`, `wong_mcp_connections` (per person, with `share` and the one-share-per-MCP index) and `wong_mcp_sign_ins` (design §3).
- [x] 3.2 `app/worker/mcp/seal.ts`: AES-GCM seal/open from `WONG_MCP_SEAL`; strip the secret in `scopedEnv`; make `scripts/check-app-keys.mjs` refuse the name outside `app/worker/mcp/`; declare it in `app/.dev.vars.example`; have setup and the update make and push it.
- [x] 3.3 `app/worker/mcp/discover.ts` and `routes.ts`: Add (anyone signed in, at most 50), Connect, callback, Disconnect, Refresh and share (own row only; owner/Admin may stop any share); Remove (adder while no one else is connected, else owner/Admin) deletes the row and connections together; list for everyone; the deep link `/apps/access/services/<id>` (design §4, §8).
- [x] 3.4 `employee-access/members.ts`: removing a person deletes their `wong_mcp_connections` rows in the same batch.
- [x] 3.5 `app/worker/mcp/auth.ts`: the per-connection renewal lease and `reconnect` state (design §5).
- [x] 3.6 `app/worker/mcp/client.ts`: Streamable HTTP `initialize`/`tools/list`/`tools/call`, JSON or SSE, session header, manual redirects, timeout, size bound, token-in-answer refusal.
- [x] 3.7 `POST /api/mcp/:id/tools/:tool`: the caller's own sign-in, else the share (`mcp_not_connected` with the link when neither), look-up or change from the saved list, a look-ups-only share refuses a change (`mcp_share_read_only`), `via` in the answer, outcome-unknown on a timed-out change, key-use log line with `as` (design §7, §8).
- [x] 3.8 Tests beside each file with a stand-in MCP and sign-in server on `fetch`: Add success and each `422`; state reuse, expiry and wrong person refused; one person can't disconnect or see another's sign-in, nor use it unless shared; own sign-in beats a share; a look-ups-only share runs a look-up and refuses a change and a missing tool; *Everything* runs a change; a second share answers `409`; unticking, Disconnect, reconnect and removing the sharer each end the share; a non-adder and an adder with others connected can't Remove, the owner can; anyone can Add; two concurrent renewals of one connection call the token endpoint once; `invalid_grant` → that person's reconnect only; no sign-in → nothing sent; no response, log line or row read without the seal holds a token; Remove deletes connections; removing a person deletes their connections.

## 4. Worker: services and discovery

- [x] 4.1 `GET /api/services` in `app/worker/api/services.ts` (design §2): keys the caller holds a level for, `needAccess` count, `?all=1`, every MCP with `ready`, `using` and the `connect` link, ETag, cache headers and the credential guard.
- [x] 4.2 `discovery.ts`: one operation per saved tool for every MCP, readiness from the caller's own sign-in or a covering share, else `needs_connect`; no `keys` entry; no MCP contact during discovery; revision covers `tools_at`, the caller's connection states and shares; OpenAPI includes them (design §6).
- [x] 4.3 Tests: services list per caller (held key level, not held counted, `?all=1`, unsaved key, MCP own, shared look-ups, shared everything, not connected, reconnect, `code` absent, no value); MCP tools found by `q`, effect from `readOnlyHint`, readiness by own sign-in or share; discovery makes no outbound request; ETag changes on a Connect, a share or a Refresh; key levels and `selectOperations` unchanged.

## 5. App screens

- [x] 5.1 `app/src/apps/access/`: a Services view (`Services.tsx`, third entry in `VIEWS` with its address and count) for everyone (every MCP with *N connected*, a shared tag, own state, Connect or *Connect mine*, Disconnect, Refresh, Add, Remove only for who may) plus the Keys group and *Stop sharing* for owner/Admin; the share box on the viewer's own row (*Look-ups only* default, *Everything*, disabled while another person shares); `AddMcp.tsx` dialog; the deep link focusing a row's Connect; empty state; confirm for Remove (design UX).
- [x] 5.2 Tests: each row state for owner and teammate (own, shared, none, reconnect), the share box saves and defaults to look-ups, disabled while another shares, deep link focuses Connect, Add error keeps input, empty state, a teammate sees Add but no keys and no Remove on others' MCPs, no value or token in the DOM.

## 6. Helper

- [x] 6.1 `scripts/company-api.mjs services [--all] [--json]`, with each MCP's *yours* or *<name>'s, look-ups* state, `notes: { path, exists }` for each key row from the checkout's `wiki/services/<id>.md` and the `N more need access` line (design §2, §1a).
- [x] 6.2 Short output (design §8a): `list` one line per match with `--json` for today's shape; `describe` without the shared error schema, `--json` for all; `call` bounded at 20 KB with the rest in a private, swept file, `--full` for the whole answer; errors unchanged.
- [x] 6.3 `mcp add <address> [--name]` printing the result and the `connect` link; `mcp_not_connected`, `mcp_reconnect` and `mcp_share_read_only` errors print the link and exit non-zero; a shared call's output names whose sign-in it used (design §4a, §7).
- [x] 6.4 `mcp import [--yes]` in `scripts/lib/mcp-import.mjs`: read Claude's user, local and `.mcp.json` entries and Codex's `[mcp_servers]`; skip with reasons (stdio, fixed key, old event-stream, already added, not HTTPS); offer, then Add each under the caller's login. `mcp import --remove-local <name> [--yes]` after the caller's own Connect: print, and with `--yes` run, `claude mcp remove` or `codex mcp remove`; a `.mcp.json` entry is named for a normal save instead. Never open a credentials file or edit a settings file (design §4b).
- [x] 6.5 Tests: `services` output with and without `--all` and notes pages; `list` lines and `--json`; `call` under and over 20 KB, `--full`, file mode and sweep; `mcp add`; import config shapes and each skip reason, `$CODEX_HOME`, no header or env value in output, no credentials file opened, remove-local refused before Connect; an MCP `call` through a stand-in origin.

## 7. Docs, pointer and release

- [x] 7.1 `AGENTS.md`: the credentials line and *Company actions* rule, naming `services` first and the notes pages (design §9).
- [x] 7.2 New `wiki/stack/service-catalogue.md` (discovery moved from `company-api.md`, which keeps a link; the services list; short output and `--full`; the shared error shape; how a chat starts and grows a service's notes page) and `wiki/stack/mcp-connections.md` (adding from the page, the chat and Claude/Codex; who can add and remove; each person's Connect; sharing and what *Look-ups only* allows; what's stored and sealed); link both from `wiki/stack/README.md`.
- [x] 7.3 Update `wiki/stack/access-screens.md` (three views; the Services view for everyone, keys for owner/Admin), `employee-access.md#key-levels` (MCPs take no level; removal deletes sign-ins and shares), `api-keys.md#a-saved-key-shows-in-access` (purpose and guide link), `wiki/development/secrets.md` (tool keys vs business services); fix links with `memory.mjs areas` for the moved section.
- [x] 7.4 Add `openspec/specs/mcp-connections/spec.md` to an area in `.agents/skills/memory/references/areas.json`.
- [x] 7.5 `CHANGELOG.md`: `## Next (minor) — Every outside service in one list, and MCPs each person signs in to once`, with an **Updating.** note in plain words: the update makes the new sealing key itself; add a purpose line to each key the install registered; a script of yours that reads a long answer from the action helper adds `--full`.

## 8. Verify

- [x] 8.1 Run `node .github/scripts/checks.mjs --worktree` (includes payload links, context size, retired names, app tests at full coverage) and fix what fails.
- [ ] 8.2 `/save`, then on the preview: the owner asks the assistant to connect Canva, follows its link, and connects their own Canva; `services` shows Canva ready; `list --q canva design` finds a design tool in one line each; a look-up runs, and a long answer comes back short with its file; the verification login, which holds no Canva sign-in, is told to connect, with the link, and nothing reaches Canva. The owner ticks *Let the team use my sign-in* (look-ups only): the verification login's look-up then runs with *via* the owner, and its change tool is refused with nothing sent; untick, and it is told to connect again. Remove clears the row and every sign-in. Record results in `evidence.md`.
