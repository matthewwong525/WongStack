## 1. One width

- [x] 1.1 In `review-kit.html`'s `@media (min-width:900px)` block, remove the 700 px limits on `main > header`, `main > section`, `#changes.wide`, `#changes.wide .item:not(.has-view)`, and `#changes.wide > .aside`; align `.bar`, `#ready-confirm`, and `#ready-says` to the 1160 px column. Update the comment above the block. Follow `.scratch/one-width/skills/plan/references/review-kit.html` if it is still there.
- [x] 1.2 Drop the `wide` class from `build-review.mjs` and its tests if nothing else reads it.
- [x] 1.3 In `scripts/tests/review-browser.test.mjs`, at 1280 px, test that the header, `#why`, a card with a view, a card with only words, `#needs`, `#decisions`, and the bar's buttons share one left and right edge (within 1 px); and that a page with no pictures has cards as wide as a page with pictures. At 390 px, the existing no-sideways-scroll test still passes.
- [x] 1.4 Keep the bar's buttons on the cards' edges when the browser shows a scrollbar: in `review-kit.html`, size the `.bar` padding and the `#ready-confirm, #ready-says` `right:` by `100%`, not `100vw`, in the 701 px and 900 px rules. In `review-browser.test.mjs`, a browser with scrollbars shown, at 1280 px, keeps the bar's buttons within 1 px of `#item-1`'s edges.

## 2. Words

- [x] 2.1 In `wiki/review-pages.md`, say in [the frame](../../../wiki/review-pages.md#the-frame) that every part has one width on a computer, and keep [the card view](../../../wiki/review-pages.md#the-card-view) consistent.
- [x] 2.2 Add a `## Next (patch) — Every review card has the same width` entry to `CHANGELOG.md`, with **Updating.** *Nothing to do. Rebuild an open plan's page to see it.*

## 3. Checks

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`, the builder's tests, and the review browser tests; fix what fails.
