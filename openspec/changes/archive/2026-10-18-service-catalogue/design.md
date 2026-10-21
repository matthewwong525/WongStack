# Design

## Context

See `proposal.md` for why. What shapes the build:

- **Discovery already exists for actions.** `app/worker/api/discovery.ts` serves `GET /api/actions` (bounded summaries, `q`/`app` filters, `id` for one contract) and `/api/openapi.json`, per caller, through `selectOperations` in `.agents/skills/memory/scripts/lib/operations.mjs`. `scripts/company-api.mjs list|describe|call` is the chat side. Direct-use keys already appear as `<key>.read` / `<key>.change` actions (`app/worker/api/forward.ts`).
- **Keys are static.** `app/worker/keys.ts` lists each key's `title`, `secrets`, `levels`, `forward`; there is no purpose or guide link. `keyCatalogue` (`employee-access/key-catalogue.ts`) feeds Access's panels.
- **Levels are stored by text id.** `wong_access_key_grants` and `wong_access_role_keys` hold `key_id` with no foreign key to the registry; `heldLevels` drops ids that `registered()` doesn't know. Owner, Admin and the preview checker get `everyKey()`.
- **`wiki/stack/company-api.md` is at 2,997 words**, against a 3,000-word page limit.
- **The helper prints everything.** `scripts/company-api.mjs` writes each result with `JSON.stringify(result, null, 2)`: a 20-row `list` is about 240 lines, `describe` repeats the full error schema, and `call` prints a direct-use answer of up to about 1 MB whole. Installs' skill scripts parse `call`'s JSON (`scripts/check-skill-actions.mjs`).
- **MCPs were tried and dropped.** The first build added MCP connections; on the preview, Canva refused the app's return address, and a test of 24 MCPs found 7 the app couldn't connect to ([evidence](evidence.md)). The MCP code, table, sealing secret and page come out in this change.

## Goals / Non-Goals

**Goals:**

- One per-caller list of the key-based services a person can use, bounded in size, from one helper command.
- Helper output that keeps the chat small: one line per match, a bounded answer with the rest in a file.
- Each key says what it is for and where its guide is, and grows a notes page from use.
- A Services view listing every key's status for the owner and Admins.

**Non-Goals:**

