# Design

## Context

Version 50.5.0 (`browser-tabs-and-local-settings`, decision 9 in its design) hid the Camoufox app on a Mac with `osascript -l JavaScript` and `NSRunningApplication` by process id. A hidden app takes no mouse click and no `bringToFront`, so `browser-server.mjs` grew a `withWindow` wrapper that unhides the app for `NEEDS_WINDOW` steps (click, resize, front), a `showing` look for `browse.mjs show`, and a hide at each turn's end, lapsed lease, and new tab. All of it lives behind the `app` option of `routes()`, which is `null` off a Mac or when the process id is not found. With `app = null` the routes already behave as Windows and a Linux desktop do today.

## Goals / Non-Goals

**Goals:**
- A Mac behaves as Windows and a Linux desktop: the window stays shown, and a turn brings the task's tab to the front.
- Remove every macOS call and the state that exists only for it.

**Non-Goals:**
- Any change to tabs, turns, the 20-second wait for a click during another tab's turn, the link setting, the proxy, or the password manager.

## Decisions

1. **Delete the `app` path, not switch it off.** `routes()` loses the `app` option; `macApp`, `appScript`, `runScript`, `browserPid`, `APP_MS`, `NEEDS_WINDOW`, `withWindow`, `hideIdle`, `windowWanted`, `showing`, `using`, and `endLook` go. `onAddon`'s size restore calls `showAndSize` directly. `otherTurn` drops its hide on a lapsed lease. `openTab` drops its hide after a new tab. `main()` drops the process lookup and the first hide. A setting that kept the code would leave untested code behind.
2. **`front`'s `show` keeps its name and becomes a plain front with no turn.** `browse.mjs show` still prints `BROWSE_SHOWN=`, so the skill's *show a finished page* step and its output stay. `showing` existed only so the next task step could hide the window again.
3. **No macOS activation at the turn.** The 50.5.0 log records that `activateWithOptions` left the window behind the person's app in every full manual run. The turn selects the tab with `bringToFront`, and the chat line names *Camoufox* in the Dock, as `browser/SKILL.md` already says.
4. **`SHOWS_TAB` stays.** A click selects its own tab in the one window whether the app is hidden or not (tried 2026-11-06), so a click and a resize still wait for another tab's turn.
5. **Tests.** Remove the hide tests in `browser-server.test.mjs` (`macApp`, `appScript`, `browserPid`, the `app` fakes) and the unhide help match in `browse.test.mjs`. Add one routes test: `front` with `show: true` selects the tab and holds no turn. The manual `browser-tabs-real.mjs` drops its hidden and in-front checks and keeps the tab, click, and add-on checks.

## Risks / Trade-offs

- [The window can sit behind the person's app at a turn] → the chat names *Camoufox* in the Dock; the same happened with the hide in place.
- [A running browser started by 50.5.0 stays hidden until it restarts] → the CHANGELOG's **Updating.** note says to stop the browser once, or click *Camoufox* in the Dock.
