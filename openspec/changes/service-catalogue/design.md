# Design

## Context

See `proposal.md` for why. What shapes the build:

- **Discovery already exists for actions.** `app/worker/api/discovery.ts` serves `GET /api/actions` (bounded summaries, `q`/`app` filters, `id` for one contract) and `/api/openapi.json`, per caller, through `selectOperations` in `.agents/skills/memory/scripts/lib/operations.mjs`. `scripts/company-api.mjs list|describe|call` is the chat side. Direct-use keys already appear as `<key>.read` / `<key>.change` actions (`app/worker/api/forward.ts`).
- **Keys are static.** `app/worker/keys.ts` lists each key's `title`, `secrets`, `levels`, `forward`; there is no purpose or guide link. `keyCatalogue` (`employee-access/key-catalogue.ts`) feeds Access's panels.
- **Levels are stored by text id.** `wong_access_key_grants` and `wong_access_role_keys` hold `key_id` with no foreign key to the registry; `heldLevels` drops ids that `registered()` doesn't know. Owner, Admin and the preview checker get `everyKey()`.
- **Every mini app shares the app's D1.** `scopedEnv` strips unlisted secrets from a route, never the database, so a token stored as plain text in D1 is readable by any route.
- **`wiki/stack/company-api.md` is at 2,997 words**, against a 3,000-word page limit.
- **MCP sign-in** (spec 2025-06-18), as ClaymooApp's `mcp-connections` design read it on 2026-10-18: an unauthenticated call answers `401` with `WWW-Authenticate: Bearer resource_metadata=…` (RFC 9728) → authorization-server metadata (RFC 8414) → dynamic client registration (RFC 7591) → authorization code + PKCE S256 with `resource` (RFC 8707). Canva publishes `registration_endpoint`, PKCE S256 and the `refresh_token` grant; rotation is unpublished, so design for single-use refresh tokens. Transport is Streamable HTTP: JSON-RPC over `POST`, JSON or SSE answer, optional `Mcp-Session-Id`.
- **The helper prints everything.** `scripts/company-api.mjs` writes each result with `JSON.stringify(result, null, 2)`: a 20-row `list` is about 240 lines, `describe` repeats the full error schema, and `call` prints a direct-use answer of up to about 1 MB whole. Installs' skill scripts parse `call`'s JSON (`scripts/check-skill-actions.mjs`).
- **The app sits behind company login.** The sign-in return `/api/mcp/callback` is reached by the signed-in person's own browser, so it can stay behind it.

## Goals / Non-Goals

**Goals:**

- One per-caller list of the keys a person can use and every MCP on the app, bounded in size, from one helper command.
- Helper output that keeps the chat small: one line per match, a bounded answer with the rest in a file.
- MCP tools searched, described and called through the existing `list`/`describe`/`call`.
- Any remote MCP with a self-registering OAuth sign-in added from the page or the chat, with no code change; one sign-in per person per MCP, renewed safely under concurrent calls.
- A person may share their sign-in with the team, as look-ups only or everything; their own sign-in always comes first for each teammate.

**Non-Goals:**

