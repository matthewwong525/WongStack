<!-- openspec-archive v1 2026-10-18-service-catalogue -->
<!-- file proposal.md utf8 15328 -->
# Every key-based service in one list, with short answers

**Status:** ready-to-ship
**Branch:** service-catalogue
**Open questions:** none

## Why

A chat has no quick way to see which outside services it can use or what each can do. It can search the app's own actions, but it can't list services, so it falls back on reading the long key list or the keys themselves. When it does call something, the whole answer lands in the chat, however long.

## What Changes

- **One short list of the services you can use.** A chat asks once and gets each saved key you hold a level for, with a line saying what it's for, whether it's ready, and what your level lets you do. Keys you'd need access for show as one count, not a row each. The list stays the same short size however many actions each service has.
  ```text
  services
  ──────────────────────────────────────────
  Stripe   payments and refunds   ready  Read
  Notion   team notes and docs    ready  Read & write
  2 more need access: ask the owner
  ```
- **Search, open one, and get short answers.** A chat searches by words and gets one line per match, from the app's own actions or a key used directly. It opens only the one it needs to see what to fill in, then runs it. A long answer shows its first part in the chat and is saved whole to a file the chat can read from, so one big list can't fill the chat.
  ```mermaid
  flowchart TD
    list --> search --> open --> run
    run --> short["short answer, or a file"]
  ```
- **Each saved key says what it's for, where its guide is, and what earlier chats learned.** When the assistant saves a key, it adds one line about what the service does and a link to the service's own API guide. Each key-based service also gets a notes page in the wiki, linked from its row in the services list. A chat that works out a call writes it there, so the next chat starts from the notes, not the guide. The first chat to use a service makes its page, with just the purpose line and the guide link to start.
  ```mermaid
  flowchart TD
    row["Notion row"] --> notes{notes page?}
    notes -->|yes| use["use the calls"]
    notes -->|no| guide["read the guide"]
    guide --> write["write the page"]
  ```
- **A Services view in Access.** Beside People and Roles, the owner and Admins see every key on one list: its name, what it's for, whether it's saved, and whether it's also used directly, never its value. An unsaved key says to ask the assistant for its key link: new key values still come in only through that private link. Levels are still set only where a person or role is opened.
  ```text
  OWNER OR ADMIN
  ┌────────────────────────────────────────┐
  │ People 4   Roles 2   Services 3        │
  │                                        │
  │ Stripe · payments            Saved     │
  │ Notion API · team notes      Saved     │
  │   also used directly                   │
  │ Mailchimp · email        Not saved     │
  │   Ask the assistant for its key link   │
  └────────────────────────────────────────┘
  ```
  ```text
  NO KEYS YET
  ┌────────────────────────────────────────┐
  │ No keys yet. Ask the assistant to      │
  │ connect a service; it sends you a      │
  │ private link for the key.              │
  └────────────────────────────────────────┘
  ```
- **Every chat knows where to start.** The always-read instructions name the services list as the first step for any outside service. The key file on your computer stays for this computer's own tools, so a chat no longer reads business keys from it.
  ```text
  BEFORE                       AFTER
  "check the key list file"   +"list services, search,
  → reads keys from the file    open one, run it"
                              → goes through the app
  ```

