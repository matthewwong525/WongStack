## 1. Remove the Mac hide

- [x] 1.1 In `.agents/skills/browser/scripts/browser-server.mjs`, remove the `app` option of `routes()` and `macApp`, `appScript`, `runScript`, `browserPid`, `APP_MS`, `NEEDS_WINDOW`, `withWindow`, `hideIdle`, `windowWanted`, `showing`, `using`, and `endLook`; `front`'s `show` brings the tab to the front with no turn; `main()` drops the process lookup and the first hide; fix the comments that name hiding
- [x] 1.2 In `.agents/skills/browser/scripts/browse.mjs`, reword the help for `show` and `window`, and the `front` comment, with no Mac hide
- [x] 1.3 In `.agents/skills/hand-over/scripts/hand-over.mjs`, drop the Mac show-and-hide from the help and the `endTurn` comment

## 2. Tests

- [x] 2.1 In `scripts/tests/browser-server.test.mjs`, remove the hide tests and the `app` fakes; add a test that `front` with `show` selects the tab and holds no turn
- [x] 2.2 In `scripts/tests/browse.test.mjs`, update the `show` test and its help match
- [x] 2.3 In `scripts/tests/manual/browser-tabs-real.mjs`, remove the hidden and in-front checks; keep the tab, click, and add-on checks

## 3. Docs

- [x] 3.1 `wiki/development/browser-window.md`: the Mac row reads *In a window on your screen*; remove the hidden-until-your-turn bullet and its sub-bullets and every *hides again* line; keep the Dock tip for a window behind another app
- [x] 3.2 `wiki/development/browsing.md`: remove the *hidden until your turn* sentence
- [x] 3.3 `.agents/skills/browser/SKILL.md`: remove the Mac hidden lines; keep the Dock tip
- [x] 3.4 `CHANGELOG.md`: a `## Next (minor) — Keep the browser window shown on a Mac` entry, with an **Updating.** note for a browser 50.5.0 started hidden

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/browser-server.test.mjs scripts/tests/browse.test.mjs scripts/tests/hand-over.test.mjs` and `git grep` for `macApp`, `hideIdle`, `osascript`, and *hidden until* in live files
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree`, then `/save` for CI