- Fixed-key MCPs, MCP prompts/resources/sampling/notifications, held-open MCP sessions.
- Access levels per MCP (later, if a team wants the owner to decide who may use one; grants could reuse the key tables with `mcp:<id>` ids). Each person's own account, or the sharer's choice, decides now.
- MCPs with no dynamic client registration (later: a client ID and secret through the key link).
- An owner override marking single tools as look-ups (later).
- A curated list of each REST service's endpoints (the guide link covers it).
- Any edit to ClaymooApp.
- The app as one MCP a chat connects to once, with four tools (find, describe, look up, change): a later change (advice of 2026-10-13, memory fact #1521). Search plus `describe` keeps tool definitions out of the chat until then.

## Decisions

### 1. Keys gain `purpose` and `docs`

`Key` in `app/worker/keys.ts` gains required `purpose` (one line, ≤ 80 chars) and optional `docs` (HTTPS URL to the service's public API guide), required when `forward` is set. `keys.test.ts` enforces both and names the key. The supplied `cloudflare` and `code` entries get purposes, and `cloudflare` links Cloudflare's API docs. `wiki/stack/api-keys.md#a-saved-key-shows-in-access` tells the assistant to fill both when it registers a key, from the service's own help pages.

### 1a. A notes page per key-based service

What a chat learns about a service's endpoints lives in the install's wiki at `wiki/services/<id>.md`, one page per key id; `wiki/services/README.md` is the hub, made with the first page and linked from the wiki root, as `people/` is. The Worker can't see the checkout, so `company-api.mjs services` adds `notes: { path, exists }` to each `kind: "key"` row from the local checkout. A page starts as the `#` title, the purpose line and the guide link; a chat adds each call it worked out (method, path, the inputs that mattered, a pitfall) and saves it through the normal wiki save. The guide stays the source; notes are what earlier chats proved works. No key values, sign-ins or customer data: the wiki rules already hold this. MCPs get no notes page: their tool list describes itself. Nothing ships; the meta-repo has no service keys.

Alternative considered: keeping notes in memory. Rejected: they are repeatable knowledge by [the wiki's test](../../../wiki/wiki-style.md#repeatable-knowledge), and a wiki page is curated, not superseded.

### 2. `GET /api/services`, beside `/api/actions`

A new handler in `app/worker/api/services.ts`, self-service like discovery, with the same ETag/`Vary`/`private, no-cache` rules and the same `containsCredential` guard. Answer:

```json
{ "revision": "…", "services": [
  { "id": "stripe", "kind": "key", "name": "Stripe", "purpose": "Payments and refunds",
    "ready": true, "level": "read", "direct": true, "docs": "https://docs.stripe.com/api" },
  { "id": "mcp:notion", "kind": "mcp", "name": "Notion", "purpose": "Team notes and docs",
    "ready": false, "tools": 14, "connect": "https://…/apps/access/services/notion" },
  { "id": "mcp:linear", "kind": "mcp", "name": "Linear", "purpose": "Issues and projects",
    "ready": true, "using": { "who": "kim@example.com", "share": "read" }, "tools": 22,
    "connect": "https://…/apps/access/services/linear" } ],
  "needAccess": 2 }
```

Keys the caller holds a level for are listed; the rest are `needAccess`, a count. `?all=1` lists them too, each with `level: null`. The owner and Admins hold every key. Every MCP is listed, with no `level`. `ready` is `saved()` for a key; for an MCP, *the caller has a live sign-in, or a live shared one exists* (§8). `using` names whose sign-in a call would use and its share (`read` or `all`) when it isn't the caller's own. `connect` is the deep link (§4) whenever the caller has no sign-in of their own. An MCP's `purpose` is the server's `initialize` `instructions`, trimmed to one line, else empty. At most 200 entries. The `code` key, the stack's own, is left out. The helper adds `notes` (§1a).

`company-api.mjs services [--all] [--json]` prints one line per service (name, purpose, state, and a key's level or an MCP's *yours* / *Kim's, look-ups*), the notes path, and a `N more need access` line.

Alternative considered: deriving services by grouping `/api/actions` by key. Rejected: an unsaved key or an MCP nobody connected has no callable action, and those are the rows a chat needs to say *ask for it* or *connect*.

### 3. Three D1 tables, sign-ins sealed

New migration `schema/migrations/<ts>_mcp_connections.sql`, additive:

- `wong_mcp_servers`: `installation_id`, `id` (slug from name, unique per installation), `name`, `url`, `resource`, `authorize_endpoint`, `token_endpoint`, `registration` (sealed JSON keyed by redirect origin: `client_id`, optional `client_secret`), `scopes`, `tools_json`, `tools_at`, `instructions`, `added_by`, `added_at`.
- `wong_mcp_connections`: `installation_id`, `server_id`, `email`, `tokens` (sealed JSON: access, refresh, expiry), `account_label`, `connected_at`, `state` (`connected` | `reconnect`), `refresh_lease_until`, `share` (`none` | `read` | `all`, default `none`); primary key `(installation_id, server_id, email)`. A partial unique index on `(installation_id, server_id) WHERE share <> 'none'` keeps one shared sign-in per MCP.
- `wong_mcp_sign_ins`: `state`, `server_id`, `code_verifier` (sealed), `origin`, `email`, `created_at`; rows older than 10 minutes are ignored and swept on the next Connect.

Where Access removes a person (`employee-access/members.ts`, `removed`), the same batch deletes their `wong_mcp_connections` rows, so their share ends with them.

Sealing: AES-GCM with a 256-bit key from a new Worker secret `WONG_MCP_SEAL`, made by setup (random, never shown) and pushed with the other Worker secrets. It is not a key in the registry (Access never lists it); `scopedEnv` strips it from every route, and only `app/worker/mcp/` reads it, which `scripts/check-app-keys.mjs` enforces by name. This stops mistakes, not code written to get around it: handlers share one Worker, as the wiki already says of saved keys. Without the secret, the MCP routes answer `unavailable` and Services says the step left is the owner's.

Why not plain text, as ClaymooApp's `amazon_auth`: any mini app's handler can `SELECT` from the shared database by mistake. Why not KV: renewal needs an atomic compare-and-set.

### 4. Add, Connect, callback

Routes in `app/worker/mcp/routes.ts`. Any signed-in person may add an MCP and Connect, Disconnect or share their own row; Remove is the adder's while nobody else is connected, else the owner's or an Admin's:

| Route | Who | Does |
|---|---|---|
| `GET /api/mcp/servers` | signed in | Every row: id, name, url, connected count, the shared sign-in's person and share (if any), the caller's own state, account, date and share, tool count, and whether the caller may remove it. Never a token or secret. |
| `POST /api/mcp/servers` | signed in | Add: HTTPS only, no user-info or fragment; `initialize` with no token → `401` and `resource_metadata`, else `<origin>/.well-known/oauth-protected-resource`; auth-server metadata (`oauth-authorization-server`, then `openid-configuration`); require `registration_endpoint`, `S256`, `authorization_code`. Failure answers `422` with a plain reason and saves nothing. Saves `added_by`; returns the row and its `connect` link. At most 50 MCPs per installation. |
| `POST /api/mcp/servers/:id/connect` | signed in | Register for this origin if `registration` has none (`redirect_uris: [<origin>/api/mcp/callback]`, `token_endpoint_auth_method: "none"` when offered, else `client_secret_post`, `client_name` from the app's name); new state + PKCE; returns the authorize URL with `resource`, `scope` (`scopes_supported`), `code_challenge`. |
| `GET /api/mcp/callback` | the same person | Check state, age, email; swap the code; save the caller's sealed tokens; on the MCP's first connection, `initialize` once to read `instructions` and the tool list; redirect to the Services view. |
| `POST /api/mcp/servers/:id/share` | own row; owner/Admin to stop | Body `{ share: "none" \| "read" \| "all" }` on the caller's live row. Another person's live share answers `409` naming them. The owner or an Admin may set any row to `none`. |
| `POST /api/mcp/servers/:id/disconnect` | signed in | Delete the caller's own connection row, and with it any share. |
| `POST /api/mcp/servers/:id/refresh` | signed in, connected | Re-read the tool list with the caller's own sign-in. |
| `DELETE /api/mcp/servers/:id` | adder (no one else connected), owner/Admin | Delete the row and every connection in one batch. The adder with others connected gets `403` saying to ask the owner or an Admin. |

**Deep link.** `/apps/access/services/<id>` opens Services with that MCP's row in view and its Connect focused; with `?connect=1` it starts Connect at once (the browser still leaves for the service's own sign-in, so nothing happens without the person). The helper's `mcp add` and `services` print this link.

Registration per origin lets live, staging and each preview connect on their own (each return address differs). Each preview registers its own client at the service and each person signs in again there: fine for testing.

### 4a. Add from the chat

`company-api.mjs mcp add <address> [--name <name>]` calls `POST /api/mcp/servers` under the caller's login and prints the plain result and the `connect` link. The assistant finds a well-known service's MCP address from that service's own help pages, as it finds a key page today, and never guesses one.

### 4b. Bring in MCPs from Claude and Codex

`company-api.mjs mcp import [--yes]`, in `scripts/lib/mcp-import.mjs`, runs on the person's computer because the page can't read local files. It reads, never writes:

- Claude: `~/.claude.json` top-level `mcpServers` (user) and `projects["<this checkout>"].mcpServers` (local), plus the checkout's `.mcp.json` (project).
- Codex: `~/.codex/config.toml` `[mcp_servers.<name>]` (a small TOML table reader for that section, no new dependency; `$CODEX_HOME` respected).

Each entry becomes `{ name, url, from }` or a skip with a reason: `command`/`type: "stdio"` → *runs on this computer*; any `headers`, `env`, `bearer_token_env_var` or `http_headers` → *uses a fixed key* (values never read into output); `type: "sse"` → *uses an older connection the app doesn't speak*; an address already in `GET /api/mcp/servers` → *already added*; not HTTPS → refused. Without `--yes` it prints the offer (*Found Canva and Linear in Claude… Add them? Then press Connect on each.*) and the chat asks; with `--yes` it calls `POST /api/mcp/servers` once per name, under the caller's own login, and prints each result and its `connect` link.

`company-api.mjs mcp import --remove-local <name>` runs after the person's own Connect succeeds (it checks `services`): it prints the exact command, `claude mcp remove <name> -s <scope>` or `codex mcp remove <name>`, and runs it only with `--yes` after the chat asked. It never edits either settings file itself. A project-scope `.mcp.json` entry is shared through git, so it is named as a file edit for the normal save, not removed. Anyone signed in may run it, as for Add. `~/.claude/.credentials.json` and any Codex credential file are never opened: a sign-in is bound to the client that got it, so the app's own Connect is required anyway.

### 5. A lease guards renewal

`accessToken(env, serverId, email)` in `app/worker/mcp/auth.ts`, per connection row (a shared call renews the sharer's row the same way): more than 5 minutes left → use it. Otherwise one statement takes the lease (`UPDATE wong_mcp_connections SET refresh_lease_until = now+30s WHERE … AND (refresh_lease_until IS NULL OR refresh_lease_until < now) RETURNING tokens`); the winner renews and writes new tokens (keeping the old refresh token when none comes back), clearing the lease; a loser re-reads briefly and never calls the token endpoint. `invalid_grant` sets that row's `state = 'reconnect'` and clears its tokens; that person's calls answer `mcp_reconnect` with the `connect` link, and a teammate leaning on that share is told to connect their own.

### 6. Tools as operations

One saved tool list per MCP (`tools_json`), the same for every person. It is refreshed on the MCP's first connection, on a call naming a tool missing from it (once, with the caller's sign-in), and by Refresh. Search and `list` never contact an MCP. `discovery.ts` adds, for each MCP with a saved list, one operation per tool:

- `operationId` `mcp.<id>.<tool>`; `summary` the tool's `title` or first sentence of `description`; `description` the tool's description, bounded; `inputSchema` the tool's, passed through `refuseExternalReferences`; `effect` `read` when `annotations.readOnlyHint === true`, else `external`; `readiness` `available` when the caller's own sign-in is live, or a live share covers the tool (`all`, or `read` for a look-up), else `needs_connect`; `source: "mcp"`, `transport: "http"`, `app: "mcp:<id>"`, and no `keys` entry.
- `method: POST`, `path: /api/mcp/<id>/tools/<tool>`, `encoding: json`: the body is the tool's arguments, so `company-api.mjs call` needs no MCP branch.

`selectOperations` already searches `operationId`, `summary` and `description`, so `list --q canva design` finds them. The OpenAPI output includes them too. The discovery revision includes each MCP's `tools_at`, the caller's connection states and each MCP's share, so a refresh, a Connect or a share change moves the ETag.

### 7. The call route

`POST /api/mcp/:id/tools/:tool`: identity → MCP exists → pick the sign-in: the caller's own live row, else the live shared row → look-up or change from the cached list (missing tool → refresh once → still missing → change) → a shared `read` row refuses a change (`mcp_share_read_only`, naming the sharer, with the `connect` link) → call. No sign-in at all answers `mcp_not_connected` with the `connect` link; nothing is sent. A caller whose own row needs a new sign-in falls back to a share, and the answer says so. `app/worker/mcp/client.ts` speaks Streamable HTTP: `initialize` → `notifications/initialized` → `tools/call`, carrying `Mcp-Session-Id`, parsing JSON or SSE, `redirect: "manual"`, 60 s timeout, only to the row's `url`, answer bounded to 4 MB. An answer containing the access or refresh token it was sent is refused (`bad_answer`). A change that times out answers outcome unknown and is not resent. Each call writes the existing key-use log line with the caller, `as` (the sign-in's owner), key `mcp:<id>`, the tool as path, and look-up or change. The answer carries `via: "<sharer's email>"` when a share was used, so the helper can say whose it was.

### 8. Sharing a sign-in

No Access level gates an MCP: the service's own account permissions decide what a person's own sign-in can do. A person shares by setting `share` on their own row: `read` lets teammates with no own sign-in run look-up tools only, judged from the app's saved list; `all` lets them run every tool. Their own sign-in always wins for each teammate. One shared row per MCP (the partial unique index), so whose account a call uses is never ambiguous. Unticking, Disconnect, a reconnect state, a person's removal or an MCP's removal each end the share at once; the owner or an Admin can set any row to `none`. Services, `services` and each call's `via` say whose sign-in is in use.

Alternative considered: Access levels per MCP, reusing key grants as `mcp:<id>` (the earlier plan). Dropped on review: each person connects their own account, so the service already scopes them, and a level would be a second gate to set for every MCP.

### 8a. Short helper output

In `scripts/company-api.mjs`, applied to company, MCP and memory operations alike:

- `list` prints one line per match: `<id>  <read|change>  <readiness>  <summary>`, then `next: --offset N` when there are more. `--json` prints today's object unchanged.
- `describe` drops the shared `errorSchema` (named once in the service-catalogue page) and prints compact JSON; `--json` prints the full object.
- `call` prints the answer as JSON when it is at most 20 KB. A longer one is written whole to a private file (mode 0600, under the OS temp folder in a per-user `wong-answers/` directory, swept after 24 hours) and the helper prints `{ "truncated": true, "bytes": N, "file": "<path>", "preview": <first ~4 KB as text> }`, exit status unchanged. `--full` prints the whole answer as before. The CHANGELOG's Updating note tells a script reading large answers to add `--full`; `call` answers of 20 KB or less are unchanged, so most scripts need nothing.
- A failed call still exits non-zero and prints its error whole (errors are small).

Alternative considered: bounding answers only on a terminal. Rejected: chats run the helper without a terminal too, so the bound would never apply where it matters.

### 9. The always-read pointer

`AGENTS.md`'s credentials line becomes: *Credentials for this computer's own tools sit in the git-ignored `.env`…; for any business service or MCP, start with `node scripts/company-api.mjs services`, then `list --q`, `describe`, `call`.* The *Company actions* rule links the new `wiki/stack/service-catalogue.md`. It also says: *before using a key directly, read its notes page from `services`; add a call you worked out there.* No new skill: the line is always loaded, and a skill description can't name an MCP added at runtime.

### 10. Wiki pages

- `wiki/stack/service-catalogue.md` (new): the services list, search, describe, call, and service notes pages (§1a); takes over *Discover only what the task needs* from `company-api.md`, which keeps a one-line link (frees about 300 words).
- `wiki/stack/mcp-connections.md` (new): adding from the page, the chat and Claude/Codex; each person's Connect; sharing a sign-in and what *Look-ups only* allows; renewal, reconnect, what's stored and sealed; who can add and remove.
- `access-screens.md`: *Three views*, the Services view; replace *no list of apps, no list of keys* with *levels are set only where a person or role is opened; Services shows status, and each person's own MCPs*.
- `employee-access.md#key-levels`: MCPs take no level; removing a person deletes their sign-ins. `api-keys.md`: purpose and guide link. `secrets.md`: the tool-keys vs business-services split. `wiki/stack/README.md` links both new pages.

## UX

### Use-case brief

- **Who and job.** Anyone: *add Notion so I can use it*, *connect my own Notion*, *let the team look things up with my Linear*. The owner or an Admin also: *see which keys we have*, *stop a share*. Later: *see why a key isn't working*, *see who hasn't connected*.
- **Done.** The person's own state says Connected with their account and date; an unsaved key says what to ask for.
- **Context.** Mostly reached from a link in a chat, on a desk or a phone; every Access view stacks on a phone. Rare visits: once per MCP per person, plus one when a sign-in ends.
- **Common vs edge.** Common: open the link, Connect. Less common: Add (usually done by the assistant), sharing. Rare: Needs a new sign-in, Disconnect, Refresh, Remove, stopping a share, an Add that fails.
- **Closest screen.** Access's People view: same frame, view switch, add button at the end of the views' line, one-line rows that stack on a phone.

### Flow

Chat: *connect Notion* → the assistant adds it → link → Services opens on Notion with Connect focused → Connect → Notion's own sign-in → back on Services, *You: Connected*. A teammate's chat with no sign-in to use gives them the same link; one leaning on a share says whose. On the page: Add → address, name → Add → new row → Connect. A failed Add keeps the dialog open with the reason. From a chat: *bring in my MCPs* → offer → yes → rows appear → Connect on each → offer to remove from Claude or Codex. Sharing: tick *Let the team use my sign-in* on your own row → *Look-ups only* is chosen → it saves at once; untick to stop.

### Hierarchy

- **Services view (everyone).** Primary: *+ Add* (an MCP). An MCP row is name, *N connected* and any *Kim's shared* tag, then the viewer's own state; Connect, Connect again or *Connect mine* (when using a share) is its one primary button; Disconnect and Refresh are quiet buttons; Remove shows only to who may remove, behind Access's existing confirm.
- **Share box.** Under the viewer's own connected row: the checkbox, and when ticked the *Look-ups only* / *Everything* choice, saved on change. Another person's share disables the box with *Kim is sharing theirs*.
- **Keys group (owner/Admin only).** Above MCPs. A key row is name, purpose, status; *also used directly* and the key-link hint are muted. Owner/Admin also get a quiet *Stop sharing* on a shared row.
- **Deep link.** The row is scrolled into view and its Connect focused.
- **Add dialog.** Primary: Add. The error sits under the fields and keeps what was typed.
- **Empty.** *No MCPs yet* with Add and a line saying the assistant can do it.
- **Person/role panel.** Unchanged.

### Review

- The Services view for the owner and for a teammate, the Add dialog with its error, and the empty state: What Changes item 7, [review.html](review.html).
- Sharing a sign-in: What Changes item 6.
- Connecting from a chat: What Changes item 4.

### Components

Existing Access parts: `View` (gains a third entry in `VIEWS`), `Table`, `Labels`, `Confirm`, `Notices`, `Fields`. New: `Services.tsx` (the view) and `AddMcp.tsx` (the dialog, built from `Fields` and the app's dialog), because no existing view lists services.

## Risks / Trade-offs

- [Canva or Notion refuses the app's return address or rotates tokens unexpectedly] → task 1.1 proves registration and one sign-in round trip on a preview before the rest is built; *Needs a new sign-in* covers a broken chain with one button.
- [A service has no self-registration] → Add says so plainly; a client ID and secret through the key link is a later change.
- [Each teammate needs their own account at the service] → that is the point of per-person: the service's own permissions keep working. A teammate without a seat uses a share.
- [A share acts under the sharer's name] → *Look-ups only* is the default; *Everything* is the sharer's own choice; each call logs and answers whose sign-in it used; the sharer or the owner stops it in one click.
- [An MCP marks no tool as a look-up, so a look-ups-only share does nothing] → `describe` shows each tool's effect; the sharer can choose *Everything*, or teammates connect their own; an owner override is later.
- [The look-up mark is the MCP's own claim] → it only matters for a look-ups-only share, the sharer chose to trust that MCP by connecting it, and the app reads the mark from its own saved list, never from the caller.
- [Anyone can add an address, and a pasted one may point somewhere odd] → HTTPS only, at most 50 per installation, calls go only to the row's own address with no redirects, and nobody's sign-in goes to it until they press its Connect and sign in there themselves.
- [A fresh MCP session per call is slower] → two small extra requests; a session cache can come later.
- [The seal secret is lost or rotated] → stored sign-ins can't be opened; each person's row shows *Needs a new sign-in* and one Connect fixes it.
- [Stale tool list] → refreshed on a missing tool and by Refresh; a removed tool fails at the MCP with its own error.
- [A script reads a large `call` answer] → it gets the truncated envelope until it adds `--full`; the CHANGELOG says so.
- [A brought-in MCP stays in Claude] → its tools keep loading there; the offer to remove it is made once Connect succeeds.

## Migration Plan

1. Merge: Services shows the keys and *No MCPs yet*; nothing else changes for anyone. The update makes `WONG_MCP_SEAL` and pushes it with the other Worker secrets, so the install's sync plan carries no hand step.
2. On the live app, someone adds `https://mcp.canva.com/mcp` and each person connects their own Canva account; anyone without one can use a teammate's share.
3. Rollback: Disconnect clears a person's sign-in and Remove clears every one; the tables are additive and can stay.
4. ClaymooApp: pause PR #1543; its next `/wong-sync` brings this in; reconcile its `service-api.mjs mcp` plan against `company-api.mjs` then.
