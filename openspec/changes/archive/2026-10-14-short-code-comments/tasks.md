# Tasks

## 1. The rule

- [x] 1.1 Write `scripts/lint-comment-length.mjs` as an oxlint JS plugin by design decisions 1 and 2; verify by running it on a sample file and seeing a three-line comment and a 121-character comment line reported with file and line, and a two-line one not.
- [x] 1.2 Write `scripts/tests/lint-comment-length.test.mjs` with the cases in design decision 7; verify the test file lists a case for each.

## 2. Cleanup by fresh readers

- [x] 2.1 Search tests for patterns matched against comment text and repoint them; verify by listing the search and its hits in the Decision log.
- [x] 2.2 Start one fresh helper per area (design decision 5) to judge and edit comments; verify each returns counts kept, cut, removed, and its rows for `removed-reasons.md`.
- [x] 2.3 Write the tests and one-file renames the helpers flagged as cheap, beside the code they guard; verify each new test names the rule it replaces.
- [x] 2.4 Add outside-tool facts to their owning wiki pages; verify each added line links its source file.
- [x] 2.5 Write `openspec/changes/short-code-comments/removed-reasons.md` from the helpers' rows; verify every helper's rows are in it.
- [x] 2.6 Compare each touched file's compiled output before and after (design decision 6), then delete the comparison script; verify the only differences are the logged renames and extracts.

## 3. Registrations and proof

- [x] 3.1 Register the rule in `app/.oxlintrc.json` with the two exemptions in design decision 3; verify a three-line comment added to an app file is reported and one in `src/components/ui/` is not.
- [x] 3.2 Register the rule in `site/.oxlintrc.json`; verify a three-line comment added to a site file is reported.
- [x] 3.3 Add `scripts/tests/.oxlintrc.json`, pass it in the lint step of `scripts/payload-checks.mjs` and `.github/workflows/payload.yml`; verify the lint step's other findings are unchanged.
- [x] 3.4 Add the long-comment sample to the `lint` gate in `scripts/check-app-checks.mjs` and copy the rule file for the temp app; verify the samples' entries name `max-comment-lines` and `max-comment-width`.

## 4. Docs and release

- [x] 4.1 Add the comment rule to `.agents/rules/code.md` and name it in `wiki/stack/mini-apps.md`; verify both link the rule file.
- [x] 4.2 Add `scripts/lint-comment-length.mjs` to `payload-files.json` and the payload manifest; verify the file appears once in each.
- [x] 4.3 Write the `## Next (major)` entry at the top of `CHANGELOG.md` with the Updating note from design decision 8; verify the note reads in plain words.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and fix what fails; verify its last line is `LOCAL_CHECKS=pass`.
- [x] 5.2 Run the landing page's `npm test`; verify it exits zero.
- [x] 5.3 Run `openspec validate "short-code-comments" --strict --no-interactive`; verify it passes.
