## 1. Measure

- [x] 1.1 In a throwaway Camoufox on its own Xvfb with a real add-on (copy the 1Password `.xpi`, or one from addons.mozilla.org), open its toolbar pop-up with `xdotool` and record the panel's window: class, override-redirect, size, visibility, and whether focus moves to it; confirm one poll's `front()` or `reselect` closes it. Work in `.scratch/`.

## 2. Build

- [x] 2.1 `.agents/skills/hand-over/scripts/view.mjs`: add `popupOpen(display)` by the measurement; `front()` does nothing while it is true, and gives a newly shown panel the keyboard if typing needs it
- [x] 2.2 `.agents/skills/hand-over/scripts/hand-over.mjs`: while a pop-up shows, `holdTurn` renews the turn with `raise: false` and no `reselect`
- [x] 2.3 Tests: `scripts/tests/view.test.mjs` for `popupOpen` and `front()`; `scripts/tests/hand-over.test.mjs` for the poll with a pop-up
- [x] 2.4 By-hand check `scripts/tests/manual/live-view-popup.mjs`: a throwaway browser with a real add-on, three polls with the pop-up open, the panel still shown, and a key typed into it

## 3. Docs

- [x] 3.1 `wiki/development/password-manager.md`: the pop-up works in a live view (or keep the tab line if typing fails); `wiki/development/live-view.md`: a pop-up stays in front
- [x] 3.2 `CHANGELOG.md`: a `## Next (patch) — A live view keeps an add-on's pop-up open` entry

## 4. Checks

- [x] 4.1 Run the by-hand check and `node --test scripts/tests/view.test.mjs scripts/tests/hand-over.test.mjs`
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree`, then `/save` for CI
