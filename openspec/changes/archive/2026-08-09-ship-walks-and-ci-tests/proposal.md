# Ship walks, CI tests

**Status:** ready-to-ship
**Open questions:** none

## Why

Shipping is the one moment the loop shows nothing: `/ship` merges on CI-green alone, CI runs no tests (the pack's `deploy.yml` only builds and deploys), and the walk — the loop's only end-to-end evidence — must be remembered separately. This change puts real tests in CI where the gate already lives, makes `/ship` produce walk evidence at ship time without turning it into a gate, and trims `/ship`'s prose, which currently restates its never-test/never-walk stance five times.

## What Changes

- **`/ship` invokes `/walk` between the `/save` checkpoint and the merge**, as a non-gating evidence step. `NONE`, `UNKNOWN`, and `TIMEOUT` report and the merge proceeds on green CI as today. `FAILURE` pauses: `/ship` shows the evidence and asks the user to fix or merge anyway — the user decides, not the verdict. (`/walk`'s own bounded fix loop, from the companion change `walk-self-healing`, runs first.)
- **A parallel `test` job in the pack's `deploy.yml`** runs the app's vitest suite on every push. It runs beside the deploy job, so deploy speed is unchanged; with no `test` script in `package.json` it reports why and exits green, matching the workflow's existing "real check, never permanently red" philosophy. Because `/save` already waits for all checks and auto-fixes failures, every save enforces green tests with no new skill logic.
- **Test coverage grows in the loop, not at the checkpoint:** `/plan`'s tasks authoring gains a standing convention — a change whose diff touches behavior includes a task to add or extend vitest coverage for that behavior. `/apply` writes the tests while implementing; `/save` never authors tests.
- **`/ship` SKILL.md rewritten concise** — the walk step replaces most of the repeated never-walk prose.
- **Wiki records updated**: the change loop's gate section and the walkthrough's recorded-decisions list say what changed and why (evidence step, not gate — the reasons the old walk-gate was removed still hold and still bind).
- Payload edit → `VERSION` bump, `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` run.

**Non-goals:** the walk does not become a gate (no verdict blocks a merge by itself — a `FAILURE` pause is a user decision surfaced, not a rung); `/save` does not walk and does not write tests; no second workflow file; no test framework is installed for target apps that lack one.

## Capabilities

### New Capabilities

- `ci-tests`: the pack's CI runs the app's unit/integration test suite in a parallel job, and the loop grows that suite as a standing task convention — distinct from the end-to-end evidence `/walk` produces.

### Modified Capabilities

- `staging-walkthrough`: "The walkthrough is a user-invoked verb" — `/ship` becomes the one other skill that invokes `/walk`, as an evidence step; `/save`, `/apply`, `/continue` still never walk, and nothing nudges about a missing walk.
- `delivery-gate`:
  - "Ship delegates its checkpoint and branch gate to save" — the ship sequence gains the walk step between checkpoint and merge, with the FAILURE-pause behavior.
  - "No local build fallback" — the walkthrough is now reached by `/walk` or by `/ship`'s evidence step; the vitest job is CI (the gate), not a local build, and the no-local-build rule is unchanged.

## Impact

- `.claude/skills/ship/SKILL.md` — new walk step, concise rewrite.
- `.github/workflows/deploy.yml` — parallel `test` job (payload copy; existing pack repos are *offered* it through `/wong-sync`'s adapt step, never overwritten).
- `.claude/skills/plan/SKILL.md` — the standing test-task convention.
- `wiki/development/the-change-loop.md`, `wiki/stack/staging-walkthrough.md` — gate section and recorded decisions.
- `VERSION`, `CHANGELOG.md`.
- Depends on `walk-self-healing` shipping first (the FAILURE fix loop `/ship` relies on lives there).

## Decision log

- **2026-08-09** — Planned and implemented in one session, 13/13 tasks, on a branch stacked on `walk-self-healing` (PR #58) because both changes edit `wiki/stack/staging-walkthrough.md` and the walk skill; branching off `main` would have guaranteed conflicts. Four implementation findings. **The deploy job is named `build`, not `deploy`** — the new `test` job sits beside it with no `needs:` edge, and the workflow-level concurrency group already gives one run per branch per event, so the double-fire collapse needed no change. **The test job cannot reuse `cf-build.sh --app-dir`**: that resolves the app by its wrangler config and exits 3 when there is none, but a repo can have tests long before it is provisioned — so the job finds the app by looking for a declared `test` script (root, then each immediate subdirectory), verified against three shapes (subdir with tests, subdir without, root with tests). **Three payload surfaces asserted the now-false claim** that `/ship` never walks — `walk/SKILL.md`'s "What /walk is not", its frontmatter description, and the synced `staging-walkthrough` spec's Purpose line; all were corrected, and the deploy workflow's comment about the walk "refusing to merge" was corrected too. **The concise rewrite removed the repetition but not the length**: the never-test/never-walk stance went from five restatements to two distinct ones, while the added Step 4 leaves the file at 82 lines against 75 before. Recorded so nobody "fixes" the count later by deleting the step.
- **2026-08-09** — Shipped as v9.9.0. Merging its base (`walk-self-healing`, PR #58) exposed two stacked-branch hazards worth recording. **Deleting the base branch immediately after the squash-merge closed PR #59** rather than letting GitHub retarget it to `main`; GitHub then refuses both to reopen a PR whose base branch is gone and to retarget a closed PR, so the work moved to a fresh PR. **The subsequent `git merge origin/main` resurrected `openspec/changes/walk-self-healing/`**: because this branch predates the archive move, the merge base saw the active folder and the archived folder as two independent additions rather than a rename, and kept both — which would have un-archived a shipped change. Removed in its own commit. Both hazards are properties of squash-merging a stacked branch, not of this change; the fix for the first is to delay the branch deletion, and for the second to check `openspec list` after any merge of `main` into a branch that predates an archive.
