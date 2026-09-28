# Tasks

## 1. Review page

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, make `notesText()`'s first line `Notes on the plan <name> from the review page. Don't build yet.` and update its section comment.
- [x] 1.2 Change the editor placeholder to `A question or a change`, and both copy toasts to end `Paste them into chat.`

## 2. Skill

- [x] 2.1 In `.agents/skills/plan/SKILL.md` *Review notes*, recognize the new first line and the older `Update the plan <name> with these notes from the review page`; answer a question note in chat with no edit or Decision-log line; apply and log only change notes; offer an edit an answer suggests in the closing question; rebuild the page.

## 3. Tests

- [x] 3.1 Update `scripts/tests/review-browser.test.mjs`'s expected header lines and toasts, and assert the editor placeholder.

## 4. Docs and release

- [x] 4.1 Update `wiki/ux-principles.md` *The review file* so Copy notes produces notes on the plan that may ask or change, not an update request.
- [x] 4.2 Add a `## Next (minor) — Review notes can be questions` entry to `CHANGELOG.md`, with an **Updating.** note that older review pages keep working and rebuild on the next plan edit.
- [x] 4.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`.
- [x] 4.4 Pass the browser review tests in CI through `/save`.
