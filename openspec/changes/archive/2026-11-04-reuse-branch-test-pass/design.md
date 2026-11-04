# Design

## Context

WongStack's [`test.yml`](../../../.github/workflows/test.yml) runs one `test` job. On the default branch, `already-passed.sh` (no flag) reuses a merged pull request's head pass. On any other branch, `checks.mjs` compares the whole branch with its base, so a plan-only last save of a change that touched code runs the full suite again.

WongOS `origin/main` (`d7bf4d2`, "faster-ci-tests") added `already-passed.sh --branch` and `checks.mjs --suite-base`, inside a 3-job split layout. The source of truth for the port is that commit's `already-passed.sh`, the `--suite-base` hunks of its `checks.mjs`, and its `checks-split.test.mjs` cases for both (the `--shard`/`--merge`/`split` cases stay out).

## Goals / Non-Goals

**Goals:** port the branch reuse so WongStack's own CI and every install skip a suite whose code already passed on the branch.

**Non-Goals:** the split (`--shard`, `--merge`, `split` in `--discover`, the `parts` job, the `loosened-checks.mjs` change); any change to the default-branch reuse.

## Decisions

- **`already-passed.sh` matches WongOS byte for byte.** Its `--branch` mode lists `merge-base(origin/$DEFAULT_BRANCH, $GITHUB_SHA)..$GITHUB_SHA^` (newest first, at most 20), takes the first commit whose newest real `test` run (GitHub Actions, not skipped) is `completed success`, then requires `app-untouched.sh --base <commit> --head $GITHUB_SHA` to say `untouched=true`. It prints `passed=`, `pr=` (empty) and `sha=`. The default mode also prints `sha=` (empty). A shared `newest_test` function serves both modes. Alternative: a second script; rejected, since the two modes share the API reading and the "a guess runs it" rule.
- **`checks.mjs --suite-base <sha>` takes only the WongOS hunks for it**: `parseArgs` gains the option, a full-SHA check, and a second `app-untouched.sh` comparison as `suiteScope`; the suite, proof and target decisions read `suiteScope`; loosened, wiki and skills keep `scope`; the summary line names the commit; `--worktree` refuses the flag. The `mkdirSync` import, `SHARD`, `SPLIT`, `splits`, `shardChecks` and `--merge` stay out. Small helpers WongOS added for the split (`scriptsOf`) come only if the `--suite-base` hunks need them.
- **`test.yml` stays one job.** After the default-branch `passed` step, a `reused` step runs `already-passed.sh --branch` with `DEFAULT_BRANCH` on a push to any other branch, and `Run shared checks` passes `${SUITE_BASE:+--suite-base "$SUITE_BASE"}` from `steps.reused.outputs.passed == 'true' && steps.reused.outputs.sha || ''`. The permissions comment says it reads each commit's test check. The header comment gains WongOS's "A docs-only save is not tested again either" paragraph, without the WongOS split section.
- **Tests sit beside the existing ones.** `--branch` cases go in `scripts/tests/already-passed.test.mjs`, which already fakes `gh`; `--suite-base` cases go in `scripts/tests/checks.test.mjs`. Existing cases that read the output lines get the new `sha=` line.

## Risks / Trade-offs

- [A reused pass hides a flaky or environment-dependent failure on the later commit] → only docs paths changed since, which the suite never reads; the same rule already skips a docs-only branch.
- [A force-push rewrites the branch so the "earlier commit" is not an ancestor any more] → the list is `rev-list` from the head's own history, so only ancestors of the pushed commit count.
- [The GitHub API is slow or errors] → any error runs the suite; at most 20 commits are read.

## Migration Plan

Ships as a `minor` release; installs take it at their next sync with no hand step. Rollback is a revert: without the step, every push runs the suite as before.
