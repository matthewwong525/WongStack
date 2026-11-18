<!-- openspec-archive v1 2026-08-09-ship-walks-and-ci-tests -->
<!-- file proposal.md utf8 6451 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 6701 -->
# Design — ship-walks-and-ci-tests

## Context

`/ship` today: preflight → archive → delegate `/save` once → merge on `SUCCESS`/`NONE`. It never tests and never walks, and both stances are restated several times in its SKILL.md. The pack's `deploy.yml` has a single `deploy` job: build wrapper + deploy wrapper, with the double-fire collapse (`push`/`pull_request` dedup) and the "unprovisioned repo exits green with a reason" behavior. The walk-gate-on-ship design existed once and was removed for three recorded reasons: a walk that couldn't run had to block; retries shared `/ship`'s budget; the only walk moment was the last moment. The companion change `walk-self-healing` gives `/walk` a scout-first cheap `NONE`, self-healing access, and a bounded in-scope fix loop — this change builds on those.

## Goals / Non-Goals

**Goals:**
- Walk evidence lands on the PR at ship time without re-creating the walk-gate's failure modes.
- CI runs the app's vitest suite on every push, in parallel, at zero cost to deploy latency.
- Test coverage grows as a by-product of `/apply`, enforced thereafter by the existing gate.
- `/ship` SKILL.md gets shorter, not longer.

**Non-Goals:**
- No walk gate: no verdict mechanically blocks a merge. No change to the gate ladder's definition (CI when present → merge).
- `/save` neither walks nor writes tests. Prose-only saves are untouched.
- No second workflow file; no test-framework installation in target apps.

## Decisions

**D1 — Evidence step, not gate; FAILURE pauses for the user.** `/ship` order becomes: preflight → archive → `/save` → `/walk` → merge. `NONE`/`UNKNOWN`/`TIMEOUT`: report the verdict in `/ship`'s summary and merge on the existing `SUCCESS`/`NONE` save-gate result — identical merge conditions to today. `FAILURE` (after `/walk`'s own bounded fix loop has run out): stop, show the evidence link and what contradicted its `THEN`, and ask the user — fix (stay on branch) or merge anyway (their call, recorded in the report). Rationale: the removed walk-gate blocked when the walk *couldn't run*; here unrunnable walks (`UNKNOWN`) never block, which was the sharpest recorded pain. Alternative — merge blind on FAILURE and just report: rejected; watching a change fail end-to-end and merging anyway silently is the one outcome the user explicitly asked to prevent.

**D2 — `/ship`'s inner walk skips nothing structurally; the double-save dissolves.** `/walk` begins with `/save`, which `/ship` just ran. With `walk-self-healing`'s scout-first order, the inner `/save` sees a clean, pushed, CI-green tree and is a fast no-op; if the walk's fix loop pushes a fix, that same inner `/save` is exactly the checkpoint the fix needs. So no special flag or walk variant is introduced. `/ship` merges the commit that CI last gated — if the walk's fix loop moved HEAD, the delegated save inside the loop already re-gated it, and `/ship` re-checks the save-gate result before merging.

**D3 — Parallel `test` job in `deploy.yml`, not a second workflow.** Jobs in one workflow run in parallel by default, and the existing workflow already owns the double-fire collapse; a second file would duplicate that logic or fire twice per commit. The `test` job: setup Node from the app's version, `npm ci`, then run the app's `test` script with vitest's CI reporter; when `package.json` has no `test` script, print why and exit 0 — the same honest-green pattern as the unprovisioned deploy. `deploy` does **not** `needs: test`: staging deploys of red code are harmless (staging is a fixture, the walk catches it) and red code cannot reach production because merges require green CI. Alternative — gate production deploy on tests: redundant with the merge gate and slows the main-branch deploy.

**D4 — The gate grows a rung with zero new skill logic.** `/save` waits for all checks and auto-fixes failures; the moment the `test` job exists, every save enforces green tests. No skill text needs to enumerate the job — the ladder is already "CI when present."

**D5 — Test growth is a `/plan` convention, executed by `/apply`.** `/plan`'s tasks authoring gains a standing rule: when the change's diff touches behavior, tasks.md includes "add or extend vitest coverage for the changed behavior." Written at implementation time, when context is richest. `/save` stays a pure checkpoint. Alternative — `/save` authors tests at checkpoint time: rejected (checkpoint verb mutating code, rubber-stamp tests, every save slows).

**D6 — Concise `/ship` rewrite.** The walk step replaces the "never walk / don't nudge" rules; "never test locally" collapses to one line pointing at the gate owner (`the-change-loop.md#the-gate`), per the payload-single-source convention. Target length: meaningfully shorter than today despite the added step.

**D7 — Wiki honesty.** `the-change-loop.md`: `/ship` description gains the evidence step; the gate section states explicitly that the walk still gates nothing and that a `FAILURE` pause is a surfaced user decision, not a rung. `staging-walkthrough.md`'s recorded-decisions list: the "not automatic on `/ship`" entry is revised (not deleted) — it records why the *gate* stays dead and what changed instead, so the decision isn't re-litigated from scratch next time.

