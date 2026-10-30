# Tasks

## 1. Pictures in review pages

- [x] 1.1 `build-review.mjs`: parse the `picture` fence, keep paths inside the source folder, check the type by first bytes, warn over 150 KB, stop over 300 KB a picture and over 500 KB a built page, and render the open `.art.photo` frame with labelled figures.
- [x] 1.2 `review-kit.html`: `.art.photo` styles and spot notes on pictures, named by their labels.

## 2. The preview page

- [x] 2.1 `build-review.mjs`: the `preview` kind (no Decisions, `data-kind="preview"`), `previewNotesHeader` and `previewActions`.
- [x] 2.2 `review-kit.html`: show `build` and `publish` each when offered; the preview page's title, notes line, hint and *Publish* label.
- [x] 2.3 New `.agents/skills/apply/scripts/preview-review.mjs`; it ships in the `apply` skill folder.

## 3. Skill and wiki text

- [x] 3.1 `plan/SKILL.md` and `references/drawings.md`: the `picture` fence, the Before screenshot, real words in sketches; `measure-context.mjs --check` passes.
- [x] 3.2 `apply/SKILL.md` *Finish with a preview*: the preview page takes the place of chat pictures.
- [x] 3.3 `wiki/ux-principles.md`: picture rules, the Before screenshot, the preview page; the low-detail rule removed.

## 4. Tests

- [x] 4.1 `review-pictures.test.mjs`: a labelled pair, the shared count, the 150 KB warning, the 300 KB and 500 KB page stops, each refused path, type and size, a link out of the folder, and a note on a picture.
- [x] 4.2 `review.test.mjs` and `review-browser.test.mjs`: a preview page has no Decisions, its own notes line and only Publish; a plan page shows each offered build choice and looks as before with both.
- [x] 4.3 `preview-review.test.mjs` and `cli-conventions`: pairs and a preview-only pair build a page in `.scratch/`.

## 5. Release

- [x] 5.1 Changelog entry; the local checks pass; this change's page builds with the new builder.

## 6. Second-look fixes

- [x] 6.1 `build-review.mjs`: a picture warns over 150 KB and stops over 300 KB; the built page stops over 500 KB, so the Inbox takes it; each message says to take the visible part at phone width. Tests for each limit.
- [x] 6.2 `apply/SKILL.md` step 4, `preview-review.mjs` usage, `wiki/ux-principles.md` and the changelog: phone width, the visible part only; computer width only where the layout differs and the page has room.
- [x] 6.3 Restore the `svg` sample and the screen sample's `bar` in `drawings.md`, and the archive step in `plan/SKILL.md`'s sample flow, trimming other words so `measure-context.mjs --check` passes with no budget raise.
- [x] 6.4 This change's page rebuilds under 500 KB.
