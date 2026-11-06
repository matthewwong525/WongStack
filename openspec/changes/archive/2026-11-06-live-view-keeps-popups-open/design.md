# Design

## Context

A live view on Linux shows the browser's Xvfb screen through x11vnc and noVNC. The screen has no window manager, so `view.mjs` keeps the browser window in front itself: `liveView().front()` runs `xdotool windowraise` and `windowfocus` on the full-height `Navigator` window, and `hand-over.mjs` `pollView` calls it every `POLL_MS` (2 s), after `holdTurn` sends `front` with `turn: true, reselect: true`, which runs `page.bringToFront()` on the turn's tab unless the person opened their own page. A Firefox panel (an add-on's toolbar pop-up) is a separate, smaller X window. Either call takes focus from it, and Firefox closes a panel that loses focus. `password-manager.md` also says the pop-up takes no typing on this screen.

## Goals / Non-Goals

**Goals:**
- A pop-up opened in a live view stays open until the person closes it.
- The pop-up takes typing.
- With no pop-up, the view behaves as today.

**Non-Goals:**
- The browser window on a Mac or a Linux desktop (no poll raises it).
- The watch view's own raise during the agent's steps, beyond what the same check gives.

## Decisions

1. **Detect a pop-up at the X level, in `view.mjs`.** A new `popupOpen(display)` returns true while a mapped, visible browser window that is not full-height shows, found by `xdotool search --onlyvisible` on the browser's pid or class. The build first measures what a real panel looks like on Xvfb (its WM_CLASS, override-redirect, size, and whether `getwindowfocus` moves to it) in a throwaway Camoufox with 1Password, and picks the narrowest test that matches it and no page-sized window. The page can not tell, because a panel is browser chrome.
2. **Skip both raises while it shows.** `front()` returns early, and `holdTurn` sends `front` with `raise: false` (renew only) in place of `reselect`. The turn's lease still renews, so no other chat takes the window. The next poll with no pop-up raises as today.
3. **Typing.** The build tries a key into the open panel through the view's input path. If the panel takes no keys because nothing gives it X focus, `front()` gives the panel `windowfocus` once when it first shows. If typing still fails, the docs keep the *use its page in the tab* line, and the report says so; the stay-open fix ships alone.
4. **Tests.** Unit tests in `view.test.mjs` for `popupOpen` against fake `xdotool` output, and for `front()` doing nothing while a pop-up shows; a `hand-over.test.mjs` test that a poll with a pop-up sends `raise: false` and no reselect. A by-hand script under `scripts/tests/manual/` opens a throwaway Camoufox on its own Xvfb with a real add-on, clicks its toolbar button with `xdotool`, runs three polls, and checks the panel is still mapped and takes a key.

## Risks / Trade-offs

- [A pop-up left open blocks the raise] → only while it shows; a panel closes on a tap outside it, and the next poll raises again.
- [Another small browser window, such as a site's sign-in window, counts as a pop-up] → the raise waits while it shows, which today's `keptWindow` would have raised; decision 1 keeps the test to panels if the measurement can tell them apart.
