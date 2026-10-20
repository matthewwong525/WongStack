# Tasks

## 1. The already-passed check

- [x] 1.1 Write `.github/scripts/already-passed.sh` by design.md: find the merged pull request, compare trees, read the head's newest `test` check run; print `passed=` and `pr=`, notes to stderr, exit 0. Verify by `bash -n` and the test in 1.2.
- [x] 1.2 Write `scripts/tests/already-passed.test.mjs` with a stub `gh` on `PATH` and a temporary git repo: identical tree with a passed head → `passed=true`; different tree, failed head, missing check, no pull request, and a `gh` error → `passed=false`. Verify with `node --test scripts/tests/already-passed.test.mjs`.

## 2. The test workflow

- [x] 2.1 In `.github/workflows/test.yml`, add a "Check whether this code already passed" step before "Run shared checks", only on a push to the default branch, with `GH_TOKEN`; gate "Run shared checks" on its answer; write the one-line summary naming the pull request; add `checks: read` and `pull-requests: read`. Update the header comment. Verify `node --test scripts/tests/checks.test.mjs scripts/tests/payload-rule-paths.test.mjs` still passes.
- [x] 2.2 Add a `Check:` Decision log line naming `.github/workflows/test.yml` and why. Verify `node .github/scripts/loosened-checks.mjs --base $(git merge-base HEAD origin/main)` passes.

## 3. Docs and release

- [x] 3.1 Add one sentence to `wiki/development/the-change-loop.md#the-gate`, beside the docs-only skip: a merge whose code already passed on its branch skips the suite on the default branch. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Add `.github/scripts/already-passed.sh` to the payload file list and manifest where `app-untouched.sh` is listed. Verify the payload layout tests pass.
- [x] 3.3 Write a `## Next (minor) — Tests don't run twice` entry at the top of `CHANGELOG.md`, plain words, with an **Updating.** note: if your deploy step runs its own lint or tests, remove them, because the test check already runs them; keep any other edit there. Verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and fix what fails.
- [x] 4.2 Run the script against real GitHub data with the real `gh`: one past merge whose tree matched its tested head (expect `passed=true` and its pull request number) and one whose tree differed (expect `passed=false`), picked from `matthewwong525/WongStack` or `matthewwong525/WongOS` merged pull requests. Record both in the Decision log's `Check:` line.
