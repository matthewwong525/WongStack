# Tasks

## 1. The page (plan skill)

- [x] 1.1 In `review-kit.html`, move `#ready-choose`, `#ready-confirm`, and `#ready-says` into `.bar` as a second row and delete the `#ready` section, by [design 1, 4, 5](design.md); keep one `<script>` and one `<style>`. Verify by review that a page off a live link renders the bar as before.
- [x] 1.2 Keep the page's bottom padding equal to the bar's height and move `primary` with unsent notes ([design 2, 3](design.md)).
- [x] 1.3 Update `scripts/tests/review-browser.test.mjs`: on a phone viewport at the top of a long plan, *Build it* is inside the viewport and posts `build`; with an unsent note *Send notes* is primary, else *Build it*; the confirm and each answer show in the bar; from disk the bar has no build row; the last decision is not covered by the bar.

## 2. Docs and the release

- [x] 2.1 Update `wiki/ux-principles.md#the-review-file` where it places the buttons, and add a `## Next (patch) — …` entry to `CHANGELOG.md` in plain words. Verify with `node scripts/check-payload-links.mjs` and that `VERSION` is unchanged.

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`, the browser tests with a local Chrome, and `openspec validate build-buttons-in-the-bar --strict --no-interactive`; fix what fails.
