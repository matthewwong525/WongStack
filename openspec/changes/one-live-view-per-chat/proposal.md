# One live view, a tab for each chat that needs you

**Status:** built; checking it live
**Branch:** share-live-view-across-chats
**Open questions:** none

## Why

Today the computer shows one live view at a time. When a second chat needs your turn, it stops with *the person is using the browser*. You finish the first turn, then tell the second chat to try again, and wait. With several chats going, that is slow and needs you to keep track.

## What Changes

- **One live view holds every chat that needs you, a tab each.** A chat that needs you while the view is open adds its tab and sends the same link. The tabs sit across the top, each with its chat's name. Tap a tab to show that chat's page and its line. Each page stays as you left it, so you can start a sign-in, switch to pay in another chat, and come back.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="tag">Notion sign-in</span><span class="tag-outline">Pay $45.00</span><span class="tag-outline">DoorDash check</span></div>
    <div class="bar">The chat's page, live</div>
    <div class="muted">Sign in to Notion, then tap Hand back.</div>
    <div class="row gap"><div class="field grow">Type here</div><button class="btn-primary">Hand back</button></div>
  </div>
  ```
  No real picture: the live view page runs only beside a live browser screen.
- ***Hand back* ends only that tab's turn.** Its tab leaves the row, only its chat is told and carries on, and the view shows the next tab. The chat's page stays open in the browser for it to go on. Each tab has 8 hours, as a live view does today. The link closes when the last tab is handed back or reaches its 8 hours.
- **A new tab never takes the screen from you.** It appears in the row, marked new, and waits for your tap.
- **No chat waits for another chat's live view.** Each chat that needs you gets its tab at once. You never tell a chat to try again.

**Non-goals:** several screens at once; a change on a Mac, Windows, or Linux computer with its own screen, where your turn is in the browser window; the watch link, which stays on its own.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: "Every live view shows one line and Hand back" becomes a line and *Hand back* per chat's tab, and a new requirement lets chats share one live view, a tab each, so no chat's turn is refused while a view is open.

## Impact

- `.agents/plugins/browser/hand-over/scripts/hand-over.mjs`: a second chat's `open --view` joins the open view instead of failing; per-chat turns, results, and wake-ups; the view closes after its last turn.
- `.agents/plugins/browser/hand-over/scripts/view.mjs`, `view-page.mjs`, `view-page.html`: the tab row, switching, and per-tab *Hand back*.
- `.agents/plugins/browser/browser/scripts/browser-server.mjs`: no change was needed; the turn already moves when another tab takes it.
- Docs: `live-view.md`, `browser-window.md`, `browsing.md`.
- Tests: `hand-over.test.mjs`, `view.test.mjs`, `view-page.test.mjs`, `private-links.test.mjs`.
- `CHANGELOG.md`: a `minor` entry.
- Overlap: the *phone live view cut off* workspace (bad-octopus) edits the view page and its fit, and the *1Password* workspace (big-ladybug) edits `browser-server.mjs` at its old path. Merge whichever ships second.

## Decision log

- **2026-11-12** — Asked how a second chat's turn should work while another chat's live view is open → chose one view per chat, all open at once (over lining up the turns).
- **2026-11-12** — Asked, after the screen-split design was explained, for a simpler way → chose one live view with a tab for each chat that needs you, over three side-by-side views, a queue, or a link per chat that takes the screen when opened.
- **2026-11-12** — Assumed: a new tab doesn't take the screen from the person, because they may be typing a card or a code in the tab they're on.
- **2026-11-12** — Assumed: after *Hand back*, the view shows the oldest tab still open, because it waited longest.
- **2026-11-12** — Asked what the time limit is → kept 8 hours per tab, counted from when its chat joins, as a live view has today; the link closes after the last tab ends.
- **2026-11-12** — Assumed: the watch link stays on its own and a turn can't join it, because the agent drives that view and the person only watches.
- **2026-11-12** — Assumed: a computer with its own screen keeps its turns in the browser window, because the problem is with links.
- **2026-11-12** — Assumed: keep going here despite the two overlapping workspaces, because their goals differ; only files overlap.
- **2026-11-12** — Assumed: each turn file keeps its chat's wake identity, through a new `chatTarget` profile slot, because the shared watcher runs with the first chat's settings and would wake the wrong chat.
- **2026-11-12** — Assumed: *Hand back* ends only the tab on screen, because the person can only hand back what they see; a press from a page that showed another tab ends nothing.
- **2026-11-12** — Assumed: the inbox lists the shared link once, for the first chat, because it is one link; a joining chat sends the same link in its own chat.
- **2026-11-12** — Assumed: save for the final live check inside `/ship`, after two review rounds fixed a stuck *Hand back* on a chat's second turn and two weak tests.