**Non-goals:** no form for typing a key into the page; no MCPs. A test of 24 popular MCPs found Canva, Intercom and Figma let only apps they approved sign in, and Asana, HubSpot, GitHub and Box need an app made on their developer site first, so an MCP connection in the app could not reach every service ([evidence](evidence.md)). ClaymooApp is not edited here. **Later:** the app itself as one MCP a chat connects to once, with four small tools (find, describe, look up, change), for chats with no terminal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-api-discovery`: a per-caller services list with notes pages, short helper output, and the always-read pointer naming the services list.
- `key-access`: every key carries a purpose and, when used directly, its API guide; Access lists every key's status for the owner and Admins.
- `secrets-convention`: the always-read credentials line separates this computer's tool keys from business services reached through the app.

## Impact

- **Worker:** `GET /api/services`; `app/worker/keys.ts` gains `purpose` and `docs`.
- **App screens:** a Services view in `app/src/apps/access/` for the owner and Admins; no change to the person and role panels.
- **Helper:** `scripts/company-api.mjs services [--all]`; `list` prints one line per match (`--json` keeps today's shape); `call` prints at most about 20 KB and saves a longer answer to a file (`--full` prints it all).
- **Docs:** `AGENTS.md`; service notes pages at `wiki/services/<id>.md`, made by chats in each install on first use (none ship); new `wiki/stack/service-catalogue.md` (discovery moves out of `company-api.md`, now at its word limit); `api-keys.md`, `access-screens.md`, `secrets.md`; `CHANGELOG.md` minor entry.
- **Downstream:** ClaymooApp no longer gets MCPs from this change; whether to resume its own MCP build (PR #1543) is its own decision.

## Decision log

- **2026-10-18** — Asked how MCP connections come into WongStack → chose to build them here now, not bring ClaymooApp's in later.
- **2026-10-18** — Asked how a chat learns what a directly used service can do → chose a one-line purpose and a link to the service's API guide per key.
- **2026-10-18** — Asked where the page for keys and MCPs goes → chose a new view in Access.
- **2026-10-18** — Asked how Access decides who may use each MCP → chose a level per MCP.
- **2026-10-18** — Asked what happens to ClaymooApp's MCP build → chose to pause it and take WongStack's through the next update.
- **2026-10-18** — Assumed: the view is called Services and the chat command `services`, because one word for both lets a person and a chat mean the same list.
- **2026-10-18** — Assumed: everyone sees every MCP in Services with their own Connect, and keys stay for the owner and Admins, because each person now connects their own MCPs.
- **2026-10-18** — Assumed: MCP tools join the existing action search and helper (`list`, `describe`, `call`) rather than a separate `mcp` command, because one search across everything is what was asked for.
- **2026-10-18** — Assumed: stored MCP sign-ins are sealed with a setup-made Worker secret no route is handed, because every mini app shares the app's database and could otherwise read them.
- **2026-10-18** — Assumed: each copy of the app (live, staging, a preview) keeps its own MCP list and connects on its own, because the service registers each copy's return address separately.
- **2026-10-18** — Assumed: search uses a saved copy of each MCP's tool list, refreshed on Connect, on a call naming a tool it lacks, and by a Refresh button, never during a search, because a search that sometimes calls out and renews a sign-in is slow and unpredictable.
- **2026-10-18** — Assumed: Canva's sign-in from the app is tried first, before the rest is built, because no copy of the app has done it yet.
- **2026-10-18** — Asked how a chat learns a key-based service's endpoints (review note) → chose the guide link plus a wiki notes page per key-based service, linked from its row in `services`, where a chat writes the calls it worked out.
- **2026-10-18** — Assumed: a notes page starts with just the purpose line and the guide link, and a chat makes it the first time it uses the service, because the wiki grows from use and seeds nothing.
- **2026-10-18** — Assumed: notes pages live at `wiki/services/<id>.md`, with `wiki/services/README.md` made with the first one, because they are each install's own knowledge, not WongStack's.
- **2026-10-18** — Asked whether MCPs a person already has in Claude or Codex can move into the app (review note) → chose to add it here: offer the MCPs listed in this computer's Claude and Codex settings by name and address, each still connected once, skipping ones that run on the computer or use a fixed key, with the reason.
- **2026-10-18** — Assumed: the reading happens in the chat's helper, which sends the chosen names and addresses to Add, because the browser page can't read files on the computer.
- **2026-10-18** — Assumed: an MCP already added (same address) and one that only speaks the older event-stream connection are skipped with the reason, because adding either would fail or duplicate a row.
- **2026-10-18** — Asked whether MCP tools show up pre-loaded in the chat (review note) → chose to search them as planned, and later make the app itself one MCP with four small tools (find, describe, look up, change), recorded as a follow-up and not built here.
- **2026-10-18** — Asked whether the app should be one MCP, for progressive disclosure and context → chose to keep the helper as the main path (no tool descriptions loaded up front, answers trimmed before the chat reads them, scripts can use it) and build the one app MCP later, for chats with no terminal.
- **2026-10-18** — Asked whether to fold in the design review (short answers, one-line lists, removing brought-in MCPs from Claude and Codex, listing only usable services, no refresh during search, honest sealing promise, look-up override later) → chose to fold them in.
- **2026-10-18** — Asked whether MCP sign-in is per person or shared → chose per person first, so each chat sees only what its person can see and acts as them; keys stay shared; a Shared choice per MCP comes later.
- **2026-10-18** — Asked whether teammates have their own Canva logins → chose yes, so Canva works per person and needs no shared choice now.
- **2026-10-18** — Asked whether to split the work into two changes → chose to keep one change.
- **2026-10-18** — Assumed: the assistant can add an MCP from the chat (`mcp add`) and send a link that opens straight on that MCP's Connect, because *connect Notion* should need no pasting.
- **2026-10-18** — Assumed: `call` prints at most about 20 KB and saves a longer answer to a private file, with `--full` for scripts, and `list` prints one line per match with `--json` for today's shape, because answers and lists are where chat space goes.
- **2026-10-18** — Assumed: removing a brought-in MCP from Claude or Codex uses their own `mcp remove` commands after the person agrees, because editing their settings files by hand could break them.
- **2026-10-18** — Assumed: the services list shows only keys you hold a level for (and every MCP), with a count of the other keys and `--all` to see them, because rows you can't use cost space and say little.
- **2026-10-18** — Assumed: one saved tool list per MCP, read with any live sign-in, because an MCP's tools are the same for everyone and a list per person would multiply the refreshes.
- **2026-10-18** — Assumed: the sealing is promised as stopping mistakes, not code written to get around it, because every mini app runs in the same Worker, as the wiki already says of saved keys.
- **2026-10-18** — Asked (review note on change #6) whether MCPs need Access levels → chose no: each person connects their own MCPs, which replaces the per-MCP level chosen earlier.
- **2026-10-18** — Asked whether a person can share their sign-in in this build → chose yes: a *Let the team use my sign-in* box on their own connection.
- **2026-10-18** — Asked what a teammate's chat can do with a shared sign-in → chose the sharer decides: *Look-ups only* (the default) or *Everything*.
- **2026-10-18** — Asked who can add an MCP → chose anyone signed in; the adder, the owner or an Admin can remove it.
- **2026-10-18** — Assumed: one shared sign-in per MCP at a time, and a person's own sign-in always comes before a shared one, because two shared sign-ins would make whose account a call uses unpredictable.
- **2026-10-18** — Assumed: the person who added an MCP can remove it only while nobody else is connected, and the owner or an Admin can remove any MCP and stop anyone's sharing, because a removal deletes teammates' sign-ins.
- **2026-10-18** — Assumed: each call records whose sign-in it used, because with sharing a call can act as someone other than the caller.
- **2026-10-18** — Assumed: the Canva sign-in proof (task 1.1) moves to the first preview, after the build, because a sign-in round trip needs a published copy and the owner's browser; its public half, reading what Canva and Notion offer for sign-in, ran first and fits the build ([evidence](evidence.md)).
- **2026-10-18** — Assumed: the new MCP connections spec joins the `worker` area at this save, once its main spec exists, because the areas test needs the file to be there.
- **2026-10-18** — Asked, after Canva refused the app's return address and a test of 24 MCPs found 3 that allow only approved apps and 4 that need a developer-site app, whether to keep MCPs → chose to drop MCPs from this change and keep only the key-based services list, short answers, notes pages and the pointer, because a connection that can't reach every service isn't worth it.
- **2026-10-18** — Assumed: the Services view stays, listing keys for the owner and Admins only, because the brief asked for one page listing saved keys, and with no MCPs a teammate has nothing of their own to see there.
- **2026-10-18** — Assumed: the MCP code, its table, its sealing secret and its wiki page are removed rather than left unused, and the test copy's own seal and MCP rows are cleaned up with the person's go-ahead, because nothing else needs them.
- **2026-10-18** — Assumed: the earlier choice to pause ClaymooApp's own MCP build no longer follows from this change, because WongStack ships no MCPs now; that is ClaymooApp's call.
- **2026-10-18** — Assumed: the test copy's MCP tables, rows, migration record and seal secret were cleared by hand after the rebuild, because the option chosen on the review page included clearing them.
- **2026-10-18** — Archived for release 43.5.0 by `/ship`; every task checked, local checks passing after main was brought in.
- **2026-10-18** — Archive checkpoint: the preview walk kept two checks (the owner opens Services; a chat lists services). The changed publish check stayed unverified: the push needs a person's sign-in the test login cannot give.

<!-- end proposal.md -->
<!-- file design.md utf8 10642 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 4494 -->
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

<!-- end tasks.md -->
<!-- file specs/agent-api-discovery/spec.md utf8 3967 -->
## MODIFIED Requirements

### Requirement: Agent context is selective and available by default

Every install SHALL give its agents a short always-read instruction that names the services list as the first step for any outside service, then search, describe and call. An agent SHALL be able to list every service it can reach, list relevant action summaries and load the full contract and local schema dependencies for a selected action. The entire schema SHALL NOT be required in every session's starting context. Newly published contracts and newly saved keys SHALL be discoverable without manual employee prompt updates.

#### Scenario: A task needs company information

- **WHEN** an employee asks their agent to do work covered by a described company action
- **THEN** the agent has instructions to find that action, load its contract and call the company endpoint rather than request the business key

#### Scenario: The catalogue grows

- **WHEN** many described actions are available
- **THEN** the helper can return bounded filtered summaries and just the selected action's full schema

#### Scenario: A key is saved

- **WHEN** the owner saves a Notion key through its key link
- **THEN** a chat's next services list names Notion without any instruction or skill being edited

## ADDED Requirements

### Requirement: The services list names the services a caller can use

The helper and the company endpoint SHALL return, for the signed-in caller, one bounded entry per registered key the caller holds a level for: its id, name, one-line purpose, whether it is saved, their level, and for a key used directly the link to its service's API guide. Other keys SHALL appear as one count, and the full list SHALL be available on request, each entry marked as needing access. Its size SHALL not grow with the number of operations a service has, and it SHALL contain no key value. The helper SHALL add to each key-based entry the checkout path of that service's notes page and whether the page exists yet.

#### Scenario: A chat lists services

- **WHEN** a person with Stripe at Read, Notion at Read but not saved, and no Mailchimp level lists services
- **THEN** Stripe shows ready at Read, Notion says to ask for its key link, and Mailchimp is only counted among services that need access

#### Scenario: A service has notes

- **WHEN** `wiki/services/notion.md` exists and a chat lists services
- **THEN** the Notion entry links that page, and an entry with no page names the path to make

### Requirement: Chats keep notes on each key-based service

The always-read instructions SHALL tell an agent that uses a key-based service directly to read its notes page first, and, after working out a call the page lacks, to add that call there in the next wiki save. The first agent to use a service with no page SHALL make it with only the purpose line and the guide link, plus what it learned. No notes page SHALL hold a key value, a sign-in, or a customer's data, and WongStack SHALL ship no notes page.

#### Scenario: The second chat uses Notion

- **WHEN** an earlier chat recorded how to search Notion pages and a new chat needs to search Notion
- **THEN** the new chat uses the recorded call without opening Notion's guide

### Requirement: The helper keeps lists and answers short in the chat

By default the helper SHALL print one line per search match and a bounded first part of a long answer, saving the whole answer to a private file it names, so one call cannot fill the chat. A script SHALL be able to ask for the full structured list and the whole answer in the output, as before.

#### Scenario: A long answer

- **WHEN** a chat runs a Stripe search whose answer is 2 MB
- **THEN** the chat sees the first part and the path of a private file holding the whole answer

#### Scenario: A script needs the whole answer

- **WHEN** a skill's script runs the same call asking for the full answer
- **THEN** it gets the whole answer as JSON on its output

<!-- end specs/agent-api-discovery/spec.md -->
<!-- file specs/key-access/spec.md utf8 1411 -->
## ADDED Requirements

### Requirement: Every key says what it is for

Every registered key SHALL carry a one-line purpose, and a key set up for direct use SHALL also carry a link to its service's public API guide. The checks SHALL fail before publishing on a key with no purpose, or a direct-use key with no guide link or one that is not HTTPS.

#### Scenario: A key is added without a purpose

- **WHEN** a change registers a Stripe key with a title and secrets but no purpose
- **THEN** the checks fail and name the Stripe key

### Requirement: Access lists every key's status without its value

Access SHALL give the owner and Admins a Services view beside People and Roles, listing every registered key with its name, purpose, whether it is saved and whether it is also used directly. The view SHALL show no key value and no level, and SHALL offer no place to type a key; an unsaved key SHALL say to ask the assistant for its key link. A person who manages nothing SHALL NOT see the view.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services with Stripe saved and Mailchimp not saved
- **THEN** Stripe shows Saved, Mailchimp says to ask for its key link, and no value is on the screen

#### Scenario: A teammate looks for Services

- **WHEN** a teammate who manages nothing opens Access
- **THEN** no Services view is offered and the Services address shows them nothing about keys

<!-- end specs/key-access/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 1004 -->
## MODIFIED Requirements

### Requirement: Agents find credentials without asking

The `WONG-STACK` block SHALL tell agents that `.env.example` is the map of variables and the primary worktree's git-ignored `.env` (or the stack's equivalent) holds the values for this computer's own tools, and that a business service is reached through the app, starting from the services list. It SHALL link the wiki's secrets page rather than restate it. The wording SHALL stay true in a target that renamed its dotenv file, and SHALL NOT link a file the target may not have.

#### Scenario: A task needs a token

- **WHEN** an agent runs a script that needs a credential already present in `.env`
- **THEN** it uses that value and neither asks the person for it nor stubs the call

#### Scenario: A task needs a business service

- **WHEN** an agent needs to look something up in a business service the app holds a key for
- **THEN** it lists services and calls through the app instead of reading the key from a file

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-18

~~~
<!-- end .openspec.yaml -->
<!-- file evidence.md utf8 4486 -->
# Evidence: service-catalogue

What each MCP's public sign-in metadata returned, read without signing in or registering. No token, client or account detail is kept here.

## Discovery (task 1.1, public half), 2026-10-18

Each address answered an unsigned `initialize` with `401` and a `WWW-Authenticate` header naming its metadata, as `app/worker/mcp/discover.ts` expects.

| | Canva `https://mcp.canva.com/mcp` | Notion `https://mcp.notion.com/mcp` |
|---|---|---|
| Metadata named in `WWW-Authenticate` | `/.well-known/oauth-protected-resource/mcp` | the same |
| `resource` | `https://mcp.canva.com/mcp` | `https://mcp.notion.com/mcp` |
| Sign-in server | `https://mcp.canva.com` | `https://mcp.notion.com` |
| Scopes offered | 16, from `profile:read` to `brandkit:read` | `default` |
| `authorize` / `token` / `register` | `/authorize`, `/token`, `/register` | the same |
| PKCE | `plain`, `S256` | `S256` |
| Grants | `authorization_code`, `refresh_token`, JWT bearer | the same |
| Client sign-in at `token` | `none`, `client_secret_post`, `client_secret_basic` | the same |

