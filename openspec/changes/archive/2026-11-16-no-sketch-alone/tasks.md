# Tasks

## 1. Builder and kit

- [x] 1.1 In `build-review.mjs`, make `sketchOnly` throw for a card with a `screen` fence and no `picture`, `page`, or `live` fence, naming the file, line, and item, and saying to show the screen as a page by the prototype rules; ignore `svg` and the `No real picture:` text. Verify with tests in `scripts/tests/review-pictures.test.mjs`: a sketch alone stops and keeps the last good page; a sketch beside a `picture`, `page`, or `live` builds; an `svg` alone builds.
- [x] 1.2 Remove `bar` and `skeleton` from `SCREEN_CLASSES`, with a "write the real words" stop for either, and drop the `sk-bar` rename. Verify with a test that each stops with that message.
- [x] 1.3 Name an unlabelled `screen` picture *Sketch*. Verify with a label test.
- [x] 1.4 Drop `.sk-bar` and `.art.screen .skeleton` from `review-kit.html`; update `review-browser.test.mjs` and every fixture whose sketch now stands alone. Verify `node --test scripts/tests/review-pictures.test.mjs scripts/tests/review-browser.test.mjs` passes.

## 2. The page's look

- [x] 2.1 Add `look.mjs page <file.html>`: write `<file>.css` beside it with the look's tokens and parts, plus the Tailwind utilities the file's `class` attributes name, compiled by the app's Tailwind and `app/src/index.css`; with no Tailwind in `app/node_modules`, write tokens and parts and print the `npm ci` step. Verify with a `look.mjs` test: a page using `rounded-lg bg-card p-4` gets those rules, and the CSS passes the `page` card's checks when built into a review page.

## 3. Remove the app copy

- [x] 3.1 Delete `prototype.mjs` and `scripts/tests/prototype.test.mjs`; add `prototype.mjs` to `scripts/retired-names.json` with `look.mjs page` as its replacement; update `cli-conventions.test.mjs`. Verify `node scripts/check-retired-names.mjs` passes.
- [x] 3.2 In `/apply`'s `SKILL.md` and `references/build-helper.md`, drop the prototype `finish` step and diff; the helper builds each screen to match the plan's `pages/`, and the preview's `--approved` takes a screenshot of the approved page. Verify by reading both files: no `prototype` step remains.

## 4. Skill references and wiki

- [x] 4.1 Rewrite the plan's `references/prototypes.md`: write *Before* and each *After* state as a page in `pages/`, sample data, `look.mjs page` for the app, a theme copied by hand for another app, `live` for a screen to try, what is not a reason for a sketch, and a sketch only of a system part beside the page. Update `drawings.md` (`page` for a screen; `screen` only for a system part, no `bar` or `skeleton`) and `review-page.md`. Verify `node scripts/measure-context.mjs --check` passes.
- [x] 4.2 Rewrite `wiki/prototypes.md` under the design's headings; update `wiki/review-pages.md#the-prototype`, `#a-card-shows-the-closest-real-result`, `wiki/ux-principles.md#the-review-file`, and `wiki/README.md`'s line. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.3 Add a `## Next (minor)` entry to `CHANGELOG.md`, with an Updating note: an open plan with a sketch-only card or a prototype copy needs its screens as pages at its next rebuild, and a repo's screen-test steps for plans are no longer read.

## 5. Checks

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate no-sketch-alone --strict --no-interactive`; both pass.
