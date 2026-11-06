# A live view keeps an add-on's pop-up open

**Status:** archived
**Branch:** live-view-popups
**Open questions:** none

## Why

In a live view, an add-on's pop-up closes about a second after you open it. You tap 1Password's toolbar button, its small window shows, and then it is gone. The live view causes this: every 2 seconds it pulls the main browser window back to the front, and the browser closes a pop-up when another window comes in front of it.

## What Changes

- **An add-on's pop-up stays open in a live view** until you close it, pick something in it, or tap outside it. This includes 1Password's pop-up and any other add-on's toolbar button.
  ```mermaid
  sequenceDiagram
    participant You
    participant View as Live view
    You->>View: Tap 1Password's button
    Note over View: Pop-up shows
    View-->>View: Every 2 s: a pop-up is open, so it waits
    You->>View: Pick a login
    Note over View: Pop-up closes, the page comes back to the front
  ```
- **You can type in the pop-up**, such as your 1Password password to unlock it. Today the help says the pop-up takes no typing on this screen. If the build finds typing still can't reach it, it says so, and the add-on's page in the tab stays the way to sign in.
- **Nothing else changes.** When no pop-up is open, the view still brings your page to the front, as it does today. The browser window on a Mac or a Linux desktop never did this, so it stays as it is.

**Non-goals:** the agent using the password manager; a change to the window on a Mac or a Linux desktop; other browser menus, such as a right-click menu, beyond what the same fix gives.

## What the build needs

- **A real add-on's pop-up on this computer**: Ready. 1Password is in the assistant's browser here; the build tests in a throwaway copy of the browser on its own virtual screen, not in yours.

## Capabilities

### New Capabilities

### Modified Capabilities

- `private-links`: a live view leaves an open browser pop-up in front, and the pop-up takes the person's typing.

## Impact

- `.agents/skills/hand-over/scripts/view.mjs`: `front()` and a new check for a shown pop-up window on the view's display.
- `.agents/skills/hand-over/scripts/hand-over.mjs`: `pollView` and `holdTurn` skip the raise and the tab reselect while a pop-up shows.
- `scripts/tests/view.test.mjs`, `scripts/tests/hand-over.test.mjs`: tests.
- `wiki/development/password-manager.md`, `wiki/development/live-view.md`: the pop-up works in a live view.
- `CHANGELOG.md`: a patch entry.

## Decision log

- **2026-11-06** — Asked whether to fix the live view so add-on pop-ups stay open → chose to plan the fix.
- **2026-11-06** — Assumed: the cause is the view's 2-second poll, which runs `xdotool windowraise` and `windowfocus` on the full-height browser window (`view.mjs` `front`) and asks the server to select the turn's tab again (`holdTurn` with `reselect`), because the pop-up is its own small window and Firefox closes a panel when another window takes focus.
- **2026-11-06** — Assumed: typing in the pop-up is in scope, with a fallback to the add-on's page in the tab if it can't work, because a closed-or-open pop-up is only useful to unlock 1Password if it takes the password, and `password-manager.md` says it takes no typing on this screen today.
- **2026-11-06** — Assumed: detect a pop-up as a visible window with X instance name `Camoufox`, because a measurement on a private Xvfb (uBlock's toolbar pop-up, `.scratch/popup.mjs`) showed the panel as an override-redirect `_NET_WM_WINDOW_TYPE_UTILITY` window, WM_CLASS `"Camoufox", "camoufox"`, 254×397, beside the main window's `"Navigator", "camoufox"`; X focus stayed on the main window; with no poll it stayed shown, and one `windowraise`+`windowfocus` of the main window, or one `page.bringToFront()`, covered it. An unsigned 1Password opens its welcome tab, not a pop-up.
- **2026-11-06** — Assumed: give the pop-up no keyboard focus, because a throwaway add-on's pop-up on a private Xvfb took a tap and typing ('abc') with X focus left on the page window, and `windowfocus` on the pop-up closed it at once. Typing needs a tap in its box first: the add-on's own autofocus did not land.
- **2026-11-06** — Assumed: the keep-alive sends the plain keep-alive, not a fit, while a pop-up shows, because a fit resizes through the server's `viewport` step, which brings the tab to the front and covers the pop-up. A covered pop-up stays mapped, so it is hidden, not closed.
- **2026-11-06** — Assumed: the by-hand check opens the pop-up with the add-on's keyboard shortcut, not a click at fixed toolbar coordinates, because the button's place moves with the toolbar; a click and the shortcut opened the same window in the measurement. It uses a throwaway add-on with a text box, since an unsigned 1Password shows no pop-up.
- **2026-11-06** — Assumed: a *Phone* or *Wide* tap during an open pop-up still resizes the page, which covers the pop-up until the person's next tap closes it, because the person asked for that size, and the next tap on the page restores the usual poll (review finding, a safe pick inside `/ship`).
- **2026-11-06** — Assumed: archive checkpoint at /ship, with every task built and the private-links delta reconciled into the main spec at archive; a real 1Password unlock in a real live view is not yet tried.
