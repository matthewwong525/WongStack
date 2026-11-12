# Tasks

## 1. A shared view with a turn per chat

- [x] 1.1 `hand-over.mjs`: move the view's watcher, state, tunnel, and screen source to the shared `~/.wong-stack/hand-over/view/` folder, with a `turns/<chat>.json` file per chat; the key link and watch link keep their per-chat folders.
- [x] 1.2 `hand-over.mjs`: `open --view` joins an open view (writes its turn, waits for the watcher to list it, prints the same link and reminder) instead of failing; drop `viewTaken()`; a turn view and a watch link still refuse each other.
- [x] 1.3 `hand-over.mjs`: the watcher ends one turn on `/give {chat}`, the chat's `close`, or its deadline: result to that chat's folder, its wake-up, then the oldest turn left; it closes the link after the last turn.
- [x] 1.4 `hand-over.mjs` and `view.mjs`: `/show {chat}` moves the browser turn between tabs and refits; `liveView` takes the shown page as a setter; a joined turn never switches the screen.
- [x] 1.5 Tests in `scripts/tests/hand-over.test.mjs` and `scripts/tests/view.test.mjs`: a second chat joins and gets the same link; *Hand back* on one turn wakes only its chat and shows the oldest left; a chat's close and a deadline end only its turn; the last turn closes the link; a watch link and a turn view refuse each other.

## 2. The view page's tab row

- [x] 2.1 `view-page.html` and `view-page.mjs`: a tab row above the page, one tab per turn named for its chat, the shown one filled, a new one marked; hidden with one turn; a tap calls `/show`; *Hand back* sends the shown chat; the line follows the shown tab.
- [x] 2.2 Tests in `scripts/tests/view-page.test.mjs`: the row's states, hidden with one turn, and the line and *Hand back* following the shown tab.

## 3. Docs and release

- [x] 3.1 `live-view.md` (*One live view on the computer* becomes one view with a tab per chat), `browser-window.md` (*A tab for each chat*: a second chat's turn joins the view), and `browsing.md` (the *one live view at a time* line). Cut the same number of words elsewhere so `node scripts/measure-context.mjs --check` passes.
- [x] 3.2 Add a `## Next (minor) — One live view, a tab for each chat` entry at the top of `CHANGELOG.md`, with **Updating.** *Nothing to do by hand.*

## 4. Checks

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/measure-context.mjs --check`, and `node .github/scripts/checks.mjs --worktree`.
- [ ] 4.2 `/save`, then on this server open a sign-in turn from one chat and a second turn from another, switch between them on a phone, and hand back each in either order.