- MCP connections of any kind (see Context).
- A curated list of each REST service's endpoints (the guide link and notes pages cover it).
- Any edit to ClaymooApp.
- The app as one MCP a chat connects to once, with four tools (find, describe, look up, change): a later change (advice of 2026-10-13, memory fact #1521). Search plus `describe` keeps definitions out of the chat until then.

## Decisions

### 1. Keys gain `purpose` and `docs`

`Key` in `app/worker/keys.ts` gains required `purpose` (one line, ≤ 80 chars) and optional `docs` (HTTPS URL to the service's public API guide), required when `forward` is set. `keys.test.ts` enforces both and names the key. The supplied `cloudflare` and `code` entries get purposes, and `cloudflare` links Cloudflare's API docs. `wiki/stack/api-keys.md#a-saved-key-shows-in-access` tells the assistant to fill both when it registers a key, from the service's own help pages.

### 1a. A notes page per key-based service

What a chat learns about a service's endpoints lives in the install's wiki at `wiki/services/<id>.md`, one page per key id; `wiki/services/README.md` is the hub, made with the first page and linked from the wiki root, as `people/` is. The Worker can't see the checkout, so `company-api.mjs services` adds `notes: { path, exists }` to each `kind: "key"` row from the local checkout. A page starts as the `#` title, the purpose line and the guide link; a chat adds each call it worked out (method, path, the inputs that mattered, a pitfall) and saves it through the normal wiki save. The guide stays the source; notes are what earlier chats proved works. No key values, sign-ins or customer data: the wiki rules already hold this. Nothing ships; the meta-repo has no service keys.

Alternative considered: keeping notes in memory. Rejected: they are repeatable knowledge by [the wiki's test](../../../wiki/wiki-style.md#repeatable-knowledge), and a wiki page is curated, not superseded.

### 2. `GET /api/services`, beside `/api/actions`

A new handler in `app/worker/api/services.ts`, self-service like discovery, with the same ETag/`Vary`/`private, no-cache` rules and the same `containsCredential` guard. Answer:

```json
{ "revision": "…", "services": [
  { "id": "stripe", "name": "Stripe", "purpose": "Payments and refunds",
    "ready": true, "level": "read", "direct": true, "docs": "https://docs.stripe.com/api" } ],
  "needAccess": 2 }
```

Only keys the caller holds a level for are listed; the rest are `needAccess`, a count. `?all=1` lists them too, each with `level: null`. The owner and Admins hold every key, so they see everything. `ready` is `saved()`. At most 200 entries. The `code` key, the stack's own, is left out. The helper adds `notes` (§1a).

`company-api.mjs services [--all] [--json]` prints one line per service (name, purpose, state, level), the notes path, and a `N more need access` line.

Alternative considered: deriving services by grouping `/api/actions` by key. Rejected: an unsaved key has no callable action, and that is the row a chat needs to say *ask for it*.

### 3. Short helper output

In `scripts/company-api.mjs`, applied to company and memory operations alike:

- `list` prints one line per match: `<id>  <read|change>  <readiness>  <summary>`, then `next: --offset N` when there are more. `--json` prints today's object unchanged.
- `describe` drops the shared `errorSchema` (named once in the service-catalogue page) and prints compact JSON; `--json` prints the full object.
- `call` prints the answer as JSON when it is at most 20 KB. A longer one is written whole to a private file (mode 0600, under the OS temp folder in a per-user `wong-answers/` directory, swept after 24 hours) and the helper prints `{ "truncated": true, "bytes": N, "file": "<path>", "preview": <first ~4 KB as text> }`, exit status unchanged. `--full` prints the whole answer as before. The CHANGELOG's Updating note tells a script reading large answers to add `--full`; `call` answers of 20 KB or less are unchanged, so most scripts need nothing.
- A failed call still exits non-zero and prints its error whole (errors are small).

Alternative considered: bounding answers only on a terminal. Rejected: chats run the helper without a terminal too, so the bound would never apply where it matters.

### 4. The always-read pointer

`AGENTS.md`'s credentials line becomes: *Credentials for this computer's own tools sit in the git-ignored `.env`…; for any business service, start with `node scripts/company-api.mjs services`, then `list --q`, `describe`, `call`.* The *Company actions* rule links the new `wiki/stack/service-catalogue.md`. It also says: *before using a key directly, read its notes page from `services`; add a call you worked out there.* No new skill: the line is always loaded.

### 5. Removing the MCP build

Delete `app/worker/mcp/`, `app/tests/mcp.ts`, the MCP parts of `discovery.ts`, `index.ts`, `members.ts` and `seed.sql`, `AddMcp.tsx` and `app/src/apps/access/mcp.ts`, `scripts/lib/mcp-import.mjs` and its test, the helper's `mcp` commands, the `20261018040000_mcp_connections.sql` migration, and `wiki/stack/mcp-connections.md`. Remove `WONG_MCP_SEAL` from setup (`private-access.mjs`, `provision.mjs`), `cf-secrets.mjs`, `check-app-keys.mjs` and `.dev.vars.example`. Nothing shipped, so no name goes in `retired-names.json`. Keep the parts the key list uses: `purpose`/`docs`, `services.ts`, the Services view, short helper output, and `employee-bootstrap.mjs`'s bounded answers. The test copy's own `WONG_MCP_SEAL`, its MCP tables and its two MCP rows are removed by hand, with the person's go-ahead.

### 6. Wiki pages

- `wiki/stack/service-catalogue.md` (new): the services list, search, describe, call, short output and `--full`, and service notes pages (§1a); takes over *Discover only what the task needs* from `company-api.md`, which keeps a one-line link (frees about 300 words).
- `access-screens.md`: *Three views*, the Services view; replace *no list of apps, no list of keys* with *levels are set only where a person or role is opened; Services shows each key's status*.
- `api-keys.md`: purpose and guide link. `secrets.md`: the tool-keys vs business-services split. `employee-access.md`: no MCP text. `wiki/stack/README.md` links the new page.

## UX

### Use-case brief

- **Who and job.** The owner or an Admin: *see which keys we have and which are missing*. Later: *see why a key isn't working*.
- **Done.** Each key shows Saved, or what to ask for.
- **Context.** Rare visits, on a desk or a phone; every Access view stacks on a phone.
- **Common vs edge.** Common: glance at the list. Edge: no keys yet.
- **Closest screen.** Access's People view: same frame, view switch, one-line rows that stack on a phone.

### Flow

Owner opens Access → Services → reads each key's state → for a missing one, asks the assistant, which sends the key link. Levels: open a person or role, as today.

### Hierarchy

- **Services view.** No primary button: it is a status list. A key row is name, purpose, status; *also used directly* and the key-link hint are muted.
- **Empty.** *No keys yet* with a line saying the assistant sends a key link.
- **Teammate.** No Services entry in the view switch.

### Review

- The Services view and its empty state: What Changes item 4, [review.html](review.html).

### Components

Existing Access parts: `View` (a third entry in `VIEWS`, owner/Admin only), `Table`, `Labels`, `Notices`. New: `Services.tsx`, because no existing view lists keys.

## Risks / Trade-offs

- [A script reads a large `call` answer] → it gets the truncated envelope until it adds `--full`; the CHANGELOG says so.
- [A notes page goes stale when a service changes its API] → the guide link stays beside it, and a chat that finds a call broken fixes the page in the next wiki save.
- [The purpose line is wrong or vague] → the assistant writes it from the service's own help pages when it registers the key; `keys.test.ts` checks it exists and is short.
- [Removing the MCP build misses a piece] → the app's full coverage, `check-app-keys.mjs` and a search for `mcp` and `WONG_MCP_SEAL` in live files catch leftovers.

## Migration Plan

1. Merge: Services shows each key's status to the owner and Admins; nothing else changes on screen. No new secret and no table.
2. Each install adds a purpose line (and a guide link for a directly used key) to any key it registered; the update's Updating note says so.
3. Rollback: the change adds no data; revert the release.
