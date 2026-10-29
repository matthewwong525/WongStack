# Hidden Inbox items

**Status:** ready-to-ship
**Branch:** inbox-hidden-items
**Open questions:** none

## Why

A chat sometimes needs a button that something else taps, with no page and no card in the Inbox. An example is a chat that watches a mini app: each Submit there must wake the chat, for hours, and the person must not see a card for it. WongOS built this for its email review; WongStack is the base of WongOS, so the feature comes here and WongOS drops its own copy.

## What Changes

- **A chat can put an item with no page in the Inbox.** It gives a title, the first line of each message, and its buttons. An open item of the same chat with the same title is replaced, not doubled.
  ```mermaid
  flowchart LR
    chat["chat"] -- "item --title …" --> inbox["Inbox item"]
    tap["a tap"] --> inbox --> chat
  ```
- **A hidden item shows no card.** The Inbox lists it nowhere, but a tap on it still reaches its chat.
- **A kept-open item stays open after a tap.** Each tap wakes the chat again and moves its close to its hours from that tap. When it runs out of time, the chat gets one stop message.
  ```mermaid
  flowchart LR
    tap1["tap"] --> wake1["chat woken, close moves"] --> tap2["tap"] --> wake2["chat woken, close moves"] --> out["time runs out"] --> stop["one stop message"]
  ```
- **Publishing a change no longer stops when a spec has the same name.** The publish check now asks for the change by its kind.

## Capabilities

### New Capabilities

### Modified Capabilities
- `reply-links`: a chat can put a file-less item, hidden or kept open, with a stop message.

## Impact

- `.claude/skills/hand-over/scripts/reply-link.mjs`: the `item` command with `--title`, `--hidden`, `--keep-open` and `--stop`; a kept-open item renews after each tap; a timed-out item with a stop message wakes its chat once; `PROTOCOL` 8 → 9.
- `app/worker/apps/inbox/item-put.ts` keeps `hidden`; `items.ts` lists no hidden item.
- `schema/migrations/20261101120000_inbox_hidden_items.sql`: an additive `hidden` column; listed in `payload-files.json` and the `inbox` area.
- `.claude/skills/ship/scripts/ship.mjs`: `openspec validate <name> --type change`.
- Tests: `app/tests/employee-access/connections.ts` loads the new migration; `scripts/tests/live-line.test.mjs` expects `PROTOCOL` 9; `scripts/tests/ship-commands.test.mjs` expects `--type change`; `app/worker/apps/inbox/api.test.ts`, `scripts/tests/reply-link-inbox.test.mjs`.
- `wiki/development/reply-links.md`: how to put an item with no page.
- Installs get it by their next sync: a `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-10-28** — Settled (Matthew): general WongOS features go up to WongStack; this one is WongOS's hidden Inbox items and its ship validate fix, built in WongOS by `email-review-ready`.
- **2026-10-28** — Assumed: the code comes over as WongOS has it, with the migration's comment made general, because WongOS has run it for days and the parity check needs the same files on both sides.
- **2026-10-28** — Assumed: a `minor` release, because it adds a command and a column.
- **2026-10-28** — Built: the full local pre-check could not get the shared check runner (other chats held it), so the touched parts ran alone: the Inbox worker tests (53 pass), `reply-link-inbox.test.mjs` (23 pass), payload links, retired names, memory areas and the context size all pass. The online checks decide.
- **2026-10-29** — Fixed: `live-line.test.mjs` expected the helper's `PROTOCOL` 8 in its hello; a failed assert left the helper running, so the test hung instead of failing. It now expects 9.
