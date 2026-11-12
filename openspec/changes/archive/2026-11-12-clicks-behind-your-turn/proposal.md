# Another chat's click goes on behind your turn

**Status:** archived
**Branch:** quick-goat
**Open questions:** none

## Why

While you use the agent's browser in one chat's tab, every other chat that wants to click waits up to 20 seconds, then gives up with *the person is using the browser*. A sign-in or a payment often takes longer than that, so the other chats stop working. Their typing already goes on behind your tab; only their clicks stop.

## What Changes

- **A click on a button or a link goes on behind your tab.** During your turn, another chat presses its button or link by key in its own tab, as you would with Tab and Enter. The page acts the same as on a mouse click, and your tab stays in front. A tick box or a choice gets Space. A site's own custom button counts when the site marks it as a button.
  ```mermaid
  sequenceDiagram
    participant You
    participant Browser as Browser window
    participant Chat as Other chat
    You->>Browser: Sign in on your tab
    Chat->>Browser: Click Send, in its own tab
    Note over Browser: Pressed by key, behind your tab
    Browser-->>Chat: Done at once
    Note over You,Browser: Your tab stays in front
  ```
- **A target that takes only a mouse waits for your turn to end.** Some page parts react to a mouse and to no key, such as a plain clickable box. The chat hears at once that its click waits. The click then runs by itself when you hand back, and the chat hears that it ran. The chat takes no other step on that page before then, so nothing happens out of order.
  ```mermaid
  sequenceDiagram
    participant You
    participant Browser as Browser window
    participant Chat as Other chat
    Chat->>Browser: Click a mouse-only box
    Browser-->>Chat: Waits for your turn
    You->>Browser: Hand back, or say done
    Browser->>Browser: Runs the click
    Browser-->>Chat: The click ran
  ```
- **Nothing changes when no one has a turn.** With no turn open, a click is a normal mouse click, as today. Your own chat still sends nothing to your tab during your turn.

**Non-goals:** a window for each chat (it could steal focus on a Mac and cover the live view on a server); a change to how a resize, or opening the password manager's page, waits during your turn.

## What the build needs

- **Nothing from you.** The build tests on a throwaway browser on this server. You chose to run the Mac check after it goes live: the chat leaves it as an open item.

## Capabilities

### New Capabilities

### Modified Capabilities

- `browser-logins`: *Browsing tasks share the personal browser* says how another task's click works during the person's turn: by key behind the person's tab, or waiting for the turn to end when the target takes only a mouse.

## Impact

- `.agents/skills/browser/scripts/browser-server.mjs`: the click route during another tab's turn presses by key or queues; a tab's other steps refuse while its click waits; a new route waits for a queued click; the idle reaper keeps a tab with a waiting click.
- `.agents/skills/browser/scripts/browse.mjs`: `click` prints `BROWSE_CLICK=key` or `BROWSE_CLICK=queued`; a new `wait-click` command.
- `.agents/skills/connect/scripts/browser.mjs`: the connect flow's click says at once when it waits, and a new `wait-click` command reports it; `wiki/stack/connect-your-tools.md` lists it.
- `.agents/skills/browser/SKILL.md`: one line on `BROWSE_CLICK=queued`.
- `wiki/development/browser-window.md`: *Your turn keeps its tab in front*.
- `scripts/tests/browser-server.test.mjs`, `scripts/tests/browse.test.mjs`, `scripts/tests/connect-browser.test.mjs`, `scripts/tests/fixtures/fake-camofox-server.mjs`, `scripts/tests/manual/browser-tabs-real.mjs`.
- `CHANGELOG.md`: a `## Next (minor)` entry.
- Overlap: the 1Password change (workspace big-ladybug) also edits `browser-server.mjs`, `browse.mjs`, and their tests; the browser-module change (workspace rare-octopus) moves `.agents/skills/browser/`. Whichever publishes second catches up.

## Decision log

- **2026-11-11** — Asked (settled before planning) whether each chat gets its own window → chose one window with a tab per chat, because a window per chat would likely steal focus on a Mac and cover the live view on a server.
- **2026-11-11** — Asked (settled before planning) how a click goes on during another tab's turn → chose focus plus Enter, or Space where that is the control's key, in the chat's own tab; only a target that ignores the keyboard waits in a queue until the turn ends.
- **2026-11-11** — Asked whether a site's own custom-made buttons go by key → chose by key when the site marks it as a button (or link, tab, menu item, tick box, switch, or choice) and the keyboard can reach it; a plain mouse-only box waits.
- **2026-11-11** — Asked when the Mac check runs → chose after it goes live: the server check gates the build, and the Mac check stays an open item.
- **2026-11-11** — Assumed: the queued click answers at once with `BROWSE_CLICK=queued`, and the chat learns the outcome from `browse.mjs wait-click` run in the background, because a turn can last 8 hours, longer than any one command may block; a background command wakes the chat when it ends.
- **2026-11-11** — Assumed: while a click waits, every other step on that chat's tab is refused at once, because a read or a key before the click would act on the page out of order.
- **2026-11-11** — Assumed: with no turn open, a click stays the mouse click it is today, because the mouse path has the overlay and forced-click fallbacks the key path lacks.
- **2026-11-11** — Assumed: a resize and opening the password manager's page keep today's 20-second wait, because the request names clicks only, and both must show their tab.
- **2026-11-11** — Assumed: a target the key path can not focus (hidden, disabled, or covered) waits like a mouse-only target, because the mouse path's forced and script fallbacks may still reach it after the turn.
- **2026-11-11** — Assumed: the manual check `browser-tabs-real.mjs` names the screen with `--display` on Linux when `DISPLAY` is set, and keeps `--window` elsewhere, because the library's start on Linux reads no `DISPLAY` of its own and failed with *no DISPLAY* under Xvfb.
- **2026-11-11** — Assumed: `wait-click` on a tab that closed before its click ran prints `BROWSE_ERROR=this task's tab closed before its click ran` (exit 1), because the click never ran, and `none` would read as nothing pending.
- **2026-11-11** — Assumed: the connect flow's `click` waits for a queued click through `waitClick()` before it says `Done`, because a `Done` while the click waits leaves the tab refusing every later step, and nothing claims the click.
- **2026-11-11** — Assumed: `wait-click` on a tab gone with a 404 prints `BROWSE_CLICK=none` unless the session's tab file records a queued click, because the idle reaper also closes a tab that had no click; the record clears once `wait-click` reports.
- **2026-11-11** — Assumed: the server tests add a case for two waiting clicks running oldest first and one for a ran but unclaimed click refusing its tab's steps until claimed, because review found both paths untested.
- **2026-11-12** — Assumed: the connect flow's `click` answers at once when its click waits, and connect's own `wait-click`, run in the background, reports it, replacing the wait inside `click`; the server's refusal names `wait-click` alone, because the host stops a foreground command after about 2 minutes while a turn can last 8 hours, and a stopped wait left the tab refusing every step with a `browse.mjs` command the connect rules forbid.
- **2026-11-12** — Saved for CI as final acceptance inside `/ship`: every build task done; the three browser test files pass locally (114 tests); the full local script-test pre-check timed out while another chat held the check turn, so CI decides.
- **2026-11-12** — Archive checkpoint at `/ship` as 53.2.0: every task done, CI passed on PR #566, and the spec delta already in the main spec; the Mac check stays an open thread.
