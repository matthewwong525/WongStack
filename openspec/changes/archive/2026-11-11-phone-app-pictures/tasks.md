# Tasks

## 1. Wiki

- [x] 1.1 Write `wiki/prototypes.md` by the design's outline: move the body of `## The prototype` from `wiki/review-pages.md`, add *An app the preview can't serve* and *What no test can draw*; under 3000 words, up, down, and sideways links.
- [x] 1.2 Shorten `wiki/review-pages.md#the-prototype` to its heading, two or three sentences, and a link to `wiki/prototypes.md`; point the card table's prototype and sketch rows at the new page. Keep every other heading's exact text.
- [x] 1.3 List `wiki/prototypes.md` in `wiki/README.md`, and update the *After* and *Before* bullets of `wiki/ux-principles.md#the-review-file` to link it and name the screen test.

## 2. Skill, reference, and builder

- [x] 2.1 `.agents/skills/plan/SKILL.md` *Draw in the proposal*: link the new page and name the screen-test route, with no net words.
- [x] 2.2 `.agents/skills/plan/references/drawings.md`: the `screen` line says a sketch is only for a part no prototype or screen test draws, same length.
- [x] 2.3 `.agents/skills/plan/scripts/build-review.mjs` `sketchOnly` warning names the screen test; update its expected text in `scripts/tests/review-pictures.test.mjs`.

## 3. Release

- [x] 3.1 Add `wiki/prototypes.md` to `.agents/skills/wong-sync/references/payload-files.json` beside `wiki/review-pages.md`.
- [x] 3.2 Write a `## Next (minor) — A plan for a phone app shows the real app` entry at the top of `CHANGELOG.md`, with an *Updating.* note in plain words: a repo with a phone or desktop app can write its own screen-test page the next time a plan needs one.

## 4. Checks

- [x] 4.1 Run `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs`, `node --test scripts/tests/review-pictures.test.mjs`, and the wiki checks (`node .github/scripts/checks.mjs --worktree`); fix what fails.
- [x] 4.2 Rebuild this plan's review page, and check the new page reads in plain words; then `/save`.