## Risks / Trade-offs

- [Ship gets slower — every ship now walks] → The scout-first `NONE` exit keeps backend-only changes near-free; browser minutes are spent only when there is something to see, which at ship time is the moment the user most wants evidence.
- [FAILURE-pause is a gate in disguise] → It is a pause for a *decision*, with "merge anyway" as a first-class answer; unrunnable walks never pause. The wiki text draws this line explicitly.
- [Existing pack repos keep their old deploy.yml] → By design (copy-if-absent); `/wong-sync`'s adapt step offers the test job as a proposal. Called out in the changelog entry.
- [A target app without vitest] → The job keys on the `test` script, not on vitest specifically; no script → honest green. The convention task says "vitest" for pack-scaffolded apps but any runner behind `npm test` satisfies the job.
- [Free-plan browser budget spent at ship time] → An exhausted budget is `UNKNOWN`, which reports and merges — never blocks a ship.

## Migration Plan

Ship `walk-self-healing` first (its fix loop and scout-first order are load-bearing here), then this change as its own release: `VERSION` minor bump, `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs`. Target repos: new files arrive via `/wong-sync` copy-if-absent; the deploy.yml test job reaches existing repos through the adapt proposal.

## Open Questions

(none)

<!-- end design.md -->
<!-- file tasks.md utf8 2454 -->
# Tasks — ship-walks-and-ci-tests

## 1. Ship skill (SKILL.md)

- [x] 1.1 Insert the walk evidence step between the delegated `/save` (Step 3) and the merge (Step 4): invoke `/walk` once; `NONE`/`UNKNOWN`/`TIMEOUT` report and proceed; `FAILURE` (fix loop exhausted) stops, presents the evidence, and asks fix-or-merge-anyway, recording the answer
- [x] 1.2 Confirm the latest save-gate result is `SUCCESS`/`NONE` before merging when the walk's fix loop advanced HEAD
- [x] 1.3 Concise rewrite: collapse the repeated never-test/never-walk prose — one line pointing at the gate owner (`the-change-loop.md#the-gate`), the "never walk" hard rule replaced by the evidence-step rule; keep every operational command intact
- [x] 1.4 Update the description frontmatter (ship now walks as evidence; still does not test locally; walk gates nothing)

## 2. CI workflow (deploy.yml)

- [x] 2.1 Add the parallel `test` job to `.github/workflows/deploy.yml`: setup Node, `npm ci` in the app dir, run the `test` script; no `test` script → print why and exit 0; no `needs:` edge from `deploy`
- [x] 2.2 Verify the job rides the existing double-fire collapse (one run per commit) and update the workflow's header comment

## 3. Plan skill and payload manifest

- [x] 3.1 `.claude/skills/plan/SKILL.md`: add the standing convention — behavioral change → tasks.md includes an add-or-extend-test-coverage task; prose-only change → omitted
- [x] 3.2 Check `wong-sync`'s payload manifest entry for `deploy.yml` still describes the workflow accurately (test job joins the offered-through-adapt list)

## 4. Wiki

- [x] 4.1 `wiki/development/the-change-loop.md`: `/ship` description gains the evidence step; the gate section states the walk still gates nothing and the `FAILURE` pause is a surfaced user decision, not a rung
- [x] 4.2 `wiki/stack/staging-walkthrough.md`: revise the "not automatic on `/ship`" recorded decision — the gate stays dead, the evidence step is what changed and why; note ship-time walks in the "when to run" prose
- [x] 4.3 `wiki/development/the-change-loop.md` (or the owning page): one line on the test-growth convention so `/improve` and reviewers can cite it

## 5. Release

- [x] 5.1 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry (call out that existing pack repos are offered the test job via `/wong-sync` adapt, never overwritten)
- [x] 5.2 Run `node scripts/check-payload-links.mjs` and fix any dead link

<!-- end tasks.md -->
<!-- file specs/ci-tests/spec.md utf8 2909 -->
# ci-tests

## ADDED Requirements

### Requirement: The pack's CI runs the test suite in a parallel job

The stack pack's `deploy.yml` SHALL contain a `test` job that runs beside the `deploy` job in the same workflow, so one commit produces one workflow run (preserving the existing double-fire collapse) and the deploy's latency is unchanged. The `test` job SHALL run the app's `test` script (vitest in pack-scaffolded apps; any runner behind `npm test` satisfies the job). When `package.json` declares no `test` script, the job SHALL print why and exit green — a real check, never a permanently red one, matching the workflow's existing behavior for unprovisioned repos.

The `deploy` job SHALL NOT depend on the `test` job: a staging deploy of red code is harmless (staging is a fixture and the walk observes it), and red code cannot reach production because merges require green CI.

#### Scenario: Tests run in parallel with the deploy

- **WHEN** a commit is pushed to a pack repo whose app declares a `test` script
- **THEN** the `test` job runs the suite while the `deploy` job builds and deploys
- **AND** the deploy finishes no later than it would without the test job

