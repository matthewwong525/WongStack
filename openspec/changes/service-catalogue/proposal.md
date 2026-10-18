# Every outside service in one list, and MCPs each person signs in to once

**Status:** in-progress
**Branch:** service-catalogue
**Open questions:** none

## Why

A chat has no quick way to see which outside services it can use or what each can do. It can search the app's own actions, but it can't list services, so it falls back on reading the long key list or the keys themselves. When it does call something, the whole answer lands in the chat, however long. Tools that offer an MCP, like Canva or Notion, can't be used through the app at all yet: their sign-in is personal and renews itself, so it can't sit in a shared key file.

## What Changes

- **One short list of the services you can use.** A chat asks once and gets each saved key you hold a level for and each MCP on the app, with a line saying what it's for and whether it's ready for you: your own sign-in, a teammate's shared one, or *connect yourself*. Keys you'd need access for show as one count, not a row each. The list stays the same short size however many tools each service has.
  ```text
  services
  ──────────────────────────────────────────
  Stripe   payments and refunds   ready  Read
  Notion   team notes and docs    connect yourself
  Canva    designs and templates  ready  yours
  Linear   issues and projects    ready  Kim's, look-ups
  2 more keys need access: ask the owner
  ```
- **Search across all of them, open one, and get short answers.** A chat searches by words and gets one line per match, from the app's own actions, a key used directly, or an MCP's tools. It opens only the one it needs to see what to fill in, then runs it. A long answer shows its first part in the chat and is saved whole to a file the chat can read from, so one big list of designs can't fill the chat.
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
- **Ask for an MCP in the chat; each person signs in once, as themselves.** Anyone on the team can say *connect Notion*: the assistant adds Notion's MCP to the app, with nothing to fill in, then sends a link straight to Notion's Connect button. You sign in at Notion, choose what to share, and come back to *Connected*. Your chat then uses Notion as you: it sees only what you can see there and acts under your name. The app renews every sign-in by itself, and no computer or chat ever holds one. A teammate's chat that has no sign-in to use says so and gives the same link.
  ```mermaid
  sequenceDiagram
    you->>assistant: connect Notion
    assistant->>app: add Notion's MCP
    assistant-->>you: link to Connect
    you->>Notion: sign in, Allow
    Notion-->>app: your sign-in
    app-->>you: Connected
    Note over app,Notion: renews by itself
  ```
- **Bring in the MCPs you already use in Claude or Codex.** Ask the assistant and it looks at this computer's Claude and Codex settings, finds the MCPs listed there by name and address, and offers to add them. Each one still needs Connect once: a sign-in belongs to the app that got it, so the assistant never reads or copies one. It skips MCPs that run on your computer and ones that use a fixed key, and says why. Once one is connected in the app, it offers to take it out of Claude or Codex, so its tools stop loading into every chat there.
  ```text
  ┌────────────────────────────────────────┐
  │ Found Canva and Linear in Claude, and  │
  │ Notion in Codex. Add them? Then press  │
  │ Connect on each.                       │
  │                                        │
  │ Skipped: Files (runs on this computer),│
  │ Sentry (uses a fixed key).             │
  └────────────────────────────────────────┘
  ```
- **Share your sign-in with the team, if you choose.** On your own connection, tick *Let the team use my sign-in* and pick *Look-ups only* (the default) or *Everything*. A teammate who hasn't connected their own then uses yours, and their chat says whose it is. Look-ups only means their chat can find and read but not post, edit or delete under your name. A teammate's own sign-in always comes first. One shared sign-in per MCP at a time. Untick it, disconnect, or leave the team, and it stops at once.
  ```text
  whose sign-in        │ look-up tools │ other tools
  ─────────────────────┼───────────────┼────────────
  your own             │ yes           │ yes
  shared, look-ups only│ yes           │ refused
  shared, everything   │ yes           │ yes
  none                 │ connect first │ connect first
  ```
