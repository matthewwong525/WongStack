# Tasks

## 1. The page builder and kit

- [x] 1.1 In `build-review.mjs`, make a `form` fence in a What Changes card stop the build with the card's number and its first question, saying to ask it in the chat as a question card; make a need's `form` take only `file:` lines, any other kind stopping with the same pointer; cut `QUESTION_KINDS` to `file` and drop the drawing code for the other kinds. Test each stop and that a need's `file:` still draws, in `scripts/tests/review.test.mjs` and `review-pictures.test.mjs`; drop the tests for removed kinds.
- [x] 1.2 In `build-review.mjs`, replace the live card's answer shim with a stub `window.review={answer:function(){}}` that sends nothing; in `review-kit.html`, drop the `review:answer` handling, the port hand-off, and the `[data-live]` answer lines. Test in `review-browser.test.mjs` that a live card calling `review.answer('x')` adds no line to the notes and shows no error.
- [x] 1.3 In `review-kit.html`, drop the input handling for text, long, date, tick, choice, choices, and pictures; drop the typed-answer store; files keep their list in `data.files`, which the *Answers* group and the open-need count read. Test in `review-browser.test.mjs` that a need with a `file:` question still holds *Build it* at *1 thing needs you* until a file is sent, and that the notes list the file under *Answers*, tagged *Sent* once a button sends it.
- [x] 1.4 Set `WORK_IN_CHAT` to *Look it over, then say OK or paste your notes here.* and update its test.

## 2. Words

- [x] 2.1 Add the rule to `.agents/skills/explore/references/asking-the-user.md`: every choice and typed answer goes in the chat as a question card, before the review page, and a note that opens a new choice is asked in the chat too; the review page is for the final look, OK, and notes.
- [x] 2.2 Update `wiki/review-pages.md`: drop the card-table rows for *A choice that needs its own control* and *Answers*, keep files in *What the build needs*, rename *Questions and files* to *Files* with only `file:`, say a live card sends nothing, and link the rule in asking-the-user; fix links to `#questions-and-files` (`memory.mjs areas wiki/review-pages.md`). Update `.agents/skills/plan/references/drawings.md`'s form line to a file line in *What the build needs*, and add to `/plan`'s SKILL.md that every answer is asked in the exit round before the page. Check `node scripts/measure-context.mjs --check`.
- [x] 2.3 Add a `## Next (minor) — Questions in the chat, the review page for the final OK` entry to `CHANGELOG.md`, with **Updating.** *A page with a question in a card stops on its next build: ask the question in the chat, take it out of the plan, and build again.*

## 3. Checks

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`, the builder's tests, and the review browser tests; fix what fails.