#### Scenario: No test script is honest green

- **WHEN** a commit is pushed to a pack repo whose app has no `test` script
- **THEN** the `test` job states that no suite exists and exits green
- **AND** the check is not reported as a failure

#### Scenario: A red suite holds the save, not the deploy

- **WHEN** the `test` job fails on a feature-branch push
- **THEN** the staging deploy still completes
- **AND** `/save`'s existing CI wait reports the failure and enters its auto-fix path, and `/ship` cannot merge until the check is green

### Requirement: Test coverage grows in the loop, not at the checkpoint

`/plan` SHALL include a standing task in `tasks.md` — add or extend test coverage for the changed behavior — whenever the proposed change touches behavior (code a test can exercise), and SHALL omit it for prose-only changes. `/apply` SHALL implement that task while implementing the change. `/save` SHALL NOT author tests: it remains a pure checkpoint, and its only relationship to the suite is the existing CI wait and auto-fix.

#### Scenario: A behavioral change plans its tests

- **WHEN** `/plan` drafts a change whose diff will touch app behavior
- **THEN** `tasks.md` contains a task to add or extend test coverage for that behavior

#### Scenario: A prose change plans no tests

- **WHEN** `/plan` drafts a change that only touches wiki, notes, or skill prose
- **THEN** no test task is added

#### Scenario: Save never writes tests

- **WHEN** `/save` checkpoints a session whose change lacks tests
- **THEN** it commits, pushes, and gates as usual without authoring test files
- **AND** any red `test` check is handled by the existing auto-fix path, not by writing new coverage at checkpoint time

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 5745 -->
# delivery-gate — delta for ship-walks-and-ci-tests

## MODIFIED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/walk` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/walk`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation, note, and any safe example declaration land in the pushed checkpoint
- **AND** the commit tested by the resulting CI run is the commit `/ship` will merge

#### Scenario: Save recognizes the archived branch change

- **WHEN** `/save` runs for `/ship` after `openspec/changes/<name>/` moved into the archive
- **THEN** it resolves and mirrors the single archived record matching the current branch
- **AND** it does not invoke fallback planning or create a new active `openspec/changes/<name>/`

#### Scenario: Save returns a mergeable gate result

- **WHEN** the delegated save finishes with `SUCCESS` or `NONE`
- **THEN** `/ship` proceeds through the walk evidence step and, absent a walk `FAILURE`, merges without reopening the PR or waiting on the same checks itself

#### Scenario: Save returns an unmergeable result

- **WHEN** the delegated ordinary save returns `UNKNOWN`, `TIMEOUT`, or a checkpoint failure
- **THEN** `/ship` stops before merge and reports that result
- **AND** it does not bypass, repeat, or reinterpret the gate

#### Scenario: A failed ship-time walk pauses for the user

- **WHEN** the ship-time walk returns `FAILURE` with its fix attempts exhausted
- **THEN** `/ship` stops before merging, presents the evidence, and asks whether to fix or merge anyway
- **AND** merging anyway remains available and is recorded in the report

#### Scenario: An unrunnable ship-time walk never blocks

- **WHEN** the ship-time walk returns `UNKNOWN` or `TIMEOUT`
- **THEN** `/ship` reports the walk as unverified and merges on the save-gate result alone

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/walk`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

The gate ladder is: **CI when present → merge.** A rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo runs `/walk`
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: The walk verdict is not a gate rung

- **WHEN** an adopted repo ships and the ship-time walk is `UNKNOWN`, `TIMEOUT`, or `NONE`
- **THEN** `/ship` merges on green CI (or PR review) alone
- **AND** the walk is reported, never counted as a failed check

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI configured
- **THEN** `/ship` merges on green CI alone, reporting no gap

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 2070 -->
# staging-walkthrough — delta for ship-walks-and-ci-tests

## MODIFIED Requirements

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached by invoking `/walk`, or by `/ship`, which invokes `/walk` once as a non-gating evidence step between its delegated `/save` checkpoint and its merge. No other skill SHALL run it: `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/walk` SHALL be invocable at any point in a change's life and any number of times, rather than only at merge time. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error. `/ship`'s invocation SHALL be an ordinary walk — same scout, same verdicts, same PR evidence — not a variant.

`/walk` SHALL be part of the opt-in stack pack, gated the same way `/wong-cloudflare` is: a repo whose `.claude/.wong-stack.json` does not have `components.stackPack: true` SHALL never receive the skill.

#### Scenario: Shipping walks as evidence

- **WHEN** `/ship` runs in a repo that adopted the walkthrough
- **THEN** `/walk` runs once after the delegated `/save` and before the merge, and its evidence lands on the PR
- **AND** a `NONE`, `UNKNOWN`, or `TIMEOUT` verdict changes nothing about the merge

#### Scenario: Shipping in an unadopted repo does not nudge

- **WHEN** `/ship` runs in a repo that has not adopted the walkthrough
- **THEN** the walk step reports `NONE` in one line and the ship proceeds
- **AND** no warning or adoption nudge is emitted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/walk` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/walk` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
