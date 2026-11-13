# Tasks

## 1. Browser server

- [x] 1.1 In `.agents/plugins/browser/scripts/browser-server.mjs`, replace the one `turn` with a map of turns, with `shared` joining, raising only when no other turn holds, and `otherTurn`, `ownPageOpen`, `awaitTurn`, and the click watcher reading every open turn (design 1).
- [x] 1.2 Add the title bell on shared turns: set on hold and renewal, kept by an observer and on a new page, taken off on end, lapse, and Hand back (design 2).
- [x] 1.3 Add the hand-back key, `GET /turns`, and `POST /hand-back`, and the `handedBack` answer on a renewal (design 3).
- [x] 1.4 Tests in `scripts/tests/browser-server.test.mjs`: two shared turns, the second not raised; a plain turn still refused beside any turn; the bell on hold, after a title change and a navigation, and gone on each end; `/hand-back` ends every shared turn and no plain one; the hand-back key opens no other route, and the main key's routes refuse it.

## 2. The WongStack add-on

- [x] 2.1 Write `.agents/plugins/browser/addon/` (manifest, background script, icons): the *Hand back* button with the count badge, polling `/turns` and posting `/hand-back` (design 3).
- [x] 2.2 Load it at every start beside the person's add-ons, from a copy under `~/.wong-stack/browser/` holding `config.json`, and pin its button, in `browse.mjs`, `addons.mjs`, and `launch-config.py`; it never shows in `addon list` and can't be removed by `addon remove`.
- [x] 2.3 Tests in `scripts/tests/addons.test.mjs` and `scripts/tests/browse.test.mjs`: the copy and its config, the pin, the launch options, and `front` forwarding `shared`.

## 3. Hand-over and the live view

- [x] 3.1 In `hand-over.mjs`, let window views share, send `shared: true`, finish `handed-back` and wake the chat on `handedBack`, and name the 🔔 tab and toolbar *Hand back* in `WINDOW_REMINDER` (design 4).
- [x] 3.2 In `hand-over.mjs`'s shared watcher, hold every link turn as shared, drop the tab switching and reselect, find the shown bell tab by `visibilityState`, fit it, and on `handedBack` end every turn and wake each chat (design 5).
- [x] 3.3 In `view-page.mjs` and `view-page.html`, drop the tab row and the turn view's *Hand back*, and list each open turn's line with its bell (design 6).
- [x] 3.4 Tests in `scripts/tests/hand-over.test.mjs`, `view.test.mjs`, `view-page.test.mjs`, and `private-links.test.mjs`: two window views at once; one Hand back wakes both chats in each mode; *done* ends one; a new turn not raised; no row and no turn *Hand back* on the page; the watch link unchanged.

## 4. Docs and release

- [x] 4.1 Update `live-view.md`, `browser-window.md`, `browsing.md`, and the hand-over `SKILL.md` (design 7).
- [x] 4.2 Extend `scripts/tests/manual/browser-tabs-real.mjs` with two turns, their bells, and one toolbar Hand back.
- [x] 4.3 Raise `.agents/plugins/browser/VERSION`, and add a `## Next (minor) — A bell on each tab that waits on you, and one Hand back in the browser` entry to `CHANGELOG.md`, whose *Updating* note says the button shows after the browser's next start.

## 5. Checks

- [x] 5.1 Run the tests named above with `node --test`, `node scripts/tests/manual/browser-tabs-real.mjs` on this server's Xvfb, a two-chat live view by `wiki/maintaining/test-a-live-view.md` in a throwaway browser, and `node .github/scripts/checks.mjs --worktree`; fix what fails.
- [x] 5.2 Review fix: at the last turn's end, end its turn in the browser before the pages behind get their size back, so a resize no longer waits 20 s on that turn and is refused; the fake browser refuses a resize beside another tab's turn, and `hand-over.test.mjs` checks the page behind gets its size back.
