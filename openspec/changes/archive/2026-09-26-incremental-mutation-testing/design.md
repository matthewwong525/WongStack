## Context

See [proposal.md](proposal.md) for why. Today `app/stryker.conf.json` runs Stryker 10 in `inPlace` mode with `perTest` coverage and `thresholds.break: 100`. `test.yml` finds the suite by its `test` script and runs `npm test` in that folder. The job has no cache step besides `setup-node`'s npm cache, and the "Locate the test suite" step outputs an absolute `dir`. `hashFiles()` and `actions/cache` paths need workspace-relative paths.

## Goals / Non-Goals

**Goals:**
- A push that changes a few files re-tests only the mutants that change can affect, with the same 100% gate.
- A repo without Stryker, or with a different runner, sees no difference.

**Non-Goals:**
- A new job, a matrix, or sharding.
- Detecting a repo that moved `incrementalFile` away from the default path.

## Decisions

1. **Stryker's own incremental mode, not a changed-files `--mutate` filter.** A git-diff filter would miss a mutant whose killing test changed, and it needs a base ref. Stryker's `IncrementalDiffer` already compares each mutant's code and its killing test, and it keeps the gate exact. *Alternative rejected:* `--mutate` from `git diff`.
2. **One flag in the config, not a CLI flag in the `test` script.** `"incremental": true` in `stryker.conf.json` makes local and CI runs behave the same, and it keeps `npm test` unchanged. `npx stryker run --force` still tests every mutant.
3. **Key: `stryker-<os>-<inputs hash>-<run id>-<run attempt>`; restore key: the same string up to the inputs hash.** GitHub never overwrites a cache entry, so each save needs a new key; the run attempt keeps a re-run from colliding with the first attempt's save. A prefix match searches the current ref first, then the default branch, so a branch gets its own newest file, else `main`'s. *Alternative rejected:* a key with the branch name in it. That duplicates the scope GitHub already applies, and it makes the fallback to `main` a second restore key to maintain.
4. **Hash inputs: the suite's `package-lock.json`, `stryker.conf.*`, `stryker.config.*`, and `vitest.config.*`, hashed once with `sha256sum` in the locate step.** One output feeds both the key and the restore key, so the two cannot drift, and the file list is written once. Stryker's diff sees source and test files only. A changed dependency or test config can change which mutants a test kills, so a new hash starts with no file and tests every mutant.
5. **Save with `if: always()` plus a file-exists check.** A failed run still saves what it learned, so the fixing push is fast. The `hashFiles('<rel>reports/stryker-incremental.json') != ''` condition skips the save when Stryker never ran, for example when lint failed first. A cancelled run saves nothing, because `always()` is combined with `!cancelled()`.
6. **"Locate the test suite" outputs `rel`, `stryker`, and `stryker-key`.** `rel` is the suite's workspace-relative path as a prefix: empty at the root, `app/` below it, so `${{ rel }}reports/…` works in both. `stryker=true` when the folder has a `stryker.conf.*` or `stryker.config.*` file, and only a found suite can set it. Both cache steps require `stryker == 'true'`. The existing `dir` output stays for `working-directory`.
7. **Pin `actions/cache/restore` and `actions/cache/save` to the newest release's commit SHA,** with the version in a comment, as the [workflow requirement](../../specs/ci-tests/spec.md) says. Dependabot's GitHub Actions updates keep the pin current.
8. **The `main` push runs incremental too.** The default-branch file is the seed for every new branch, so `main` must save one. The hash key already forces a full run when the inputs change.

## Risks / Trade-offs

- [An old result hides a mutant that a runtime change would now let survive] → the hash key covers the lockfile and both configs. The Node version is not in the key: `.nvmrc` says `22`, and the runner's 22.x moves without a file change, so a hash of it would not help. A Node change that alters test results is rare, and any change to the killing test or the mutated code still re-runs the mutant.
- [Two runs on one branch race and save out of order] → each save has its own key, and restore takes the newest. The worst case is one run that tests more mutants than it needs to.
- [Cache eviction (7 days unused, 10 GB per repo)] → a miss tests every mutant, which is today's behavior. The file is small.
- [A fork PR cannot read the base repo's branch caches] → a fork PR can still read the default branch's caches, and a miss is today's behavior.
- [`inPlace` mode plus incremental] → both are supported together in Stryker 10. The first CI run on the branch shows the result.

## Migration Plan

Downstream repos get both files through `/wong-sync`, which adapts a locally edited `stryker.conf.json`. The first run in each repo has no file and tests every mutant. To roll back, remove the flag and the two cache steps. An unused cache entry expires after seven days.
