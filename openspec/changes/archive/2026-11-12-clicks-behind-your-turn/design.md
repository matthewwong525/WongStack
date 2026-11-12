# Design

## Context

`browser-server.mjs` holds the person's turn as a lease (`turn = {id, until, before}`). `act()` runs every step through the tab's own step queue; for a name in `SHOWS_TAB` (`click`, `viewport`) it first calls `awaitTurn`, which polls `otherTurn` for `TURN_WAIT_MS` (20 s), then refuses 409 with `BUSY`. Typing, a key, a choice, a read, and a picture already run behind the person's tab.

Tried on 2026-11-11 with a throwaway Camoufox on Xvfb (a probe add-on reports the shown tab, as `scripts/tests/manual/browser-tabs-real.mjs` does): with tab A in front, in tab B `locator.focus()` then `keyboard.press()` left A shown every time and acted as a click:

| Target in tab B | Key | Result | Shown tab |
|---|---|---|---|
| `<button onclick>` | Enter, Space | handler ran | A |
| `<a href="#x">`, `<a href="/next">` | Enter | address changed | A |
| form send button | Enter | form sent | A |
| `<input type=checkbox>` | Space | ticked | A |
| `<div role=button tabindex=0>` with a key handler | Enter | handler ran | A |
| `<a target=_blank>` | Enter | new tab, behind | A |
| plain `<div onclick>` | Enter | nothing | A |
| `<button>` by mouse (`locator.click`) | — | handler ran | **B** |

A Mac window is not tried yet: the person runs the manual check there after release.

## Goals / Non-Goals

**Goals:** a click during another tab's turn never waits on a timer and never gives up; a mouse-only target runs once, after the turn, in order with the tab's other steps.

**Non-Goals:** the key path when no turn is open; a resize or the password manager's page during a turn (both keep `awaitTurn`); guessing whether a page reacted.

## Decisions

### Split the click by turn, in `act()`

`click` leaves `SHOWS_TAB`. In `act()`, a `click` while `otherTurn(tab)` goes to `keyClick(tab, body)`; with no other turn it goes to `ACTIONS.click` as today. The add-on guard runs first in both paths, as now.

- **Alternative: the key path always.** Rejected: the mouse path has the overlay, forced and script fallbacks, and a person's click is the more faithful event when nothing forbids it.

### Which targets take a key: read the element, decide once

`keyClick` resolves the same locator as the mouse path (`refLocator` or `clickTarget`), then reads the element in the page and returns its key or none:

- **Enter:** `a[href]`, `area[href]`, `button`, `input` of type `submit`, `button`, `reset`, `image`, `summary`, and an element with role `button`, `link`, `tab`, `menuitem`, `option`, or `treeitem`.
- **Space:** `input` of type `checkbox` or `radio`, and role `checkbox`, `radio`, `switch`, `menuitemcheckbox`, or `menuitemradio`.
- **None:** anything else, a disabled element, or an element whose `tabIndex` is below 0 (the keyboard can not reach it).

A target with a key gets `locator.focus()` then `page.keyboard.press(key)`, and answers `{ok, url, via: 'key'}`. A focus that fails (hidden, detached, covered) counts as none.

- **Alternative: press, then watch the page for a change and fall back to the mouse.** Rejected: a page that animates looks changed, and a key handler that only sends a request looks unchanged, so the fallback could click twice or never.
- **Alternative: native controls only.** Rejected by the person: most modern sites' buttons are custom, and an accessible one must take Enter.

### A mouse-only target queues on its tab, and answers at once

With no key, the server stores `tab.waiting = {body, done}` and answers `{ok: true, queued: true}` at once. A watcher (one interval of 250 ms while any tab waits) runs each waiting click through the tab's step queue, oldest first, once `otherTurn(tab)` is false: the turn closed, its lease lapsed, or its tab closed. It records the result or the error on `tab.waiting.done`.

- While `tab.waiting` is set, every other route on that tab answers 409 at once: *a click on this page waits for the person's turn in another tab; run `browse.mjs wait-click`*. A second click on the tab gets the same.
- `GET /tabs/:id/click` long-polls up to 25 s: it answers the recorded result (and clears `tab.waiting`), or `{waiting: true}`.
- The reaper skips a tab with a waiting click; closing the tab, or the session, drops it.
- **Alternative: block the click request until the turn ends.** Rejected: a turn can last 8 hours, past the server's 50 s step limit and any one agent command.
- **Alternative: run the queued click and let other steps race ahead.** Rejected: a read or a key before the click acts on the page out of order.

### `browse.mjs`: two outcomes, one new command

- `click` prints `BROWSE_CLICK=key` after a key press. A tick box pressed by key goes through the same `boxChanged` read; when it did not change, the existing Space retry runs (it stays behind too).
- `click` prints `BROWSE_CLICK=queued` and, on stderr, one note: the person is using the browser in another chat's tab; the click runs when their turn ends; run `browse.mjs wait-click` in the background, and take no other step on this page until it ends. Exit 0.
- `wait-click` long-polls the route until a result, then prints `BROWSE_CLICK=mouse|forced|script` (exit 0) or `BROWSE_ERROR=<reason>` (exit 1); with no click waiting it prints `BROWSE_CLICK=none`. The skill line tells the agent to run it with the longest background limit, as `hand-over.mjs wait` is.

### Docs

`browser-window.md` *Your turn keeps its tab in front* replaces the 20-second sentence; the browser `SKILL.md` gets one line on `BROWSE_CLICK=queued`, offset by a cut elsewhere so `measure-context.mjs --check` passes.

## Risks / Trade-offs

- [A custom button marked as a button ignores Enter] → it does nothing; `BROWSE_CLICK=key` tells the agent, which reads the page, sees no change, and says so or clicks again after the turn.
- [A key fires a page's `keydown` shortcut that a mouse would not] → the target holds the focus, so the page's own handler sees the key on that target, as a keyboard user's would.
- [A key press brings the tab forward on a Mac] → untested there. The manual check (`browser-tabs-real.mjs`) gains the key and queue checks; the person runs it on a Mac after release, and an open thread holds it. Rollback is one line: send `click` back to `SHOWS_TAB`.
- [The queued click runs on a page that changed meanwhile] → no step on the tab runs before it, and a ref is resolved when it runs; a stale ref fails with the usual *read the page again*.
- [A link opens a pop-up window, not a tab] → the same as a mouse click today; the window rule is unchanged.
- [Overlap] → the 1Password change edits `guardAddon` and its callers in the same file; the browser-module change moves the folder. Whichever publishes second catches up.

## Migration Plan

No data or setting changes. A running browser server keeps the old code until it restarts; the next start takes the new one. Rollback: revert the release.
