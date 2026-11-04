# Tasks

## 1. Branch reuse in the scripts

- [x] 1.1 Port `already-passed.sh` from WongOS `origin/main` (`--branch`, the shared `newest_test`, the `sha=` line in both modes, the header comment); verify `diff <(git -C /root/WongOS show origin/main:.github/scripts/already-passed.sh) .github/scripts/already-passed.sh` is empty
- [x] 1.2 Add `--branch` cases to `scripts/tests/already-passed.test.mjs` (reuse after a docs-only commit; look past a newer failed commit; refuse a failed, unfinished or skipped check; refuse when code changed since; `false` on a `gh` error and on a branch with no earlier commit) and update existing cases for the `sha=` line; verify `node --test scripts/tests/already-passed.test.mjs` passes
- [x] 1.3 Add `--suite-base <sha>` to `.github/scripts/checks.mjs` by the WongOS hunks only (no `--shard`, `--merge` or `split`), refused with `--worktree`; verify `node .github/scripts/checks.mjs --help`-style usage names it
- [x] 1.4 Add `--suite-base` cases to `scripts/tests/checks.test.mjs` (docs-only since the commit skips the suite, names the commit, still runs loosened and wiki; code changed since runs the suite; a bad SHA and `--worktree` are refused); verify `node --test scripts/tests/checks.test.mjs` passes

## 2. The workflow and its docs

- [x] 2.1 Add the `reused` step to `.github/workflows/test.yml` (non-default-branch push, `GH_TOKEN`, `DEFAULT_BRANCH`) and pass its `sha` to `Run shared checks` as `--suite-base`; add the header paragraph and fix the permissions comment; verify WongStack's own CI runs `already-passed.sh --branch` with `grep -n "already-passed.sh --branch" .github/workflows/test.yml`
- [x] 2.2 Add the branch-reuse sentence to the gate paragraph of `wiki/development/the-change-loop.md`; verify `node scripts/check-payload-links.mjs` passes
- [x] 2.3 Write the `## Next (minor) — Faster checks: a save that matches a branch that already passed skips the full test run` entry in `CHANGELOG.md`, with an **Updating.** note that says no hand step is needed

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree` and verify it exits 0
- [ ] 3.2 After `/save`, verify the branch's CI run shows the `reused` step ran on the push, and the `test` check is green
