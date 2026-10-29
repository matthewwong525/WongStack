# Proposal

**Status:** ready-to-ship
**Branch:** one-private-link-per-chat
**Open questions:** none

## Why

One chat's `/close` can close a key link that another chat sent you. You open the link, and it is already gone. On 2026-10-25 this happened four times in one evening on Matthew's computer. Each time, a key link closed about 3 seconds after a different chat finished its `/close`. The cause: the computer keeps one private link for all chats, so a close from any chat closes it. Any WongStack user who runs more than one chat at a time can hit this.

## What Changes

- **Each chat gets its own private link.** A key link, password link, or private form from one chat stays open while another chat opens, waits on, or closes its own. A chat's `/close` closes only that chat's link.
  ```mermaid
  sequenceDiagram
    participant A as Chat A
    participant B as Chat B
    participant You
    A->>You: Key link
    B->>B: /close closes its own link
    Note over A,You: Chat A's key link stays open
    You->>A: Key saved, chat A wakes
  ```
- **Two chats can each have a link open at the same time.** One chat's link no longer blocks another. In one chat, a new key link still replaces that chat's earlier key link if nobody opened it, as today.
- **One live view on the computer, as today.** The browser has one screen, so a second live view still can't open. The message now names the chat that holds it, such as *A live view is already open in modest-toad.*
- **A link that is open during the update keeps working.** It stays open until it closes. Only the chat that opened it can wait on it or close it.

Non-goals: no change to what a private link shows, how long it stays open, or its safety.

## Capabilities

### New Capabilities

- `private-links`: how many private links can be open at once, per chat and on the computer, and what a blocked open says.

### Modified Capabilities

- `secrets-convention`: the key link's "one link at a time" becomes "one link per chat".

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: link files move from `~/.wong-stack/hand-over/` to `~/.wong-stack/hand-over/links/<chat>/`; the timing record stays shared.
- `scripts/tests/hand-over.test.mjs`: fixture paths follow the chat folder; new tests for per-chat links.
- `wiki/development/browsing.md`, `secrets.md`, `passwords.md`, `private-form.md`, `live-view.md`: wording for one link per chat.
- `.agents/skills/memory/references/areas.json`, `CHANGELOG.md`: new spec in the browser area; a `minor` release.
- Ported from WongOS, where it shipped on 2026-10-21 (matthewwong525/WongOS#170) and has run since. ClaymooApp and other installs get it at their next `/wong-sync`.

## Decision log

- **2026-10-26** — Asked (settled before planning) whether to send the fix to WongStack → chose to plan it, and to send nothing to WongStack or ClaymooApp until Matthew says yes on this plan.
- **2026-10-26** — Assumed: send WongOS's whole per-chat link change, not only a `close` that checks the chat, because a shared single link also lets one chat block another, and the per-chat version has run in WongOS since 2026-10-21. This replaces, for this one change, the 2026-10-23 choice to keep per-chat links in WongOS only.
- **2026-10-26** — Assumed: plan it as a `minor` release with a new `private-links` spec, because it is new behavior and the payload rule makes a new spec a release.
- **2026-10-26** — Assumed: leave out the two later WongOS requirements (a page's send comes from the person; links in the Inbox), because WongStack already has them in its `reply-links` and `inbox` specs.
- **2026-10-28** — Asked: Matthew said yes: general WongOS features go up to WongStack, and chose `/ship` for this part, so this change builds and publishes without another stop.
- **2026-10-28** — Assumed: the per-chat tests go in their own `scripts/tests/private-links.test.mjs`, since their fixture differs from `hand-over.test.mjs`'s; that file's fixture moves to the chat's folder.
- **2026-10-28** — Assumed: fix a gap the per-chat test found in WongOS too: `wait` looks for the watcher before it reads the result, so a result that lands as the watcher ends is read, not reported as *No private link is open*. The test also gives `wait` 1.5 s to start, not 0.3 s.
- **2026-10-28** — Assumed: the live view's screen folder stays in the computer's shared place, not the chat's folder. A long chat folder name made the screen's socket path pass Linux's 108-character limit, so the view failed to start. One view per computer means the folder needs no chat.
- **2026-10-28** — Archived as 44.20.0 inside `/ship`; the WongOS copy leaves its differences list at the next `/wong-sync`.