Both pass Add's checks; the app registers each as a public client (`none`) and asks for every scope the MCP lists.

## Still to prove on the first preview

Registration's answer, one sign-in round trip at Canva in the owner's browser, the token lifetime, whether the refresh token rotates, `readOnlyHint` coverage and the tool-list size: task 1.1, with the walk in task 8.2.

## Return addresses on the preview, 2026-10-18

The owner pressed Connect for Canva on the preview and Canva answered `Invalid redirect URI.` at `/authorize`. A probe then registered throwaway public clients with different return addresses and opened `/authorize` for each, without signing in:

| Return address | Canva `/register` | Canva `/authorize` | Notion `/authorize` |
|---|---|---|---|
| `https://<preview>.workers.dev/api/mcp/callback` | accepted | `400 Invalid redirect URI.` | `302` to Notion's sign-in |
| `https://example.com/callback`, `https://claymoo.com/api/mcp/callback` | accepted | `400 Invalid redirect URI.` | not tried |
| `http://localhost:<port>/callback`, `http://127.0.0.1:<port>/callback` | accepted | `302` to Canva's sign-in | not tried |
| `https://claude.ai/api/mcp/auth_callback` | accepted | `302`, marked `mcp_client_type=ClaudeConnector` | not tried |

Canva registers any address but signs in only to the computer's own address or an app it has approved, so no install's web address can connect it. Notion takes the preview's address. Add's checks cannot see this: registration succeeds, and only `/authorize` refuses.

