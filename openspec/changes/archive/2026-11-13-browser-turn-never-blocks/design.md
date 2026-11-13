# Design

## Context

- [`browser-server.mjs`](../../../.agents/plugins/browser/scripts/browser-server.mjs) keeps `turns`, a map of open turns by tab (`{until, before, shared}`). `otherTurn(tab)` is true when any other tab holds one.
- While another turn holds, `step()` sends a click to `clickBehind`: a key press when the target takes one (`keyClick`), else a waiting click (`tab.waiting`) that `watch()` runs once no other turn is open. `queued()` refuses **every** later step on that tab with `WAITING` (409), page reads included.
- `viewport`, `logins`, `pick`, `closeBoxes` and the add-on page call `awaitTurn()`: 20 s, then 409 `BUSY`. A tab with a shared turn of its own skips it.
- [`browse.mjs`](../../../.agents/plugins/browser/scripts/browse.mjs) `waitClick()` polls `GET /tabs/:id/click` with no limit. A live view renews its turn every 2 s for up to 480 minutes, used or not, so a click could wait for hours.
- With no turn, a click already runs in a background tab: `clickOn` never calls `bringToFront`. Only `showAndSize` (resize, add-on page), the add-on's own clicks and the `front` action show a tab.

## Goals / Non-Goals

**Goals:** a chat's own tab never waits on, and is never refused because of, another chat's turn. The person's tab stays in front. An older running server can not hold a chat for an hour. A fixed server takes over without anyone restarting it.

**Non-Goals:** how shared turns stand side by side, the bell, the toolbar *Hand back*, the lease.

## Decisions

1. **Remove the turn's hold on other tabs' steps.** Delete `clickBehind`, `keyClick`, `KEY_OF`, `HAS_FOCUS`, `watch`/`watcher`, `tab.waiting`, `drop`, `WAITING`, `awaitTurn`, `TURN_WAIT_MS`, `WATCH_MS`, `CLICK_POLL_MS`. `queued()` becomes `inQueue()`; `step()` always runs `ACTIONS[name]`. Alternative: keep the queue with a short limit. Rejected: the click works behind anyway, as it does with no turn.
2. **Put the shown turn's page back after another tab's step.** `act()` on a tab with no turn of its own, while another turn is open, first finds the turn page that shows (`shownTurnPage`: each turn's tab, then each page opened during a turn, by `document.visibilityState`, 1 s limit each). After the step, it brings that page to the front: always after a step in `RAISES_TAB` (`viewport`, `logins`, `pick`, `closeBoxes`) or the add-on page, else only when the page no longer shows.
   - No turn page showed before → nothing comes forward. In a window, the person may be on another tab on purpose, and 61.3.0 says a turn never takes the page by itself. A live view's 2 s poll (`reselect`) still brings its tab back.
   - A tab with its own turn is skipped: with shared turns, the live view's fit resizes the 🔔 tab the person picked, which must stay shown.
   - Risk: while the other tab shows (a resize takes about 150 ms), a key the person types goes to that page. Steps that show a tab are rare, so we accept it.
3. **`front` without `turn` from another tab during a turn** answers `{ok: true, behind: true}` and shows nothing. `browse.mjs front`/`show` print `BROWSE_FRONT=behind` with a one-line note. `front({turn: true})` keeps today's rules: a plain second turn is 409 `BUSY`, a shared one joins shared turns. `hand-over.mjs` treats `behind` on a watch's plain `front` as busy, as it treated the 409 before.
4. **`GET /tabs/:id/click`** always answers `{ok: true, none: true}`. `browse.mjs` and `connect-browser.mjs` keep `wait-click` and their `queued` handling for a server that started before this change. `waitClick()` gives up after `BROWSE_CLICK_WAIT_MS` (3 minutes) with a `BrowseError` that says so.
5. **Idle stop after an update.** At start, `main()` records the mtime of the server's own scripts (`browser-server.mjs` and the modules it imports) in its folder and, from a linked worktree, the same paths in the primary checkout (`primaryRoot`). A newer, older, missing or new file counts as changed. The reaper stops the server (`stop(0)`) once one changed, no tab is open or opening, and no turn holds. `browse.mjs` already starts a new server when none answers. Alternative: a version handshake that restarts on mismatch. Rejected: it could restart a browser that another chat is using.

## Risks / Trade-offs

- A background click on a page that needs real focus acts as it does today with no turn: `clickOn` falls back to a forced or script click.
- `visibilityState` can lag one frame after a raise, so a raising step always restores without asking.

## Migration

None. Old checkouts keep working: the new server never answers `queued`.
