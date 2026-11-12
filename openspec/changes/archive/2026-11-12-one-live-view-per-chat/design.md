# Design

## Context

On a Linux computer that sends turns by link, the browser draws on one Xvfb screen, and every task's page is a tab in one window. A live view (`hand-over.mjs open --view`) starts a detached watcher per chat, under `~/.wong-stack/hand-over/links/<chat>/`. The watcher runs `x11vnc` on the whole screen (`view.mjs startSource`), a Cloudflare tunnel, and the page's routes. It holds the browser server's single `turn` on its tab (`page.front({ turn: true })`), so no other tab comes to the front.

A second chat's `open --view` fails twice over: `viewTaken()`/`viewHolder()` refuse while any chat's view is open, and the server's `front` refuses with *the person is using the browser*. The screen can show one tab at a time, so the fix is not a second screen but one view that switches between chats' tabs.

The server already moves its turn cleanly: `front({ turn: false })` on one tab, then `front({ turn: true })` on another. Other tasks' clicks behind the turn keep working as now.

## Goals / Non-Goals

**Goals:** a chat that needs the person joins the open view at once; the person switches between chats' tabs in one link; *Hand back*, close, and time limit act per chat; window mode unchanged.

**Non-Goals:** several screens or windows; the watch link joining or taking tabs; a change to the key link.

## Decisions

### One shared view, a turn per chat

- The live view's watcher moves from a chat's folder to one shared folder, `~/.wong-stack/hand-over/view/`: its state, pid, tunnel, and screen source. Each chat's turn is a file there, `turns/<chat>.json`, with its note, `--session`, deadline, completion id, and wake identity. The chat's own folder keeps its result, as now, so `wait` and the wake-up stay per chat.
- `open --view` with no view open starts the shared watcher with this chat's turn, as today. With one open, it writes its turn file, waits for the watcher to list it, and prints the same `HANDOVER_LINK` and `HANDOVER_SEND`. `viewTaken()` goes; `viewHolder()` remains only to tell a turn from a watch link.
- A watch link stays per chat, and while one is open, a turn view is refused as today, naming it. A turn can't join a watch link, and a watch link can't open while a turn view is open.
- *Alternative rejected:* three side-by-side places on a bigger screen. One person does one turn at a time, so a tab row gives the same result with no window moving, no clipped screen sources, and no focus juggling.
- *Alternative rejected:* a link per chat that takes the screen when opened. It needs every link's page to know when it is in front and go dark otherwise, and the person still hunts through chats for links.

### Switching tabs

- The watcher keeps the turns in join order and one **shown** turn. `/view` answers the tabs (chat name, note, new or seen, closes at) and the shown one.
- `POST /show {chat}` moves the turn: the shown page gets its size back and lets go (`front({ turn: false })`), the new page takes the turn (`front({ turn: true })`), and `liveView` fits it. `liveView` takes the page to show as a setter, not a fixed argument.
- A new turn never switches the screen. The first turn in an empty view is shown at once.

### Ending one turn

- `POST /give {chat}` ends that chat's turn only: its result goes to its folder, its chat is woken through the existing completion notice, and the view shows the oldest turn left. With none left, the watcher closes the link, the tunnel, and the source.
- `hand-over.mjs close` in a chat ends that chat's turn the same way. Each turn's deadline is checked by the watcher; an expired turn ends as `timeout`.

### Hands off still holds per chat

A chat with a turn in the view sends its page no commands until its own `wait` prints, as now. Other chats in the view are waiting on the person too, so none acts on a page while it may be shown.

## UX

**Brief.** Who: the business owner, often on a phone, with several chats running. The job: finish each step a chat needs (a sign-in, a card, a robot check) without tracking which chat is waiting. Done: every chat has its *Hand back* and carries on. Common case: one tab, as today; edge case: two or three tabs at once. Mirrors the current live view page.

**Flow.** Tap the link in any chat → the view opens on the first tab → do the step → *Hand back* → the next tab shows → repeat; the link closes after the last.

**Hierarchy.** *Hand back* stays the one primary action. The tab row is a quiet row above the page; the shown tab is filled (`tag`), others outlined (`tag-outline`), a new one marked. With one tab, the row is hidden, so today's view looks the same.

**Parts.** The existing bar (line, type box, *Hand back*), plus the tab row: one button per turn, its label the chat's name, shrinking to scroll sideways on a phone.

### Review

[review.html](review.html) sketches the view under What Changes' first item.

## Risks / Trade-offs

- **The move to a shared watcher** touches most of `hand-over.mjs`'s view path; the per-chat key link and watch link must keep their own folders. Tests cover each mode.
- **A turn whose chat ended** (its session closed) still shows until *Hand back*, close, or its limit; the wake-up then reports `unavailable`, as now.
- **Overlap:** the *phone live view cut off* work (bad-octopus) edits the view page and fit, and the *1Password* work (big-ladybug) edits `browser-server.mjs` at its old path. Whichever ships second merges by hand.
