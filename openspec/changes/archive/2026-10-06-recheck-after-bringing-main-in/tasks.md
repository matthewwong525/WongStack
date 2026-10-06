# Tasks

## 1. Pin what stays

- [x] 1.1 In `scripts/tests/ship-commands.test.mjs`, give the fixture an optional fake `.github/scripts/checks.mjs` that logs its call to the `calls` file and answers from the fixture's settings (exit code and `LOCAL_CHECKS=` line); add a test that a `prepare` which merges nothing never calls it and prints exactly today's lines in today's order; verify it passes on the unchanged `ship.mjs`

## 2. The ship command

- [x] 2.1 In `.agents/skills/ship/scripts/ship.mjs`, set `broughtIn` where `prepare` concludes a leftover merge and where it calls `mergeDefault()` (design decision 1); verify by reading both sites
- [x] 2.2 After `markReady()`, when `broughtIn`, run the checks script once with `--worktree --default-branch <base>`, pass its output to stderr, and print its last `LOCAL_CHECKS=` line on stdout after `REVIEW=`; print `LOCAL_CHECKS=not run (<reason>)` when the script is absent or prints no such line (decisions 2 and 4); verify exit stays 0 in every case
- [x] 2.3 On `LOCAL_CHECKS=fail (<parts>)`, print the repair `NEXT:` of decision 3, with the same change and archive words as today's line; verify the `pass` and `not run` paths print today's `NEXT:` unchanged
- [x] 2.4 Update the header comment's `prepare` paragraph and printed-lines list for `LOCAL_CHECKS=`; verify the exit-code table is untouched
- [x] 2.5 In `scripts/tests/ship-commands.test.mjs`, add cases with the fake script: merged and pass (today's `NEXT:`, one call); merged and fail (exit 0, the parts and the `--only` command in `NEXT:`); merged and exit 7 (the not-run line, today's `NEXT:`); a hand-resolved merge concluded on the rerun (one call); and assert `LOCAL_CHECKS=not run` in the existing merge tests whose fixtures have no script; verify each case is written

## 3. The docs and the release note

- [x] 3.1 In `wiki/development/the-change-loop.md`'s gate section, add to the local pre-check paragraph that publishing runs it once more after it brings the default branch in, in at most 30 words; verify the page stays under 3,000 words
- [x] 3.2 In `.agents/skills/ship/SKILL.md` Step 3, add a clause under 30 words: after a merge `prepare` reruns the local checks, and `NEXT:` carries any repair; verify no other step changes
- [x] 3.3 Add a `## Next (minor) — Publishing checks again after it brings in the latest work` entry at the top of `CHANGELOG.md`'s entries, in plain words, with `**Updating.** Nothing needs doing by hand.`; verify `VERSION` is untouched

## 4. Verification

- [x] 4.1 Run `node --test scripts/tests/ship-commands.test.mjs`; verify it passes, the pin from 1.1 unchanged
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree`; verify it passes, the payload link check, `measure-context.mjs --check`, and the wiki checks included
- [x] 4.3 Compare before and after: `prepare` gained one flag, one call, and one branch of `NEXT:`, with no new exit code and no change to its callers. If it grew past that, or a caller had to change, undo the change, publish nothing, and record it as ruled out; verify by reading the diff of `ship.mjs`
