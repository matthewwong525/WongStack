## 1. Build

- [x] 1.1 `.agents/skills/hand-over/scripts/hand-over.mjs`: remove the finish (`--until`, `--until-gone`, `--until-text`, `--keep-open`, `finished`, `seen`, `MET`, the finish poll and state fields); `open --view` and `turn` take only `--note`; `wait` gives no `done` for a view and no `signed-in` for a watch; usage text updated
- [x] 1.2 `.agents/skills/hand-over/scripts/view-page.*` and helpers: drop any met-finish *Done* page; the handed-back and closed pages stay
- [x] 1.3 `.agents/skills/connect/scripts/browser.mjs`: the sign-in turn opens with no finish, its line *Sign in to <tool>, then tap Hand back.*, and its next-step text waits for `handed-back` (or `close` on *done* in a window)
- [x] 1.4 Tests: update `scripts/tests/hand-over.test.mjs`, `connect-browser.test.mjs`, `private-links.test.mjs`, and any other test that passes a finish; add a test that a view stays open when the page would have met an old finish, and that `--until` exits 2

## 2. Docs

- [x] 2.1 `wiki/development/live-view.md`, `browser-window.md`, `watch-link.md`, `browsing.md`, `login-codes.md` and any other page or skill (`.agents/skills/browser/SKILL.md`, `.agents/skills/connect/`) that names a finish or `--keep-open`: every turn ends on *Hand back*, *done*, a close, or the time limit
- [x] 2.2 `scripts/retired-names.json`: add `--until-gone`, `--until-text`, `--keep-open` for `hand-over.mjs` (and `open --view --until`), each with its replacement; update the existing `open --form` and `open --passwords` replacements
- [x] 2.3 `CHANGELOG.md`: a `## Next (minor) — The browser comes back only when you tap Hand back` entry

## 3. Checks

- [x] 3.1 Run `node --test` on the changed test files, then `node .github/scripts/checks.mjs --worktree`
