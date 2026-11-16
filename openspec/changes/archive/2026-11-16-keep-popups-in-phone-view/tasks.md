## 1. Live view

- [x] 1.1 In `.agents/plugins/browser/skills/hand-over/scripts/view.mjs`, add a helper that lists the visible `Camoufox` pop-up windows with `X`, `Y`, and `WIDTH`, and in `liveView`'s `front()`, while the fit is `phone` and a pop-up shows, move each one past the strip to `max(0, strip − width)`, keeping its `Y`, with no raise or focus (design decision 1). Verify with task 1.3.
- [x] 1.2 In the same file, keep the width of the window `front()` raises in a phone fit, and have `describe()` report `min(screen.width, max(PHONE_WIDTH, that width))`; the page's own size stays 480 (design decision 2). Verify with task 1.3.
- [x] 1.3 In `scripts/tests/view.test.mjs`, with the fake `xdotool`: a phone fit with a 500 px window describes width 500; a pop-up at x 400, 350 wide, gets one `windowmove` to x 150 and no raise or focus; a pop-up already inside gets none; a wide fit moves nothing. Run `node --test scripts/tests/view.test.mjs` and see it pass.
- [x] 1.4 Review finding: in `view-page.mjs`, `render` and `renderTabs` take a poll's `fit` when it has the page's shape and a new width, and lay the screen out again; `view.mjs`'s `/watch` reply carries `fit` too. In `scripts/tests/view-page.test.mjs`, a `/view` poll and a `/watch` poll with width 500 lay a phone out at 500, and a wide fit leaves it; in `scripts/tests/view.test.mjs`, `/watch` gives the fit. Correct design decision 2's last paragraph and the proposal's Impact list. Run `node --test scripts/tests/view-page.test.mjs scripts/tests/view.test.mjs` and see them pass.

## 2. Docs and release

- [x] 2.1 In `.agents/plugins/browser/references/password-manager.md` (or `browsing.md`, whichever names a live view on a phone), say in one line that on a phone the pop-up and the whole toolbar fit the view; skip if neither names it.
- [x] 2.2 Raise `.agents/plugins/browser/VERSION` by a patch, and add a `## Next (patch) — Pop-ups and the toolbar fit a phone's live view` entry at the top of `CHANGELOG.md`, with no hand step.

## 3. Checks

- [x] 3.1 Add a phone-fit case to `scripts/tests/manual/live-view-popup.mjs` and run it in a throwaway browser: the stand-in pop-up's right edge sits inside the strip after a poll, it stays there for 5 s of polls, a tap in its box lands, and typing reaches it. If Firefox moves it back each poll or the tap misses, switch to design decision 1's fallback and log it.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree` and fix what fails.
