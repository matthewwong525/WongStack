# Another chat's browser turn never stops your chat

**Status:** ready-to-ship
**Branch:** browser-turn-never-blocks
**Open questions:** none

## Why

One chat could not use its own browser tab for an hour. Other chats had live views open that nobody was using. Every click, page read and address read in this chat was refused, and its wait for "the turn to end" ran until it was killed. Each chat has its own tab, so one chat must never wait for another chat's turn.

## What Changes

- **Your chat's own tab always works.** While the person has a turn in another chat's tab, this chat reads, clicks, types and resizes in its own tab at once. Nothing waits for the other turn to end, and no step is refused because of it. Today a click on a part of a page that takes no key waits for the turn to end, and every later step on that page is refused until then.
  ```mermaid
  flowchart TD
    T["Turn open in chat A's tab"] --> B["Chat B clicks in its own tab"]
    B --> R["Click runs now"]
    R --> F{"Did chat A's tab leave the front?"}
    F -->|no| D[Done]
    F -->|yes| P["Chat A's tab comes back to the front"]
    P --> D
  ```
- **The person's tab stays in front.** When a step in another tab has to show that tab, such as a resize or the password manager's list, the 🔔 tab the person was on comes back to the front at once after the step. With several 🔔 tabs, the one the person picked comes back. Another chat's *front* or *show* answers *behind* and leaves the person's tab in front.
- **No more waiting clicks.** A click never waits, so *wait-click* has nothing to wait for. It stays as a command that finishes at once, so older chat scripts keep working. Against an older running browser that still makes a click wait, *wait-click* stops after 3 minutes with a clear message, not after an hour.
- **A fix to the browser starts by itself.** The shared browser keeps running between chats, so a fix could wait days to start. A browser whose own scripts changed since it started now stops by itself once no chat has a tab open in it. The next browser command starts the new version. A browser that a chat is using is never stopped.

**Non-goals:** how several turns share the window or a live view; the turn's 60-second lease; a second plain turn, which is still refused.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: another chat's turn no longer holds a chat's own steps; the turn only keeps its tab in front. An idle browser whose scripts changed stops by itself.

## Impact

- `.agents/plugins/browser/scripts/browser-server.mjs`: drop the waiting click (`clickBehind`, `keyClick`, the watcher, `tab.waiting`, `WAITING`), `awaitTurn` and the refusals it caused; put the shown turn's page back after another tab's step; a plain `front` during another turn answers `behind`; `GET /tabs/:id/click` always answers `none`; an idle stop once its scripts changed.
- `.agents/plugins/browser/scripts/browse.mjs`, `connect-browser.mjs`: `wait-click` bounded to 3 minutes; `BROWSE_FRONT=behind`; help text.
- `.agents/plugins/browser/skills/hand-over/scripts/hand-over.mjs`: a watch link whose tab stays behind another turn opens nothing, as before.
- `.agents/plugins/browser/SKILL.md`, `references/browser-window.md`, `references/browsing.md`, `skills/hand-over/references/live-view.md`, `wiki/stack/connect-your-tools.md`.
- The browser module's `VERSION`; `CHANGELOG.md`.
- Tests: `browser-server.test.mjs`, `browse.test.mjs`, `connect-browser.test.mjs`, `hand-over.test.mjs`, and the stand-in server.

## Decision log

- **2026-11-13** — Asked when another chat's open turn should stop holding the browser → chose: it should never stop another chat from doing its work; the turn only keeps its tab in front.
- **2026-11-13** — Assumed: reads (page text, address, picture) never wait or get refused, because they change nothing the person sees.
- **2026-11-13** — Assumed: a plain `front` or `show` from another chat during a turn answers ok with `behind` and leaves the person's tab in front, because taking the screen mid-sign-in could send the person's typing to the wrong site.
- **2026-11-13** — Assumed: turns keep today's rules among themselves: shared turns stand side by side, and a second plain turn is still refused, because that is the person's attention, not another chat's work.
- **2026-11-13** — Assumed: after another tab's step, only a turn's page that showed before the step comes back; with none shown, nothing comes forward, because in a window the person may have picked another tab on purpose, and a turn never takes the page by itself.
- **2026-11-13** — Assumed: a step on a tab that holds a turn of its own puts no other turn's tab back, because the live view fits the 🔔 tab the person picked, and that fit shows it.
- **2026-11-13** — Assumed: the browser stops itself when idle after its scripts changed, also when the same scripts in the primary checkout changed, because the rule "never restart a running browser for an update" would otherwise keep the old, blocking code running, and a merge never changes a linked worktree's files.
- **2026-11-13** — Assumed: `wait-click` stays as a command, because older checkouts and skill text still call it.
- **2026-11-13** — Archived for release 61.4.0; the browser specs now hold the rewritten turn rules and the new idle-update requirement.
