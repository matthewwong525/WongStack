# Tasks

## 1. Remove the automatic close

- [x] 1.1 Delete `.agents/skills/daily/scripts/wrap-up.mjs` and `scripts/tests/daily-wrap-up.test.mjs`; remove the `wrap-up` entry from `.agents/skills/daily/references/sweeps.json`; verify `grep -rn "wrap-up.mjs\|wrapUp(" .agents scripts` finds nothing.
- [x] 1.2 In `.agents/skills/daily/scripts/worker.mjs`, remove the built-in job path (`BUILTINS`, the `do` branch of `badSweep`, the builtin runner, the `builtins` map and the `seen` capture in `serveDaily`); verify `node --test scripts/tests/daily-worker.test.mjs` passes after its built-in cases are removed and its default list expects only `wiki-tidy`.
- [x] 1.3 In `.agents/skills/daily/scripts/todos.mjs`, drop `wrapUpFile` and `closeDone`'s `wrapped` read; verify `node --test scripts/tests/daily-todos.test.mjs` passes with the shared-record case removed.
- [x] 1.4 Update `scripts/tests/daily.test.mjs`'s `D ensure` cases so turning off `wiki-tidy` alone gives `no-jobs`; verify it passes.
- [x] 1.5 Add `wrap-up.mjs` to `scripts/retired-names.json` with `finished.mjs` as its replacement; verify `node scripts/check-retired-names.mjs` passes.

## 2. Mark finished chats in `D status`

- [x] 2.1 Add `.agents/skills/daily/scripts/finished.mjs` with `lookFolder` and `finished()`, moved from the wrap-up check without the quiet rule; add `scripts/tests/daily-finished.test.mjs` covering merged and clean, new commit after merge, unsaved folder, main checkout, default branch, working chat; verify it passes.
- [x] 2.2 In `chief.mjs status`, add `finished: true` to a row with no open ask that `finished()` passes, through an injectable `finishedOf`; extend `scripts/tests/daily-chief.test.mjs` with one finished and one unfinished row; verify it passes.

## 3. The Daily chat offers to close them

- [x] 3.1 In `.agents/skills/daily/SKILL.md`, change the *What's going on?* line: name finished chats, ask which to close with the question box, and send `/close` to each pick by `D reply --bucket person`; verify `node scripts/measure-context.mjs --check` passes, trimming this skill's own lines if it does not.

## 4. Docs and release

- [x] 4.1 In `wiki/development/daily.md`, replace *Wrap up a finished chat* with *Close finished chats* (what counts as finished, the ask, `/close` on a pick, the 3-day tidy-up), and fix the worker paragraph, the default-jobs line and the `"do"` text; in `wiki/development/the-change-loop.md`, point the last sentence of *One task, one workspace* at the new heading; verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.2 Add a `## Next (minor) — <title>` entry to `CHANGELOG.md` with no hand step; verify `node .github/scripts/checks.mjs --worktree` passes.

## 5. Check it live

After publish (kept as an open thread, not a task): in a Daily chat with one merged, clean chat open, ask *what's going on?*: verify it marks that chat finished and asks; pick it, and verify the chat runs `/close`; verify a merged chat left open for 20 minutes gets no `/close` from the helper.
