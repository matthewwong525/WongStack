## 1. Review page

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, make `notesText()` emit the header `Update the plan <name> with these notes from the review page. Don't build yet.` and one `- <place> ("<quote>"): <text>` bullet per note, leaving saved labels unchanged, and make the copy toast say `Paste them into chat to update the plan.`
- [x] 1.2 Update `scripts/tests/review-browser.test.mjs`: the copy test's name and expected block, and an assertion on the toast text.

## 2. Skills

- [x] 2.1 In `.agents/skills/plan/SKILL.md`, add pasted review-page notes to the `description`, and rewrite the Review notes section: recognize the new header, skip `/explore`, stop with a message when the change is not in this checkout, and after the rebuild finish as standalone `/plan` with the review link and the next-step question, never invoking `/apply`. Drop "before implementing" from the section.
- [x] 2.2 In `.agents/skills/continue/SKILL.md` step 4, remove the pasted-review-block bullet.
- [x] 2.3 Add `Review notes from review.html` to `scripts/retired-names.json`, replaced by the header `Update the plan <name> with these notes from the review page`.

## 3. Docs and release

- [x] 3.0 Update the `ux-wireframes` Purpose line directly (a delta cannot change a Purpose), and add a `payload-checks` delta whose browser-test scenario names the copied request, found at build time.
- [x] 3.1 In `wiki/ux-principles.md`, say Copy notes produces a plain request, one bullet per note by change number, that updates the plan and stops before building.
- [x] 3.2 Bump `VERSION` to 25.4.0 and add a `CHANGELOG.md` entry, noting that pages built before it still copy `/continue` until their next build.
- [x] 3.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate review-notes-stop-at-plan --strict --no-interactive`.
- [x] 3.4 Rebuild this change's review page and confirm Copy notes produces the new block, then run `/save` for CI to run the review tests.
