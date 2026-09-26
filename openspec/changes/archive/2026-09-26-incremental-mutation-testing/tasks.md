## 1. Scaffold config

- [x] 1.1 Add `"incremental": true` to `app/stryker.conf.json`, and confirm `app/.gitignore` already ignores `reports/`.

## 2. Test workflow

- [x] 2.1 In "Locate the test suite", output `rel` (the suite's workspace-relative prefix: empty at the root, `app/` below it), `stryker` (`true` when the folder has a `stryker.conf.*` or `stryker.config.*` file), and `stryker-key` (`stryker-<os>-<hash of lockfile, Stryker config, Vitest config>`), per review.html#/ci-run/after.
- [x] 2.2 Add an `actions/cache/restore` step before "Test", pinned by commit SHA with its version in a comment. Key `<stryker-key>-<run id>-<run attempt>`; restore key `<stryker-key>-`; path `<rel>reports/stryker-incremental.json`. Run it only when `stryker` is `true`, per review.html#/ci-run/after.
- [x] 2.3 Add an `actions/cache/save` step after "Test" with the same key and path, pinned the same way. Condition: `always() && !cancelled()`, `stryker` is `true`, and the result file exists, per review.html#/ci-run/after.
- [x] 2.4 Extend the header comment of `test.yml` with a short section on why the result file is cached and why the key holds the config hash.

## 3. Release

- [x] 3.1 Bump `VERSION` to 20.1.0 and add a newest-first `CHANGELOG.md` entry that says what downstream repos get and that `npx stryker run --force` tests every mutant.
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`.

## 4. Evidence

- [x] 4.1 `/save` the change and record the first CI run: Test job time, Stryker time, and whether the cache restored a file (expected: no file on the first run, unless `main` has one with the same hash).
- [x] 4.2 Push a commit that changes one app source file and one line of its test, `/save` it, and record the second run: Test job time, Stryker time, and Stryker's count of reused mutants. Revert the probe edit in the next commit if it is not a real improvement.
- [x] 4.3 Put both runs' timings in the PR body, beside wongstack-cloud run 36255581190 (Stryker 14m06s) as the reason for the change.
