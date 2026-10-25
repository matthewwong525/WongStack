# Tasks

## 1. Review page: section links stay in the frame

- [x] 1.1 `.agents/skills/plan/references/review-kit.html`: in the framed click listener, a link whose `href` starts with `#` is handled in place (`preventDefault`): `#/…` through `jump(hash)`, any other `#id` scrolled into view by id; `jump` takes the hash as an argument, defaulting to `location.hash`
- [x] 1.2 `scripts/tests/review.test.mjs`: in the existing inbox-frame test, a tap on `#why` is prevented and leaves the page in place, and links to other pages still get `_blank`
- [x] 1.3 `scripts/tests/review-browser.test.mjs`: a real-browser test hosts the built page in a sandboxed `srcdoc` frame like the inbox's, taps *Changes*, and checks the frame still holds the plan and has scrolled to `#changes`; then `#/2`-style routes and an unknown `#nowhere` keep the plan. Confirm it fails against the old kit before keeping it
- [x] 1.4 `CHANGELOG.md`: a `## Next (patch) — A plan's section links jump inside the inbox` entry in plain words, saying a plan sent before it keeps the old links until its chat rebuilds it

## 2. Verification

- [x] 2.1 The payload checks pass (`node --test scripts/tests/review.test.mjs scripts/tests/review-browser.test.mjs`, then `node .github/scripts/checks.mjs --worktree`)
- [ ] 2.2 `/save`, then on the preview at 390 px: a freshly built plan in the inbox scrolls to *What Changes* on a tap of *Changes* and stays shown