## Which popular MCPs let a web app sign in, 2026-10-18

The same probe on 24 public MCP addresses: register a throwaway client with the preview's return address, then open `/authorize` without signing in. An opened sign-in page is not a finished round trip.

- **Sign-in page opens (14):** Notion, Linear, Atlassian, Sentry, Stripe, PayPal, Square, Webflow, Monday, Wix, Supabase, Cloudflare, Zapier, Airtable.
- **Approved apps only (3):** Canva (`/authorize` refuses), Intercom (`/register` answers `invalid_redirect_uri`), Figma (`/register` answers `403`).
- **No self-registration (4):** Asana, HubSpot, GitHub, Box: they need an app made on the service's developer site, the plan's later step.
- **Unclear (3):** Klaviyo's page didn't read clearly; Vercel and Shopify didn't answer as MCPs at the guessed address.

## Keys-only build on the preview, 2026-10-18 (task 7.3)

Run at `e6ca8c7` on the preview, signed in as the verification login, which is the owner there:

- `services` and `services --all` print one row: Cloudflare, its purpose, *not saved yet: ask the owner*, the notes path `wiki/services/cloudflare.md` (none yet) and its guide link.
- `list --q cloudflare` prints one line: `cloudflare.read  read  unavailable  Look something up in Cloudflare`; `list --limit 50` prints 7 lines.
- `call memory.search` with 100 results: a 32,894-byte answer prints a 4,238-byte envelope (`truncated`, `bytes`, `file`, `preview`); the file is mode `600` in a `700` folder; `--full` prints all 32,895 bytes. A 5,994-byte answer prints whole.
- Access → Services, on a desk and a phone: the Cloudflare row shows its purpose, the API guide link, *Not saved* and *Ask the assistant to finish Access setup*, with no value.
- A teammate's view isn't reachable on a preview, where the verification login is the owner; `Services.test.tsx` and `App.test.tsx` cover it.

