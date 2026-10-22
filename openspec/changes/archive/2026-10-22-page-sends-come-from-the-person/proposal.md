# Page sends arrive as your own message, not from another chat

**Status:** planned
**Branch:** suave-husky
**Open questions:** none

## Why

When you tap *Send* on a page the assistant made, such as a plan's review page, the chat gets your words as a message from another chat: *[Message received] <a chat's title>*. That title belongs to whichever chat first opened a page on this computer, in any repo, so every later send looks like it came from that chat. The chat, and anything that tells your word from a chat's, can't see it was you. WongOS found and fixed this on 2026-10-22 (its pull request #178), and this brings the fix here.

## What Changes

- **A page's send shows as yours.** Notes, *Build it*, a form's answers and an inbox tap all arrive in the chat as your own message, the same as if you typed them. No other chat's name goes with them.
  ```mermaid
  flowchart LR
    tap[Send] --> server[page server]
    server -->|before| other[from first chat]
    server -->|after| you[from you]
  ```
- **The fix takes over at once after an update.** The next page that opens on your computer replaces the page server still running from older code. Every open link keeps its address, so nothing you have open stops working. The inbox's own helper is replaced the same way the next time a plan goes to the inbox.
- **The reply-links page says so.** [Reply links](../../../wiki/development/reply-links.md) gains one line: a send arrives in the chat as your own message.

Non-goals: no change to which chat a page reaches, its fixed first line, its limits, or its buttons. No change to a private link's pages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reply-links`: a page's send and an inbox tap reach the chat as the person's own message, never under another chat's name; a page server or inbox helper from older code is replaced on the next open, keeping open links at their addresses.

## Impact

- `.agents/skills/hand-over/scripts/lib/wake.mjs`: `wakeChat` runs `paseo send` with an env that has no `PASEO_AGENT_ID` or `PASEO_AGENT_CWD`. Every caller gets it: `reply-link.mjs` (page server and inbox helper) and `hand-over.mjs`.
- `.agents/skills/hand-over/scripts/reply-link.mjs`: `PROTOCOL` 3 → 4; `inbox.json` records the protocol, and `startInbox` replaces an inbox helper from older code.
- Tests: `scripts/tests/reply-link.test.mjs` (wake env; swap sends with no agent id), `scripts/tests/reply-link-inbox.test.mjs` (older inbox helper replaced); `scripts/tests/fixtures/fake-tunnel.mjs`'s `fakePaseo` can record the env it ran with.
- Wiki: `wiki/development/reply-links.md`, one line.
- `CHANGELOG.md`: a patch entry, no hand step.

## Decision log

- **2026-10-22** — Asked (settled before planning) whether to bring WongOS's fix here → chose yes: `wakeChat` drops the chat's own id from `paseo send`, and the page server's protocol goes from 3 to 4.
- **2026-10-22** — Asked (settled before planning) when to publish → ask Matthew before publishing or merging.
- **2026-10-22** — Assumed: WongStack's existing tests in `scripts/tests/` get the new checks, not WongOS's two new test files, because WongStack already tests the wake and the server swap there and a second copy goes stale.
- **2026-10-22** — Assumed: the inbox's helper process, which WongOS lacks, is replaced too when it runs older code, because it also wakes chats with the opener's id and could keep doing so for a day or more after an update; Matthew wants a fix to be whole, not partial.
- **2026-10-22** — Assumed: the docs fix is one added line in `reply-links.md`, because no WongStack page says a page's send arrives from another chat; the wrong sentence lived only in WongOS's `wiki/daily.md`.
- **2026-10-22** — Assumed: a patch release, because it fixes a bug and adds nothing new to do.
- **2026-10-22** — Asked, after the second look found that a stale inbox record could stop an unrelated program and that a tap during the one-time swap could be lost → chose to keep the swap and replace only a process confirmed to be the inbox helper, accepting the rare lost tap.
