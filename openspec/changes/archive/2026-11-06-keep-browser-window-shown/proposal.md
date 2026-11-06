# Keep the browser window shown on a Mac

**Status:** archived
**Branch:** browser-hidden-on-mac
**Open questions:** none

## Why

On a Mac, the assistant's browser hides until a step needs you, then shows, then hides again. That needs extra parts: a hidden browser on a Mac takes no clicks, so it comes out of hiding for each click, and it often stays behind the app you are in when your turn comes. You don't need it hidden. One window with a tab for each chat is enough, and it can just stay on your screen.

## What Changes

- **The browser window stays shown on a Mac**, as it does on Windows and a Linux computer with a screen. It never hides by itself, and it never flashes up for a click. You can minimize it or move it like any window.
  | Computer | Before | After |
  |---|---|---|
  | A Mac | Hidden until your turn | In a window on your screen |
  | Windows | In a window on your screen | Same |
  | Linux with a screen | In a window on your screen | Same |
  | Linux with the link setting, or a server | A live-view link | Same |

- **Tabs stay as they are.** Each chat still gets its own tab in the one window, and no other chat switches away from your tab during your turn.

- **Your turn works as before, without the hiding.** When a step needs you, your chat's tab comes to the front of the window, and the chat tells you what to do and to say *done*. If the window is behind another app, click *Camoufox* in the Dock.
  ```text
  Assistant: Sign in to Netflix in the
  browser window, then say done. If it's
  behind, click Camoufox in the Dock.
  You: done
  ```

- **Show me the browser** still brings your chat's tab to the front and keeps it there until you say *done*.

**Non-goals:** a headless browser that shows a window later (the browser can't switch at run time); hiding on Windows or Linux; any change to tabs, the link setting, the proxy, or the password manager.

## Capabilities

### New Capabilities

### Modified Capabilities

- `browser-logins`: the turn-in-the-window requirement drops the Mac's hidden-until-the-turn rule and its scenario.

## Impact

- `.agents/skills/browser/scripts/browser-server.mjs`: remove `macApp`, `appScript`, `browserPid`, `runScript`, `APP_MS`, `NEEDS_WINDOW`, `withWindow`, `hideIdle`, the `showing` look and `endLook`, and the `app` route option; `front`'s `show` only brings the tab to the front.
- `.agents/skills/browser/scripts/browse.mjs` and `.agents/skills/hand-over/scripts/hand-over.mjs`: help and comments drop the Mac hide.
- `.agents/skills/browser/SKILL.md`, `wiki/development/browser-window.md`, `wiki/development/browsing.md`: no hidden window on a Mac.
- `scripts/tests/browser-server.test.mjs`, `scripts/tests/browse.test.mjs`, `scripts/tests/manual/browser-tabs-real.mjs`: the hide tests go.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-06** — Asked how the browser should behave on a Mac → chose no hiding: the one window with a tab for each chat stays shown ("it doesn't need to be hidden it can just stay on").
- **2026-11-06** — Assumed: Camoufox's headless mode is no replacement, because it is fixed when the browser starts; a headless browser has no window for the person's turn, and a restart closes every chat's open page.
- **2026-11-06** — Assumed: the turn no longer asks macOS to bring Camoufox in front of the person's app, and the chat line names *Camoufox* in the Dock, because in every full manual run on 2026-11-06 macOS kept the window behind the person's app anyway, and the call is the last use of `osascript`.
- **2026-11-06** — Assumed: `browse.mjs show` stays, as a front with no turn that prints `BROWSE_SHOWN=`, because the skill uses it for a finished page and other skills read its line.
- **2026-11-06** — Assumed: a shown window does not slow the browser noticeably, because a headless or hidden browser still builds each page in full to read it and take pictures; not timed on a Mac.
- **2026-11-06** — Assumed: the by-hand `browser-tabs-real.mjs` keeps its one read-only `osascript` call, which counts this run's windows on a Mac, because it checks *one window with a tab for each chat* and hides nothing; `live-view.md` and a `hand-over.test.mjs` test name also lose their Mac hide words.
- **2026-11-06** — Assumed: the connect skill's sign-in line on a Mac adds *If it's behind, click Camoufox in the Dock*, because the plan promises the Dock hint at the turn and that line was the one fixed turn text without it (review finding, a safe pick inside `/ship`).
- **2026-11-06** — Assumed: archive checkpoint at /ship, with every task built and the browser-logins delta reconciled into the main spec at archive.
