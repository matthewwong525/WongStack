# Tasks

## 1. The guard flags kept checks and shared actions

- [x] 1.1 In `.github/scripts/loosened-checks.mjs`, add the `kept` kind by design decision 1: flag a kept check under `.agents/verification/journeys/` whose `steps` or `expect` changed or that was deleted, exempting added files, unchanged moves, and a promise the branch rewrites or removes (main spec digest differs, or a delta spec in the diff lists the requirement as MODIFIED or REMOVED). Reuse the spec reader and digest from `.agents/skills/verify/scripts/verify-journeys.mjs` by exporting or moving them; write no second parser. Update the header comment. Verify `node .github/scripts/loosened-checks.mjs --worktree` on this branch prints a report and flags no kept check.
- [x] 1.2 In `.github/scripts/check-settings.mjs`, count every path under `.github/actions/` as settings (decision 2). Verify the existing settings tests still pass.
- [x] 1.3 Author tests in `scripts/tests/loosened-checks.test.mjs` beside the existing ones, each in a throwaway git repo: an expectation removed is flagged; a deletion is flagged; a re-keep changing only `recordedAt` and `sourcePaths` is not; an added file is not; an unchanged move is not; a rewritten `THEN` in the main spec exempts the edit; a MODIFIED delta spec in the diff exempts it; unreadable JSON is flagged; a `Check:` bullet naming the file explains it; an edit under `.github/actions/` is flagged as settings.

## 2. The run a change can not edit

- [x] 2.1 Add `.github/workflows/guard.yml` by design decision 3: `pull_request_target`, one `guard` job, read-only permissions, default branch in `guard/`, pull request head in `pr/` with full history and no persisted credentials, merge-base as the base, the default branch's `loosened-checks.mjs` run from inside `pr/`, report to the job summary. Pin actions by commit as `test.yml` does, and say in the header comment why nothing from the pull request is executed. Verify with `actionlint` if installed, else by reading it against `test.yml`.
- [x] 2.2 Author a test in `scripts/tests/` that runs the guard the way the workflow does: two checkouts of a throwaway repo, the script taken from one and the working folder set to the other, where the second has an emptied guard and a new skip comment. Verify the run exits 1 and names both files, and that a contract test pins `guard.yml`'s trigger, its two checkout paths and the absence of any `run:` step that executes a file under `pr/`.
- [x] 2.3 Add `.github/workflows/guard.yml` to `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest, beside `test.yml`. Verify `node scripts/payload-checks.mjs` passes.

## 3. The reason is written where kept checks change

- [x] 3.1 In `.agents/skills/verify/scripts/verify-journeys.mjs`, make `keep --install` print one `REPLACED=<path>` or `REMOVED=<path>` line for each kept file whose steps or expectations it changed or that it deleted (decision 4), and test it in `scripts/tests/verify-journeys.test.mjs`: a re-keep with new steps prints `REPLACED`, an unchanged re-keep prints nothing.
- [x] 3.2 In `.agents/skills/verify/references/walkthrough.md` § g step 3, add the clause: each `REPLACED` or `REMOVED` line gets a `Check:` bullet in the archived proposal before the save. Cut at least as many words from the same file. Verify `node scripts/measure-context.mjs --check` passes.
- [x] 3.3 Update the wiki by its rules and voice: in `wiki/development/the-change-loop.md` § *A loosened check needs a reason*, add kept checks and shared actions to what is flagged, the default-branch run, and its limit off GitHub; in `wiki/development/kept-checks.md`, say under *What each result means* that a replaced or removed kept check is reported with its reason. Verify `node scripts/check-payload-links.mjs` passes.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Checks the assistant can't quietly change` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing to do; to make the new check un-skippable when merging by hand, add `guard` to the required checks in the project's GitHub settings (say where). Leave `VERSION` alone.
- [x] 4.2 Read how `/save` waits for checks (`.agents/skills/save/references/git-gate.md` and its script) and confirm it does not settle before a `guard` run that appears after the pull request opens. If it can, wait for `guard` by name when `guard.yml` is on the default branch, with a test. Record the finding in the Decision log either way.

## 5. Final verification

- [x] 5.1 After all source, tests and docs are written, run `node .github/scripts/checks.mjs --worktree` and repair failures this change caused: script tests, payload links, wiki checks, context budget, and `openspec validate "protect-checks-from-edits" --strict --no-interactive`. Confirm the in-branch guard lists `guard.yml` and both scripts as explained by the proposal's `Check:` bullets. Report local evidence without claiming remote checks passed.
- [x] 5.2 Record in memory, as an open thread tagged `verify`: the first pull request after this ships should show a `guard` check, since `guard.yml` can not run on its own pull request; and the later idea of a script deciding the machine-readable part of a fresh walk, to be measured under the builder framing first.
