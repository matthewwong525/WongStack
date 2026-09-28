# Tasks

## 1. Review page

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, move Copy notes' clipboard write and `execCommand` fallback into one `copyNotes(done, failed)` used by the button and by the editor's Save
- [x] 1.2 After Save closes the editor and persists, copy all saved notes; toast *Saved and copied N note(s). Paste them into chat to update the plan.*, or on failure *Saved. Tap Copy notes to copy them.*
- [x] 1.3 Add *Saving a note copies all your notes.* to the header hint and as a muted line under the editor's buttons

## 2. Coverage

- [x] 2.1 In `scripts/tests/review-browser.test.mjs`, add a test: after saving two notes, `#copybuf` holds the header and both bullets, and the toast reads *Saved and copied 2 notes. Paste them into chat to update the plan.*; the editor shows the new line

## 3. Docs and release

- [x] 3.1 In `wiki/ux-principles.md` *The review file*, say Save also copies all saved notes
- [x] 3.2 Add a `## Next (minor) — Saving a note copies all your notes` entry to `CHANGELOG.md`, with an **Updating.** note saying nothing to do by hand

## 4. Verify

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`; run the review browser test when a browser is available, else leave it to CI
