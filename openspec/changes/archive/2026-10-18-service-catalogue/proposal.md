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
