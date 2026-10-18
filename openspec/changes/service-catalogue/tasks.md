# Tasks

## 1. Keys say what they are for

- [x] 1.1 Add required `purpose` and optional `docs` to `Key` in `app/worker/keys.ts`; fill both for `cloudflare` and `purpose` for `code`; update the commented examples.
- [x] 1.2 `app/worker/keys.test.ts`: fail on a missing or over-long purpose, and on a `forward` key with no HTTPS `docs`, naming the key.

## 2. Remove the MCP build

- [x] 2.1 Worker and app (design §5): delete `app/worker/mcp/`, `app/tests/mcp.ts`, the migration `schema/migrations/20261018040000_mcp_connections.sql`, `app/src/apps/access/AddMcp.tsx` and `mcp.ts`; take the MCP parts out of `discovery.ts`, `index.ts`, `members.ts`, `seed.sql`, the Access views and their tests. Keep `purpose`/`docs` and `employee-bootstrap.mjs`'s bounded answers.
- [x] 2.2 Remove `WONG_MCP_SEAL` from `private-access.mjs`, `provision.mjs`, `cf-secrets.mjs`, `check-app-keys.mjs`, `app/.dev.vars.example` and their tests.
- [x] 2.3 Helper: remove `mcp add` and `mcp import`, `scripts/lib/mcp-import.mjs` and its test, and MCP rows from `services`.
- [x] 2.4 Remove `wiki/stack/mcp-connections.md`, its links, its `areas.json` entry and its `payload-files.json` lines.
- [x] 2.5 A search of live files for `mcp`, `MCP` and `WONG_MCP_SEAL` finds only the later one-app-MCP note, the evidence and this change's Decision log.

## 3. Services list

- [x] 3.1 `GET /api/services` in `app/worker/api/services.ts` (design §2): keys the caller holds a level for, `needAccess` count, `?all=1`, ETag, cache headers and the credential guard; no MCP rows.
- [x] 3.2 Tests: held level, not held counted, `?all=1`, unsaved key, `code` absent, no value; ETag changes on a level or a saved key; discovery and `selectOperations` unchanged.

## 4. App screen

- [x] 4.1 `app/src/apps/access/Services.tsx`: the keys list for the owner and Admins (name, purpose, Saved or *Ask the assistant for its key link*, *also used directly*), third entry in `VIEWS` with its address and count, owner/Admin only; empty state (design UX).
- [x] 4.2 Tests: each key state, empty state, a teammate gets no Services entry and the address shows no keys, no value in the DOM.

## 5. Helper

- [x] 5.1 `scripts/company-api.mjs services [--all] [--json]`, with `notes: { path, exists }` for each row from the checkout's `wiki/services/<id>.md` and the `N more need access` line (design §2, §1a).
- [x] 5.2 Short output (design §3): `list` one line per match with `--json` for today's shape; `describe` without the shared error schema, `--json` for all; `call` bounded at 20 KB with the rest in a private, swept file, `--full` for the whole answer; errors unchanged.
- [x] 5.3 Tests: `services` output with and without `--all` and notes pages; `list` lines and `--json`; `call` under and over 20 KB, `--full`, file mode and sweep.

## 6. Docs and release

- [x] 6.1 `AGENTS.md`: the credentials line and *Company actions* rule, naming `services` first and the notes pages, with no MCP wording (design §4).
- [x] 6.2 `wiki/stack/service-catalogue.md` without MCPs (discovery moved from `company-api.md`, which keeps a link; the services list; short output and `--full`; the shared error shape; notes pages); linked from `wiki/stack/README.md`.
- [x] 6.3 `wiki/stack/access-screens.md` (three views; Services for owner/Admin, keys only), `employee-access.md` (no MCP text), `api-keys.md#a-saved-key-shows-in-access` (purpose and guide link), `wiki/development/secrets.md` (tool keys vs business services, no MCP); fix links with `memory.mjs areas`.
- [x] 6.4 `CHANGELOG.md`: `## Next (minor) — Every key-based service in one list, with short answers`, with an **Updating.** note in plain words: add a purpose line to each key the install registered, and a guide link to each one used directly; a script of yours that reads a long answer from the action helper adds `--full`. No new secret.

## 7. Verify

- [x] 7.1 Bring in `main`, then run `node .github/scripts/checks.mjs --worktree` and fix what fails.
- [x] 7.2 With the person's go-ahead, clear the test copy's MCP leftovers: the `WONG_MCP_SEAL` secret on `wongstack-staging`, and the MCP tables, rows and migration record in its database.
- [x] 7.3 `/save`, then on the preview: `services` lists Cloudflare with its purpose, state and notes path; `list --q cloudflare` prints one line per match; a long answer comes back short with its file; the owner's Services view shows each key's state; the verification login sees no Services view. Record results in `evidence.md`.
