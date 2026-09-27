## 1. The check

- [x] 1.1 `.github/scripts/app-untouched.sh`: print a fourth output line, `base=<sha>`, empty when it falls back to unknown; update its header comment
- [x] 1.2 Add `.github/scripts/loosened-checks.mjs` with `--base <sha>` and `--worktree`, the three flag kinds, `Check:` bullet matching in changed proposals, the Markdown summary, and exit codes 0/1/2, as the design says
- [x] 1.3 `.github/workflows/test.yml`: run the script after the suite on every run that is not cancelled, appending its output to the job summary; add one line for it to the Summary step and a short header comment on why
- [x] 1.4 Add `loosened-checks.mjs` to the core list in `.agents/skills/wong-sync/references/payload-files.json`

## 2. Tests

- [x] 2.1 `scripts/tests/app-untouched.test.mjs`: expect four output keys, and `base` equal to the merge base, or empty when unknown
- [x] 2.2 Add `scripts/tests/loosened-checks.test.mjs` on throwaway git repos, one per spec scenario: an unexplained skip comment fails and names the file; a `Check:` bullet passes; a lowered coverage limit fails; a deleted test fails; a test renamed to another test passes; a mini-app `test.skip(` fails; a reason in an archived proposal passes; an unchanged old proposal does not excuse a file; a `package.json` edit outside the test scripts passes; an empty base passes with a note; `--worktree` sees an untracked file. Build marker strings at run time.

## 3. The reports and the review page

- [x] 3.1 `.claude/skills/apply/SKILL.md` "Finish with a preview": before the report, run `loosened-checks.mjs --worktree`, fix each unexplained file without asking, and list each `Check:` bullet in one plain line above *publish it?*
- [x] 3.2 `.claude/skills/ship/SKILL.md` Step 6: add a **Checks loosened** line that lists the change's `Check:` bullets in plain words
- [x] 3.3 `.claude/skills/plan/scripts/build-review.mjs`: label `^Check:` as `check`; `references/review-kit.html`: style `.tag.check`; extend `scripts/tests/review.test.mjs` for the label

## 4. The rule, stated once

- [x] 4.1 `wiki/development/the-change-loop.md#the-gate`: a short paragraph that owns the rule, what counts, and the `Check:` bullet format
- [x] 4.2 `.claude/rules/code.md`: one line linking the gate paragraph — never loosen a check without a `Check:` bullet

## 5. Release

- [x] 5.1 Add `Check:` bullets to this change's Decision log for every file the step flags on this branch (`test.yml`, `app-untouched.sh`, `loosened-checks.mjs`)
- [x] 5.2 Bump `VERSION` to 25.6.0 and add the `CHANGELOG.md` entry, with an Updating note that a sync touching check settings needs a `Check:` bullet
- [x] 5.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`
