# Tasks

## 1. Test workflow

- [x] 1.1 In `.github/workflows/test.yml`, add `schedule: - cron: '17 6 * * *'` to `on`, and add `github.event_name == 'schedule'` to the job `if`; verify with `node -e` parsing the YAML (or `npx yaml`) that both are present and the push and fork-PR conditions are unchanged.
- [x] 1.2 In "Locate the test suite", drop the `INPUTS` hash and output `stryker-key=stryker-$RUNNER_OS`; verify the restore and save keys still read `<stryker-key>-<run id>-<attempt>` and the restore key `<stryker-key>-`.
- [x] 1.3 Add `github.event_name != 'schedule'` to "Restore mutation results"' `if`, leaving "Save mutation results" unchanged; verify by reading both conditions.
- [x] 1.4 Set `timeout-minutes: ${{ github.event_name == 'schedule' && 60 || 30 }}`; verify the job still has a timeout, as the `ci-tests` spec requires.
- [x] 1.5 Rewrite the header's "Why Stryker's result file is cached" section: the key has no input hash, the nightly run re-tests everything from scratch and saves the base for later pushes, and why the limits are 30 and 60; verify it names no lockfile or config hash.

## 2. Scaffold config

- [x] 2.1 Remove `"ignoreStatic": true` from `app/stryker.conf.json`; verify the file is valid JSON and keeps `incremental` and the 100 break threshold.

## 3. Ship skill

- [x] 3.1 In `.claude/skills/ship/SKILL.md` Step 1, extend the `failure` bullet: when the failing check on `main` is the Test workflow's scheduled run, say in plain words that the nightly full check found a weak test and that fixing it comes first; verify the preflight query is unchanged and the wording links nothing new.

## 4. Docs and release

- [x] 4.1 In `wiki/development/the-change-loop.md`, replace the example `Check:` bullet about `ignoreStatic` with one that does not describe a removed setting; verify `grep -n ignoreStatic wiki/` finds nothing.
- [x] 4.2 Add a `## Next (minor) — Pushes stay fast when mutation testing would start over` entry at the top of `CHANGELOG.md`: the key change, the nightly run, `ignoreStatic` gone, the new limits, that a red nightly run stops `/ship`, and an **Updating** note (both files need a `Check:` bullet in the sync plan; a repo that raised its own limit takes the new one; how to remove the `schedule` line); leave `VERSION` alone.
- [x] 4.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node .github/scripts/loosened-checks.mjs --worktree`; verify each passes and the last lists both files as explained.

## 5. Evidence

- [x] 5.1 `/save` the change and record the Test run on the branch: that restore found an old `stryker-Linux-<hash>-` file by the new prefix, and Stryker's reused count (expected: everything but the formerly static mutants).
