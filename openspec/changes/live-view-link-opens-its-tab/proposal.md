# Each chat's live-view link opens that chat's tab

**Status:** in-progress
**Branch:** live-view-chat-link-tab
**Open questions:** none.

## Why

When two chats need you at once, both send the same live-view link. You tap the link in the second chat, but the view opens on the first chat's tab, and you must find the tab with the dot yourself. You expect the link to open the step it was sent for.

## What Changes

- **A chat's link opens that chat's tab.** Each chat sends a link that names its own tab. When you open it, the view shows that tab, even if another tab showed before. Opening the link counts as your tap on the tab. A tab that joins while you type still waits with a dot: only your own tap or link moves you.
  ```mermaid
  sequenceDiagram
    participant B as Chat "flights"
    participant P as You
    participant V as Live view
    Note over V: dentist tab shows
    B->>V: Card tab joins
    Note over V: dentist still shows
    B->>P: Link to flights tab
    P->>V: Open it
    Note over V: flights tab shows
  ```
- **A link whose tab has ended opens the view as it is.** If you already tapped *Hand back* for that chat, the link opens on the tab shown now, as today.
- **The inbox link is unchanged.** It opens the view on the tab shown now.

Non-goals: one link per chat with its own address or key, a tab that takes the screen by itself, and a change to the watch link.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: *Chats that need the person share one live view, a tab each*: a chat's link names its tab, and opening it shows that tab while its turn is open.

## Impact

- `.agents/plugins/browser/hand-over/scripts/hand-over.mjs`: `addressOf` takes an optional chat; `open --view` and `joinView` print `HANDOVER_LINK` with `&chat=<CHAT>` in the `#` part; `listingOf` keeps the plain address.
- `.agents/plugins/browser/hand-over/scripts/view-page.mjs`: reads `chat` from the `#` part beside `key`, and on a turn view's first load asks `/show` for that chat when it has an open tab that is not shown.
- Tests: `scripts/tests/hand-over.test.mjs`, `scripts/tests/view-page.test.mjs`.
- `.agents/plugins/browser/hand-over/references/live-view.md` § *What the link can do*, with an equal cut; a `## Next (patch)` `CHANGELOG.md` entry.
- No server route changes: `/show` already exists. The 1Password change (PR #579) touches neither file.

## Decision log

- **2026-11-12** — Asked whether to plan a fix so a second chat's link opens its own tab → chose plan the fix.
- **2026-11-12** — Assumed: opening a chat's link shows its tab even when you were on another tab, because opening it is your own tap; the rule that a new tab never takes the screen covers a tab joining, not your own act.
- **2026-11-12** — Assumed: the chat's name goes in the link's `#` part beside the key, not a new address or key per chat, because the `#` part never reaches a server or a log, and the view keeps one key.
- **2026-11-12** — Assumed: the inbox keeps the plain link, because it lists one entry for the whole view, not one per chat.
- **2026-11-12** — Assumed: a link whose tab has ended, or names no open tab, opens the view as it is, because there is nothing of that chat to show.
- **2026-11-12** — Assumed: the page switches only on its first load, since it clears the `#` part then, so a reload or a poll never moves you again.
- **2026-11-12** — Assumed: the browser module's version goes to 1.2.1, one patch above `main`'s 1.2.0 from the 1Password release, because the module-version check needs a raise for a changed module.
- **2026-11-12** — Built and checked live in a throwaway browser: with chat a's tab shown and chat b's tab new, opening chat b's link showed b's tab and line, a reload kept it, and chat a's page stayed on its site.
