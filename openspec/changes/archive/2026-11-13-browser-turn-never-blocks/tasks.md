# Tasks

## 1. Browser server

- [x] 1.1 Remove the waiting click, the key click, `awaitTurn` and their refusals from `browser-server.mjs`; every step runs at once (design 1)
- [x] 1.2 After another tab's step, bring the turn page that showed before it back to the front; skip a tab with its own turn (design 2)
- [x] 1.3 A plain `front` during another turn answers `behind`; turn rules stay (design 3)
- [x] 1.4 `GET /tabs/:id/click` always answers `none` (design 4)
- [x] 1.5 Stop when idle once the server's own scripts, here or in the primary checkout, changed (design 5)

## 2. Clients

- [x] 2.1 `browse.mjs`: `wait-click` bounded to 3 minutes; `BROWSE_FRONT=behind` with its note; help text
- [x] 2.2 `connect-browser.mjs`: the `wait-click` help and note
- [x] 2.3 `hand-over.mjs`: a watch whose tab stays behind opens nothing

## 3. Docs

- [x] 3.1 `SKILL.md`, `references/browser-window.md`, `references/browsing.md`, `live-view.md`, `wiki/stack/connect-your-tools.md`
- [x] 3.2 Raise the browser module's `VERSION`; add the `## Next (minor)` changelog entry

## 4. Tests

- [x] 4.1 `browser-server.test.mjs`: steps during another turn, the front restore with one and several turns, `behind`, `none`, the idle stop, the code check
- [x] 4.2 `browse.test.mjs`, `connect-browser.test.mjs`, `hand-over.test.mjs` and the stand-in server: `wait-click`'s limit, `BROWSE_FRONT=behind`, the watch