<!-- end evidence.md -->
<!-- file review.html utf8 72380 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-18-service-catalogue</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--ink); --pele-muted:var(--muted); --pele-line:var(--ink); --pele-border:var(--line); --pele-surface:#fff; --pele-surface-alt:var(--fill); --pele-accent:var(--ink); }
  .art.pic svg { display:block; width:100%; height:auto; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-18-service-catalogue">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-18-service-catalogue</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A chat has no quick way to see which outside services it can use or what each can do. It can search the app's own actions, but it can't list services, so it falls back on reading the long key list or the keys themselves. When it does call something, the whole answer lands in the chat, however long.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One short list of the services you can use.</b> A chat asks once and gets each saved key you hold a level for, with a line saying what it's for, whether it's ready, and what your level lets you do. Keys you'd need access for show as one count, not a row each. The list stays the same short size however many actions each service has.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">services</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">──────────────────────────────────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">Stripe   payments and refunds   ready  Read</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Notion   team notes and docs    ready  Read &amp; write</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">2 more need access: ask the owner</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Search, open one, and get short answers.</b> A chat searches by words and gets one line per match, from the app's own actions or a key used directly. It opens only the one it needs to see what to fill in, then runs it. A long answer shows its first part in the chat and is saved whole to a file the chat can read from, so one big list can't fill the chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-2-picture-1" tabindex="0" style="width:15.769em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 205 448" width="205" height="448" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_list_search_0"><path d="M102.47,56L102.47,97"/><path class="pele-marker" d="M102.47,104L99.11,96L105.83,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_search_open_0"><path d="M102.47,152L102.47,193"/><path class="pele-marker" d="M102.47,200L99.11,192L105.83,192Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_open_run_0"><path d="M102.47,248L102.47,289"/><path class="pele-marker" d="M102.47,296L99.11,288L105.83,288Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_run_short_0"><path d="M102.47,344L102.47,385"/><path class="pele-marker" d="M102.47,392L99.11,384L105.83,384Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="list" transform="translate(102.47,32)"><rect x="-27.78" y="-24" width="55.55" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">list</text></g><g class="pele-node pele-shape-rect" data-id="search" transform="translate(102.47,128)"><rect x="-42.01" y="-24" width="84.02" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">search</text></g><g class="pele-node pele-shape-rect" data-id="open" transform="translate(102.47,224)"><rect x="-35.79" y="-24" width="71.58" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">open</text></g><g class="pele-node pele-shape-rect" data-id="run" transform="translate(102.47,320)"><rect x="-29.56" y="-24" width="59.12" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">run</text></g><g class="pele-node pele-shape-rect" data-id="short" transform="translate(102.47,416)"><rect x="-94.47" y="-24" width="188.94" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">short answer, or a file</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Each saved key says what it's for, where its guide is, and what earlier chats learned.</b> When the assistant saves a key, it adds one line about what the service does and a link to the service's own API guide. Each key-based service also gets a notes page in the wiki, linked from its row in the services list. A chat that works out a call writes it there, so the next chat starts from the notes, not the guide. The first chat to use a service makes its page, with just the purpose line and the guide link to start.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-3-picture-1" tabindex="0" style="width:24.615em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 320 427" width="320" height="427" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_row_notes_0"><path d="M156.27,56L156.27,97"/><path class="pele-marker" d="M156.27,104L152.91,96L159.63,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_notes_use_0"><path d="M148.27,196.04C148.27,208.79 70.46,208.79 70.46,221.54L70.46,267.04"/><path class="pele-marker" d="M70.46,274.04L67.1,266.04L73.82,266.04Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_notes_guide_0"><path d="M164.27,196.04C164.27,208.79 242.07,208.79 242.07,221.54L242.07,267.04"/><path class="pele-marker" d="M242.07,274.04L238.71,266.04L245.43,266.04Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_guide_write_0"><path d="M242.07,322.04L242.07,363.04"/><path class="pele-marker" d="M242.07,370.04L238.71,362.04L245.43,362.04Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_notes_use_0"><rect x="55.57" y="223.54" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="70.46" y="238.94" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_notes_guide_0"><rect x="230.29" y="223.54" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="242.07" y="238.94" text-anchor="middle">no</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="row" transform="translate(156.27,32)"><rect x="-56.23" y="-24" width="112.46" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Notion row</text></g><g class="pele-node pele-shape-diam" data-id="notes" transform="translate(156.27,152.52)"><polygon points="0,-48.52 77.63,0 0,48.52 -77.63,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">notes page?</text></g><g class="pele-node pele-shape-rect" data-id="use" transform="translate(70.46,298.04)"><rect x="-62.46" y="-24" width="124.93" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">use the calls</text></g><g class="pele-node pele-shape-rect" data-id="guide" transform="translate(242.07,298.04)"><rect x="-69.14" y="-24" width="138.29" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">read the guide</text></g><g class="pele-node pele-shape-rect" data-id="write" transform="translate(242.07,394.04)"><rect x="-68.25" y="-24" width="136.5" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">write the page</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A Services view in Access.</b> Beside People and Roles, the owner and Admins see every key on one list: its name, what it's for, whether it's saved, and whether it's also used directly, never its value. An unsaved key says to ask the assistant for its key link: new key values still come in only through that private link. Levels are still set only where a person or role is opened.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">OWNER OR ADMIN</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌────────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ People 4   Roles 2   Services 3        │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│                                        │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Stripe · payments            Saved     │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ Notion API · team notes      Saved     │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│   also used directly                   │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ Mailchimp · email        Not saved     │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│   Ask the assistant for its key link   │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">└────────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-11" tabindex="0">NO KEYS YET</span>
<span class="ln" data-note="item-4-line-12" tabindex="0">┌────────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">│ No keys yet. Ask the assistant to      │</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">│ connect a service; it sends you a      │</span>
<span class="ln" data-note="item-4-line-15" tabindex="0">│ private link for the key.              │</span>
<span class="ln" data-note="item-4-line-16" tabindex="0">└────────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Every chat knows where to start.</b> The always-read instructions name the services list as the first step for any outside service. The key file on your computer stays for this computer's own tools, so a chat no longer reads business keys from it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">BEFORE                       AFTER</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">&quot;check the key list file&quot;   +&quot;list services, search,</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">→ reads keys from the file    open one, run it&quot;</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">                            → goes through the app</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> no form for typing a key into the page; no MCPs. A test of 24 popular MCPs found Canva, Intercom and Figma let only apps they approved sign in, and Asana, HubSpot, GitHub and Box need an app made on their developer site first, so an MCP connection in the app could not reach every service (<a href="evidence.md">evidence</a>). ClaymooApp is not edited here. <b>Later:</b> the app itself as one MCP a chat connects to once, with four small tools (find, describe, look up, change), for chats with no terminal.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked how MCP connections come into WongStack → chose to build them here now, not bring ClaymooApp's in later.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked how a chat learns what a directly used service can do → chose a one-line purpose and a link to the service's API guide per key.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked where the page for keys and MCPs goes → chose a new view in Access.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked how Access decides who may use each MCP → chose a level per MCP.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked what happens to ClaymooApp's MCP build → chose to pause it and take WongStack's through the next update.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the view is called Services and the chat command <code>services</code>, because one word for both lets a person and a chat mean the same list.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: everyone sees every MCP in Services with their own Connect, and keys stay for the owner and Admins, because each person now connects their own MCPs.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: MCP tools join the existing action search and helper (<code>list</code>, <code>describe</code>, <code>call</code>) rather than a separate <code>mcp</code> command, because one search across everything is what was asked for.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: stored MCP sign-ins are sealed with a setup-made Worker secret no route is handed, because every mini app shares the app's database and could otherwise read them.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: each copy of the app (live, staging, a preview) keeps its own MCP list and connects on its own, because the service registers each copy's return address separately.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: search uses a saved copy of each MCP's tool list, refreshed on Connect, on a call naming a tool it lacks, and by a Refresh button, never during a search, because a search that sometimes calls out and renews a sign-in is slow and unpredictable.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: Canva's sign-in from the app is tried first, before the rest is built, because no copy of the app has done it yet.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked how a chat learns a key-based service's endpoints (review note) → chose the guide link plus a wiki notes page per key-based service, linked from its row in <code>services</code>, where a chat writes the calls it worked out.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: a notes page starts with just the purpose line and the guide link, and a chat makes it the first time it uses the service, because the wiki grows from use and seeds nothing.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: notes pages live at <code>wiki/services/&lt;id&gt;.md</code>, with <code>wiki/services/README.md</code> made with the first one, because they are each install's own knowledge, not WongStack's.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether MCPs a person already has in Claude or Codex can move into the app (review note) → chose to add it here: offer the MCPs listed in this computer's Claude and Codex settings by name and address, each still connected once, skipping ones that run on the computer or use a fixed key, with the reason.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the reading happens in the chat's helper, which sends the chosen names and addresses to Add, because the browser page can't read files on the computer.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: an MCP already added (same address) and one that only speaks the older event-stream connection are skipped with the reason, because adding either would fail or duplicate a row.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether MCP tools show up pre-loaded in the chat (review note) → chose to search them as planned, and later make the app itself one MCP with four small tools (find, describe, look up, change), recorded as a follow-up and not built here.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether the app should be one MCP, for progressive disclosure and context → chose to keep the helper as the main path (no tool descriptions loaded up front, answers trimmed before the chat reads them, scripts can use it) and build the one app MCP later, for chats with no terminal.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether to fold in the design review (short answers, one-line lists, removing brought-in MCPs from Claude and Codex, listing only usable services, no refresh during search, honest sealing promise, look-up override later) → chose to fold them in.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether MCP sign-in is per person or shared → chose per person first, so each chat sees only what its person can see and acts as them; keys stay shared; a Shared choice per MCP comes later.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether teammates have their own Canva logins → chose yes, so Canva works per person and needs no shared choice now.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether to split the work into two changes → chose to keep one change.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the assistant can add an MCP from the chat (<code>mcp add</code>) and send a link that opens straight on that MCP's Connect, because <i>connect Notion</i> should need no pasting.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: <code>call</code> prints at most about 20 KB and saves a longer answer to a private file, with <code>--full</code> for scripts, and <code>list</code> prints one line per match with <code>--json</code> for today's shape, because answers and lists are where chat space goes.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: removing a brought-in MCP from Claude or Codex uses their own <code>mcp remove</code> commands after the person agrees, because editing their settings files by hand could break them.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the services list shows only keys you hold a level for (and every MCP), with a count of the other keys and <code>--all</code> to see them, because rows you can't use cost space and say little.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: one saved tool list per MCP, read with any live sign-in, because an MCP's tools are the same for everyone and a list per person would multiply the refreshes.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the sealing is promised as stopping mistakes, not code written to get around it, because every mini app runs in the same Worker, as the wiki already says of saved keys.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked (review note on change #6) whether MCPs need Access levels → chose no: each person connects their own MCPs, which replaces the per-MCP level chosen earlier.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked whether a person can share their sign-in in this build → chose yes: a <i>Let the team use my sign-in</i> box on their own connection.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked what a teammate's chat can do with a shared sign-in → chose the sharer decides: <i>Look-ups only</i> (the default) or <i>Everything</i>.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked who can add an MCP → chose anyone signed in; the adder, the owner or an Admin can remove it.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: one shared sign-in per MCP at a time, and a person's own sign-in always comes before a shared one, because two shared sign-ins would make whose account a call uses unpredictable.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the person who added an MCP can remove it only while nobody else is connected, and the owner or an Admin can remove any MCP and stop anyone's sharing, because a removal deletes teammates' sign-ins.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: each call records whose sign-in it used, because with sharing a call can act as someone other than the caller.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the Canva sign-in proof (task 1.1) moves to the first preview, after the build, because a sign-in round trip needs a published copy and the owner's browser; its public half, reading what Canva and Notion offer for sign-in, ran first and fits the build (<a href="evidence.md">evidence</a>).</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the new MCP connections spec joins the <code>worker</code> area at this save, once its main spec exists, because the areas test needs the file to be there.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked, after Canva refused the app's return address and a test of 24 MCPs found 3 that allow only approved apps and 4 that need a developer-site app, whether to keep MCPs → chose to drop MCPs from this change and keep only the key-based services list, short answers, notes pages and the pointer, because a connection that can't reach every service isn't worth it.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the Services view stays, listing keys for the owner and Admins only, because the brief asked for one page listing saved keys, and with no MCPs a teammate has nothing of their own to see there.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the MCP code, its table, its sealing secret and its wiki page are removed rather than left unused, and the test copy's own seal and MCP rows are cleaned up with the person's go-ahead, because nothing else needs them.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the earlier choice to pause ClaymooApp's own MCP build no longer follows from this change, because WongStack ships no MCPs now; that is ClaymooApp's call.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the test copy's MCP tables, rows, migration record and seal secret were cleared by hand after the rebuild, because the option chosen on the review page included clearing them.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-18</p>Archived for release 43.5.0 by <code>/ship</code>; every task checked, local checks passing after main was brought in.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-18</p>Archive checkpoint: the preview walk kept two checks (the owner opens Services; a chat lists services). The changed publish check stayed unverified: the push needs a person's sign-in the test login cannot give.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'picture' ? 'picture ' + m[4] : m[3] ? 'drawing line ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    const parts = el.classList.contains('pic') ? Array.prototype.map.call(c.querySelectorAll('text'), function (n) { return n.textContent; }) : [c.textContent];
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
