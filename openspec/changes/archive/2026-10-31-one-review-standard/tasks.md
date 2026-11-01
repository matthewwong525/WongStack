# Tasks

## 1. Builder

- [x] 1.1 `build-review.mjs`: add the `review` kind, read from `review.md` (`# <ask>`, `## Why`, `## To review`, optional `## Decisions`); stop on a missing Why or To review; no Decisions section or jump link when there are none
- [x] 1.2 Labelled actions: `--kind`, `--action "<name>=<label>|<message>"` (6 at most) and `--confirm <name>`; write the labels as `data-actions`, pass `name → message` to `openReplyLink`; `plan` and `preview` keep their current actions and labels
- [x] 1.3 The `ad` fence (`placement`, `account`, `picture`, `text`, `headline`, `button`), with the picture through the `picture` checks and limits, feed and story frames, and side-by-side wrapping
- [x] 1.4 A `Try it: <https url>` line in a `picture` fence, drawn as a new-tab link; any other scheme stops the build
- [x] 1.5 Tests in `scripts/tests/review.test.mjs` and `review-pictures.test.mjs`: the review kind and its missing sections, labelled actions and the limit, the ad fence and its refusals, and the Try it line

## 2. Kit

- [x] 2.1 `review-kit.html`: the shared frame (ask, Why, cards, optional Decisions, bar), with the bar drawn from `data-actions` and the confirmation step for each `--confirm` name
- [x] 2.2 OK and Change on each card: undoable OK kept with the notes; Change opens the card's editor; `Card #n: OK` (plan: `Change #n: OK`) lines in sent and copied blocks, marked sent once acknowledged
- [x] 2.3 Notes on selected words (a Note chip, the quote kept, refound by text) and on a picture spot (stored as a percentage, drawn as a numbered pin); the notes list grouped by card
- [x] 2.4 Browser tests in `scripts/tests/review-browser.test.mjs` at 320 px: OK, undo and Change; a word note; a spot pin; a review page with *Approve* and a confirmed *Launch*; plan and preview pages look as before

## 3. Prototype and build

- [x] 3.1 New `.agents/skills/plan/scripts/prototype.mjs` with `start`, `upload` (refuses a new migration file) and `finish` (writes the diff to `.scratch/`, removes the copy), by the CLI conventions
- [x] 3.2 `scripts/tests/prototype.test.mjs`: start and finish in a temp repo, the diff kept, the migration refusal; add it to `cli-conventions.test.mjs`
- [x] 3.3 `preview-review.mjs`: `--approved` labels pairs *Approved* and *Built*; tests in `preview-review.test.mjs`
- [x] 3.4 `apply/references/build-helper.md`: start from the prototype's diff when it exists; `apply/SKILL.md` step 4 passes the plan's *After* pictures as *Approved*

## 4. Skills and docs

- [x] 4.1 `plan/SKILL.md`: make the prototype for each bullet that adds or changes a screen, with *Before*, *After* per state and *Try it*; a sketch with one line why when it can't run; notes update the prototype
- [x] 4.2 `plan/references/drawings.md`: the `ad` fence and the prototype pictures, with offsetting cuts
- [x] 4.3 New `wiki/review-pages.md` owning the standard; trim `wiki/ux-principles.md#the-review-file` to plan-specific parts with a link; link it from `wiki/development/reply-links.md` and its hub
- [x] 4.4 Add `review-pages` to `.agents/skills/memory/references/areas.json`
- [x] 4.5 `CHANGELOG.md`: a `## Next (minor) — One review standard` entry with a plain **Updating.** note

- [x] 4.6 Link first: `build-review.mjs` prints the link line, then the plan's copy, then the review line; `asking-the-user.md` and `wiki/development/reply-links.md` say a link goes near the top of a reply; tests in `review.test.mjs`

## 5. Verify

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree`, including `measure-context.mjs --check`, `check-payload-links.mjs` and the browser tests
- [x] 5.2 Make a sample ads page with `--kind review`, open it through a reply link, and check OK, a word note, a spot pin, and *Approve* reaching the chat
- [x] 5.3 Build a sample preview page with `--approved` and check it shows *Approved* beside *Built*
