# Tasks

## 1. Browser server and CLI

- [x] 1.1 Tabs in one window (design decision 1): in `browser-server.mjs`, keep the first page as the home tab, open task tabs through `window.open` in it and `context.waitForEvent('page')`, null the opener, remake the home tab with `newPage()` when it is gone, and keep it out of the reaper and `listTabs`. Add cases to `scripts/tests/browser-server.test.mjs` with a stand-in context: a second task opens no new window, the home tab is never listed or reaped, a closed home tab is made again once.
- [x] 1.2 No tab switch during a turn (design decision 2): the server keeps the open turn's tab; `front` on another tab is refused with the stated `BROWSE_ERROR`. Add cases to `browser-server.test.mjs`.
- [x] 1.3 Window on Linux with a screen (design decision 3): extend `windowLaunch` with the screen check, start Xvfb only when no window shows, and record which one it took. Update `browse.mjs` usage so `window [on|off]` covers Linux (off is the link). Extend the `windowLaunch` cases in `scripts/tests/browse.test.mjs`: Linux with `DISPLAY` and the setting on shows a window; Linux with the setting off, or no `DISPLAY`, uses Xvfb; Mac unchanged.
- [x] 1.4 Proxy setting (design decisions 5 and 6): add `browse.mjs proxy [on|off]` and its usage line; `main()` starts the forwarder only with it on; record `proxy`; `status` prints both settings and a next-start note when the running browser differs. Add cases to `browse.test.mjs` and `browser-server.test.mjs`: default off starts no forwarder, on starts it, a failed forwarder with it on stops the start, the file is mode 600 under the home folder.

- [x] 1.5 No password manager question (design decision 7): drop the `BROWSE_ADDON=none` line and the `asked` and `decline` verbs from `browse.mjs` and `addons.mjs`, and update `scripts/tests/addons.test.mjs` and `browse.test.mjs`: `install`, `status` and `open` print no offer line; `status` names an added add-on.

## 2. Hand-over and live view

- [x] 2.1 Window turn by tab (design decision 3): in `view.mjs` and `hand-over.mjs`, a window turn selects the task's tab through `browse.mjs front` with the turn flag, on Mac, Windows and a Linux desktop; a link turn re-selects the turn's tab each poll. Clear the turn at every ending. Add cases to `scripts/tests/view.test.mjs` and `hand-over.test.mjs`.
- [x] 2.2 The browser on request (design decision 4): allow `open --view --keep-open` with only a note, and add cases to `hand-over.test.mjs`.
- [x] 2.3 A tab the person opens stays (review fix): in a live view, the poll re-selects the turn's tab only while no page the person or a site opened during the turn is open (`front` with `reselect` in `browser-server.mjs`, `browse.mjs`, and `hand-over.mjs`); a tap on another chat's tab or the home tab still goes back. Keep `browser.tabs.loadDivertedInBackground`. Cases in `browser-server.test.mjs` and `hand-over.test.mjs`.
- [x] 2.4 The browser on request holds the turn on every computer (review fix): *send me the browser* runs `hand-over.mjs open --view --keep-open --note ...` with a window too, never `browse.mjs front`; update `.agents/skills/browser/SKILL.md`, `wiki/development/browser-window.md`, `live-view.md`, `CHANGELOG.md`, and design decision 4. A case in `hand-over.test.mjs`: a window open with only a note holds the chat's tab as the turn until `close`.

## 3. Skill and wiki

- [x] 3.1 `.agents/skills/browser/SKILL.md`: the `proxy` command, `window` on Linux, *send me the browser* on each kind of computer, the refusal steps naming `proxy on`, and no password manager offer.
- [x] 3.2 `wiki/development/browsing.md`: *Tasks share the browser* says one window with a tab each; the proxy paragraph becomes the setting, off by default; *Let me take over* names the on-request view. `wiki/development/live-view.md`: rename *On a Mac or Windows* to cover a Linux desktop, add the link setting and the on-request view. `wiki/development/password-manager.md`: *The offer* becomes *Add it yourself*: in the window, from Firefox's add-on site, like any add-on, with no question; the agent's guard covers every add-on; an add-on added by hand does not update itself. `browsing.md` step 1 drops the password manager question. Keep each page under 3,000 words (`live-view.md` is at 2,936): move text to a new leaf if needed.
- [x] 3.3 `CHANGELOG.md` `## Next (minor)` entry: tabs, Linux window, the link setting, the browser on request, the proxy now off by default (turn it on with `proxy on` if a site stops loading), and no password manager question.

## 4. Checks

- [x] 4.1 Write `scripts/tests/manual/browser-tabs-real.mjs` (design decision 8) and run it on this Mac: three task tabs give one window, a click and typing in a background tab land, a live-view resize of one tab leaves the others' size, a real add-on loads, its page opens in a task tab, and its frames stay out of a snapshot. Fix what fails, or record it in the Decision log.
- [x] 4.2 Run `node --test scripts/tests/{browser-server,browse,view,hand-over,addons}.test.mjs` and the repo's checks, and fix what fails.
- [x] 4.3 `/save`, then check the change on GitHub passes CI.

## 5. Hidden until the turn, on a Mac (design decision 9)

- [x] 5.1 In `browser-server.mjs`, hide the Camoufox app on a Mac after launch and after a task tab opens, and unhide and activate it in `front` with the turn flag; add `hide` for the turn's end and `browse.mjs show`; a failed hide is logged and ignored. Tests in `browser-server.test.mjs` and `browse.test.mjs` with a stand-in `osascript`. Verify with `node --test`.
- [x] 5.2 In `hand-over.mjs`, hide the window again on every end of a window turn (`done`, `closed`, `handed-back`, `timeout`); add cases to `hand-over.test.mjs`. Verify with `node --test`.
- [x] 5.3 Add *show me the browser* to `.agents/skills/browser/SKILL.md` and say the window stays hidden until your turn in `wiki/development/live-view.md#on-a-mac-or-windows` and `wiki/development/browsing.md`; extend the `CHANGELOG.md` entry by one line.
- [x] 5.4 On this Mac, with `scripts/tests/manual/browser-tabs-real.mjs` or by hand: a task opens a page and the window stays hidden; a hand-over brings it to the front on the task's tab; *done* hides it.
- [x] 5.5 Then `/save` and confirm CI passes (with 4.3; left for the parent).
