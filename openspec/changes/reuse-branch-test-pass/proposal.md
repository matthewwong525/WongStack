# Faster checks: a save that matches a branch that already passed skips the full test run

**Status:** ready-to-ship
**Branch:** unkempt-lion
**Open questions:** none

## Why

A change's last save often only files its plan away. Its code already passed the tests one save earlier, but the tests run again in full, and the change waits minutes to go live. WongOS fixed this on 2026-11-01 and has used it since; WongStack and every install should get it too.

## What Changes

- **A save that changes only notes reuses the branch's last pass.** When an earlier save of the same change passed the tests, and everything changed since is plans, wiki pages or other notes, the tests do not run again. The check still looks at the notes, the loosened checks and the skills, and its summary names the save that passed. Any doubt, such as no earlier pass, changed code, or an answer it can not read, runs the tests.
  ```mermaid
  flowchart TD
    p["you save a change"] --> e{"an earlier save of it passed?"}
    e -->|no| r["tests run"]
    e -->|yes| c{"only notes changed since?"}
    c -->|no| r
    c -->|yes| s["tests skip, summary names that save"]
    s --> d["notes, loosened and skill checks still run"]
  ```
- **The gate's page says so.** The change loop's gate paragraph gains one line for this skip, beside the skip that already happens when a change goes live.

## What the build needs

- **Nothing.**

Non-goals: WongOS's 4-part test split (`checks.mjs --shard`/`--merge` and its `test:shard`/`test:merge` reading in the loosened-checks guard), which only WongOS's long suite needs; the other parts of the WongOS ↔ WongStack sync (*A problem opens one chat*, *Small lessons*, *Chat names and thinking*, *New browser*), each in its own workspace; WongOS's own list of differences, which WongOS trims at its next sync.

Builds on: none.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ci-tests`: a push to a branch other than the default branch skips the suite when only docs changed since an earlier commit of that branch whose test check passed.

## Impact

- `.github/scripts/already-passed.sh`: a `--branch` mode and a third output line, `sha=`; the head-check lookup moves into a shared `newest_test` function. Ported from WongOS `origin/main` (`d7bf4d2`).
- `.github/scripts/checks.mjs`: `--suite-base <sha>`: the suite, proof and target checks compare with that commit; loosened, wiki and skill checks still compare with `--base`; the summary names the commit. `--worktree` refuses it.
- `.github/workflows/test.yml`: a step runs `already-passed.sh --branch` on a non-default-branch push and passes its `sha` to `checks.mjs --suite-base`; the header comment explains it.
- `wiki/development/the-change-loop.md`: one line in the gate paragraph.
- Tests: `scripts/tests/already-passed.test.mjs`, `scripts/tests/checks.test.mjs`.
- `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-04** — Assumed: bring over only the branch reuse (`already-passed.sh --branch`, `checks.mjs --suite-base`, their `test.yml` step and the gate line), because the person settled that scope in the request.
- **2026-11-04** — Assumed: keep WongStack's one-job `test.yml` and add the branch-reuse step inside it, not WongOS's discover/parts/test jobs, because those jobs exist only for the 4-part split, which stays out.
- **2026-11-04** — Assumed: port the code as WongOS has it, with no redesign, because it has run on WongOS since 2026-11-01 and a copy that matches keeps the next sync small.
- **2026-11-04** — Assumed: the release is `minor`, because CI gains new behavior and installs need no hand step.
- **2026-11-04** — Check: `.github/scripts/already-passed.sh` gains `--branch`, because a docs-only save after a passed code save need not run the suite again. Any doubt (no pass found, code changed, an API error) still runs it.
- **2026-11-04** — Check: `.github/scripts/checks.mjs` gains `--suite-base`, because the workflow reuses an earlier pass on the same branch. It skips the suite only when only docs changed since that passed commit; the loosened, wiki and skill checks still read the whole change.
- **2026-11-04** — Check: `.github/workflows/test.yml` runs `already-passed.sh --branch` on a push to a branch other than the default branch and passes its commit to `checks.mjs --suite-base`, because a docs-only save need not run the suite again. Every code push still runs the suite.
- **2026-11-04** — Assumed: the gate paragraph keeps the builder's trim, with the wiki check's reason put back, because a reviewer asked to restore the old paragraph and that would push the save instructions over their size limit.