- **A Services view in Access.** Beside People and Roles, everyone sees every MCP on the app: how many people are connected, whose sign-in is shared, and their own Connect, Disconnect and share box, plus Add. The owner and Admins also see every saved key: its name, what it's for, and whether it's saved, never its value. An unsaved key says to ask the assistant for its key link: new key values still come in only through that private link. The person who added an MCP can remove it while nobody else is connected; the owner or an Admin can remove any, and can stop anyone's sharing. Removing an MCP deletes everyone's sign-in for it, and can't be undone.
  ```text
  OWNER OR ADMIN
  ┌────────────────────────────────────────┐
  │ People 4   Roles 2   Services 5 [+Add] │
  │                                        │
  │ Keys                                   │
  │ Stripe · payments            Saved     │
  │ Notion API · team notes      Saved     │
  │   also used directly                   │
  │ Mailchimp · email        Not saved     │
  │   Ask the assistant for its key link   │
  │ ────────────────────────────────────── │
  │ MCPs                                   │
  │ Canva · 3 connected                    │
  │ You: ● Connected · Oct 18  Disconnect  │
  │ [ ] Let the team use my sign-in        │
  │ Linear · 1 connected · Kim's shared    │
  │ You: [ Connect ]   Stop sharing  Remove│
  │ Notion · 0 connected                   │
  │ You: [ Connect ]               Remove  │
  └────────────────────────────────────────┘
  ```
  ```text
  A TEAMMATE              ADD
  ┌────────────────────┐  ┌────────────────────┐
  │ Services    [+Add] │  │ Add an MCP         │
  │                    │  │ Address            │
  │ Canva              │  │ [https://mcp.…   ] │
  │ ● Connected        │  │ Name               │
  │ as kim · Oct 18    │  │ [Canva           ] │
  │ [x] Let the team   │  │   [Cancel]  [Add]  │
  │   use my sign-in   │  │ ! That address has │
  │   (•) Look-ups     │  │   no sign-in we    │
  │   ( ) Everything   │  │   can use.         │
  │ Linear             │  └────────────────────┘
  │ Using Kim's shared │
  │ [ Connect mine ]   │
  └────────────────────┘
  ```
  ```text
  NO MCPS YET
  ┌────────────────────────────────────────┐
  │ MCPs                                   │
  │ No MCPs yet. Ask the assistant to      │
  │ connect one, or add it by its address. │
  │                               [+ Add]  │
  └────────────────────────────────────────┘
  ```
- **Every chat knows where to start.** The always-read instructions name the services list as the first step for any outside service. The key file on your computer stays for this computer's own tools, so a chat no longer reads business keys from it.
  ```text
  BEFORE                       AFTER
  "check the key list file"   +"list services, search,
  → reads keys from the file    open one, run it"
                              → goes through the app
  ```

**Non-goals:** no form for typing a key into the page; no MCP that signs in with a fixed key; only an MCP's tools, not its prompts or files; ClaymooApp is not edited here. No Access levels for MCPs: each person's own account, or what a sharer allows, decides. **Later:** Access levels per MCP, if a team wants the owner to decide who may use one; MCPs that need an app made on the service's developer site, whose ID and secret would come in through the key link; the owner marking single tools as look-ups when an MCP marks none; the app itself as one MCP a chat connects to once, with four small tools (find, describe, look up, change), for chats with no terminal.

## Capabilities

### New Capabilities

- `mcp-connections`: adding remote MCPs (from the page, the chat, or Claude and Codex settings); each person's own sign-in, held and renewed by the app; sharing a sign-in with the team as look-ups only or everything; calling tools through the app; what the Services view shows.

### Modified Capabilities

- `agent-api-discovery`: a per-caller services list with notes pages, MCP tools in search and describe, short helper output, and the always-read pointer naming the services list.
- `key-access`: every key carries a purpose and, when used directly, its API guide.
- `secrets-convention`: the always-read credentials line separates this computer's tool keys from business services reached through the app.

## Impact

- **Worker:** new `app/worker/mcp/` (registration, per-person and shared sign-in, sealed token store, renewal lease, Streamable HTTP client, tool cache); new routes under `/api/mcp/` and `GET /api/services`; MCP tools added to `/api/actions` and `/api/openapi.json`; `app/worker/keys.ts` gains `purpose` and `docs`.
- **Schema:** new D1 migration for MCP servers, per-person sign-ins with their share setting, sign-in state and tool cache; Access's person removal also deletes that person's sign-ins.
- **Secrets:** one new setup-made Worker secret seals stored sign-ins; no route is handed it.
- **App screens:** a Services view in `app/src/apps/access/`, for everyone; no change to the person and role panels.
- **Helper:** `scripts/company-api.mjs services [--all]`; `mcp add <address>`; `list` prints one line per match (`--json` keeps today's shape); `call` prints at most about 20 KB and saves a longer answer to a file (`--full` prints it all); `company-api.mjs mcp import` reads `~/.claude.json` (user and this project's `mcpServers`), the project's `.mcp.json` and `~/.codex/config.toml` (`[mcp_servers]`) for names and addresses only, never `~/.claude/.credentials.json`, and after Connect offers `claude mcp remove` / `codex mcp remove`; `list`, `describe` and `call` cover MCP tools.
- **Docs:** `AGENTS.md`; service notes pages at `wiki/services/<id>.md`, made by chats in each install on first use (none ship); new `wiki/stack/mcp-connections.md` and `wiki/stack/service-catalogue.md` (discovery moves out of `company-api.md`, now at its word limit); `api-keys.md`, `access-screens.md`, `employee-access.md`, `secrets.md`; `CHANGELOG.md` minor entry.
- **Downstream:** ClaymooApp pauses its own MCP build (PR #1543) and takes this through its next update.

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
