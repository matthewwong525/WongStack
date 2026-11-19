<!-- openspec-archive v1 2026-08-02-fix-pack-ci-defaults -->
<!-- file proposal.md utf8 6571 -->
# fix-pack-ci-defaults

**Status:** ready-to-ship
**Open questions:** none

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

The pack's CI is red by default and deploys twice concurrently. Both were reported independently by two adopting agents, and both reproduce.

**Red by default.** The workflow's own header promises *"an unprovisioned repo gets a real PR check instead of a permanently red one,"* and `wiki/stack/d1-pipeline.md` repeats it. In a pack repo with no wrangler config — the state the pack ships in, before `/wong-cloudflare` runs — two steps fail before the token guard is ever consulted:

```
$ bash scripts/cf-build.sh --app-dir
wong: ERROR — no wrangler config found under <repo>          exit 1

$ node scripts/cf-secrets.mjs check
Could not find a wrangler config … — aborting.               exit 1
```

The first is `deploy.yml`'s step 1, which runs unconditionally. The second is the parity step, which is *deliberately* unconditional and whose spec says it "SHALL skip, not fail" — but its skip cases cover a config with no `env.staging` and an unparseable `.toml`, never a config that does not exist.

**Double deploy.** `concurrency: group: deploy-${{ github.ref }}` never collapses a branch's two triggers: `push` gives `refs/heads/x`, `pull_request` gives `refs/pull/N/merge`. Both jobs run `wrangler versions upload` for the same `CF_BRANCH`, racing to bind one preview alias. One adopter observed two versions holding the same alias a second apart, with the alias intermittently serving Cloudflare's placeholder page while it settled — which reads as a failed deploy.

## What Changes

- **`deploy.yml` detects an unbuildable repo and passes.** Where no wrangler config and no app exist, the workflow reports why and exits green rather than failing at step 1.
- **`cf-secrets.mjs check` skips when there is no wrangler config**, closing the gap between its behavior and the requirement that already governs it. Absent config joins absent `env.staging` and unparseable config as a skip, not an abort.
- **The concurrency fix is three parts, not one** — all three are required, and two of them are non-obvious:
  - Key the group on the **event and the branch** (`deploy-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}`). Keying on branch alone makes the two triggers share a group, and the loser is **cancelled** — which `gh pr checks` reports as `fail`, blocking `/ship`.
  - Add a job-level `if` so only `push`, plus pull requests **from forks**, run at all. Same-repo PRs are already covered by their push event.
  - Keep `push` as the deploying event: its `github.sha` is the branch head, which is what `save/scripts/preview-url.sh` looks up. A `pull_request` SHA is the merge commit and resolves no preview.
  - **Concurrency is evaluated before a job's `if`**, so the `if` alone does not prevent a skipped run from cancelling a working one — hence both.
- **The docs stop claiming what the code does not do** — `d1-pipeline.md`'s "never produces a permanently red check" is made true rather than repeated.

**Non-goals:** the `app/` scaffold that gives a no-app repo something to build (`offer-app-scaffold` owns it — this change makes CI honest whether or not an app arrives); anything about Cloudflare Access; the `.env.example` and `.gitignore` drift (`fix-payload-config-drift`).

## Capabilities

### Modified Capabilities
- `stack-pack`: the Actions workflow requirement gains the unbuildable-repo path and the concurrency rule that keeps one deploy per branch.
- `cf-secret-parity`: the gate's skip requirement gains the missing case — no wrangler config at all.

## Impact

- `.github/workflows/deploy.yml` — the guard, the concurrency group, the job `if`.
- `scripts/cf-secrets.mjs` — skip instead of abort when no config resolves.
- `scripts/cf-build.sh` — `--app-dir` reports absence in a way the workflow can branch on rather than only exiting 1.
- `wiki/stack/d1-pipeline.md` — the red-check promise.
- `VERSION`, `CHANGELOG.md` (patch-level: 9.0.0 → 9.0.1, or folded into the next minor).
- Every repo that took the pack and has not yet provisioned — currently a red check on every push.

## Decision log

- **2026-08-02** — Implemented 18/20. **Reproduced both failures first** in a scratch pack repo with no wrangler config: `cf-build.sh --app-dir` exit 1, `cf-secrets.mjs check` abort — exactly as the proposal described.
  `cf-secrets.mjs check` now skips green on a missing config, joining the two existing skip cases. The non-exiting lookup is duplicated *inside* `cf-secrets.mjs` rather than added to `lib-wrangler-config.mjs`, because copy-if-absent never updates a library a repo already has — same constraint the file's existing header comment already documents. `push` behaviour deliberately untouched.
  `cf-build.sh --app-dir` gained **exit 3** for "no config yet", distinct from exit 1 for a real error. Implementation turned out cheaper than designed: the library's resolver *returns* non-zero rather than exiting, so guarding the call was enough — no duplicated search logic, and the two paths cannot disagree about which file they'd pick.
  `deploy.yml`: the locate step routes exit 3 to a green report naming `/wong-cloudflare`, all seven later steps gate on a `configured` output, concurrency keys on event+branch, and a job-level `if` limits runs to `push` plus fork PRs. The header now explains why **both** concurrency parts are required (GitHub evaluates concurrency before a job's `if`).
  Verified: skip/abort behaviour, that real binding drift still fails, that a provisioned repo's `--app-dir` output is byte-identical, and the locate step replayed against the fixture (exit 0, `configured=false`, summary names the skill).
  **Remaining:** 5.2/5.3 need a live push with an open PR — this PR's own CI run is that test.
- **2026-08-02** — Tasks 5.2/5.3 **verified live on PR #50**, which is the fixture the plan asked for: a provisioned repo with an open PR. Exactly the designed outcome — the `push` run deployed (`success`), the `pull_request` run was `skipped` by the job-level `if`, **zero cancelled runs**, one successful deploy, and `gh pr checks` exits `0`. That last one is the point: under the old concurrency key the loser was *cancelled*, which `gh pr checks` reports as `fail` and which would have blocked `/ship`. Change complete at 20/20.

<!-- end proposal.md -->
<!-- file design.md utf8 6284 -->
## Context

Two adopting agents independently reported that the pack's CI is broken on arrival, and both failures reproduce in a repo that took the pack and has not yet run `/wong-cloudflare`:

```
$ bash scripts/cf-build.sh --app-dir
wong: ERROR — no wrangler config found under <repo>          exit 1
$ node scripts/cf-secrets.mjs check
Could not find a wrangler config … — aborting.               exit 1
```

That state is not unusual — it is the state the pack **ships** in. `deploy.yml` is a drop-in file that lands with the rest of the pack, and the wrangler config is created later, by `/wong-cloudflare`, from a fragment. So the first push after adoption is red, and it is red twice over, at a step that runs before the token guard the workflow's comment describes as handling exactly this case.

The double-deploy is a separate defect in the same file. `concurrency` keys on `github.ref`, which differs between the two triggers of the same commit (`refs/heads/x` vs `refs/pull/N/merge`), so the group never collapses.

Both were found by people adopting the pack for real, not by reading it. The workflow's comments and `d1-pipeline.md` both assert the opposite of what the code does, which is why review never caught it.

## Goals / Non-Goals

**Goals:**
- A repo that took the pack gets a green check on its first push, before provisioning.
- One commit deploys exactly once, and `/ship` is not blocked by the fix.
- The preview URL keeps resolving for the commit `/save` and `/walk` look up.
- The docs' "never a permanently red check" claim becomes true rather than repeated.

**Non-Goals:**
- Giving a no-app repo something to build — `offer-app-scaffold` owns that. This change makes CI honest either way.
- Cloudflare Access, the token-variable drift, and the `.gitignore` fragment — separate changes.
- Changing which Worker a branch deploys to; the branch-split logic is untouched.

## Decisions

### The guard goes in the workflow, not in the scripts

`cf-build.sh --app-dir` exiting non-zero when there is no config is *correct* for a build: there is genuinely nothing to build, and a caller that ignores that would fail later and less clearly. What is wrong is the workflow treating a legitimate "nothing here yet" as a failure.

So the script keeps failing loudly for a real build, and gains a way for the workflow to ask the question without dying on the answer — a detection step whose non-zero result routes to a green "not configured yet" report. The alternative, making `--app-dir` exit zero and print nothing, was rejected: it would silently turn a genuine misconfiguration in a provisioned repo into an empty path and a confusing `npm ci` failure two steps later.

### `cf-secrets.mjs check` skips, because its own spec already says so

This one needs no judgement call — the requirement governing the gate states it "SHALL skip, not fail" on a repo that has not adopted the model, and enumerates two cases: no `env.staging`, and an unparseable `.toml`. "No config file at all" was simply missed, and it is the case that occurs *first* in every adoption. The fix restores the intent rather than changing it.

### The concurrency fix needs all three parts

The naive fix — key the group on the branch so the two triggers collapse — makes things worse. GitHub cancels the loser of a concurrency group, `gh pr checks` reports a cancelled run as `fail`, and `/ship` waits on `gh pr checks`. A shared group therefore trades an intermittent bad preview for a hard block on shipping.

The working shape, reported by an adopter who hit both traps:

```yaml
concurrency:
  group: deploy-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}
jobs:
  build:
    if: github.event_name == 'push' ||
        github.event.pull_request.head.repo.full_name != github.repository
```

- The group distinguishes the event, so the two triggers never cancel each other; within one event, a new commit still supersedes an in-flight run for the same branch.
- The `if` stops the redundant same-repo `pull_request` run from doing the work twice.
- Both are needed because **GitHub evaluates concurrency before a job's `if`** — a run destined to be skipped can still cancel the run doing the work. This is the part that makes the naive one-line fix look correct in testing and fail in practice.

`push` stays the deploying event because `save/scripts/preview-url.sh` resolves the preview by the branch head SHA; a `pull_request` SHA is the merge commit, which no deploy published. The fork branch of the `if` exists because a fork PR produces no push event in this repository, so without it a fork contribution would get no check at all.

## Risks / Trade-offs

- **`cancel-in-progress` semantics shift slightly** — cancellation now happens within an event rather than across both. Superseding an in-flight preview for the same branch still works, which is the behaviour that mattered; the production branch remains uncancelled as today.
- **A green check on an unconfigured repo could read as "it built"** → the step reports explicitly that the repo is not configured and names `/wong-cloudflare`, so the check is informative rather than merely passing.
- **Fork PRs deploy nothing** — they have no secrets, so they take the build-only path exactly as an unprovisioned repo does. No change, stated so nobody re-reports it.
- **A repo that already copied the broken workflow keeps it** — copy-if-absent never overwrites. The fixed file surfaces through `/wong-sync`'s adapt step as a proposal, which is the designed route; the changelog entry should say so plainly, since every existing pack repo is affected.

## Migration Plan

The workflow is a drop-in payload file, so new adopters get the fix by copy-if-absent. Existing pack repos have their own copy and will be *offered* the change through the adapt step — call this out in `CHANGELOG.md`, because the population that needs it is exactly the population that will not receive it automatically.

`VERSION` takes a patch bump (9.0.0 → 9.0.1) if released alone, or folds into the next minor if it ships alongside `offer-app-scaffold`.

## Open Questions

None. Both failures have a reproduction, and the concurrency fix has been run in a real repo by the adopter who reported it.

<!-- end design.md -->
<!-- file tasks.md utf8 2977 -->
## 1. Reproduce first

- [x] 1.1 Stand up (or reuse) a repo with the pack installed and no wrangler config, and confirm both failures: `bash scripts/cf-build.sh --app-dir` exits 1 and `node scripts/cf-secrets.mjs check` aborts
- [x] 1.2 Keep that repo as the fixture for task 5

## 2. scripts/cf-secrets.mjs — skip on no config

- [x] 2.1 Make the check skip with a success exit when no wrangler config resolves, matching the existing skip messages for no-`env.staging` and unparseable-config
- [x] 2.2 Confirm the real failures still fail: a binding missing from a declared `env.staging`, and Worker-against-Worker secret drift
- [x] 2.3 Leave `secrets:push` behaviour alone — its `.env` refusal and `CLOUDFLARE_*`/`CF_ACCESS_*` guards are untouched by this change

## 3. scripts/cf-build.sh — let the workflow ask without dying

- [x] 3.1 Give `--app-dir` a way for a caller to detect "no config / no app" without treating it as a build failure; keep a real build failing loudly per design.md
- [x] 3.2 Verify a provisioned repo's `--app-dir` output is unchanged

## 4. .github/workflows/deploy.yml

- [x] 4.1 Guard the `Locate the app` step so an unconfigured repo reports and exits green instead of failing, naming `/wong-cloudflare` as the next step
- [x] 4.2 Change the concurrency group to `deploy-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}`
- [x] 4.3 Add the job-level `if`: `github.event_name == 'push' || github.event.pull_request.head.repo.full_name != github.repository`
- [x] 4.4 Update the file's header comment to describe what it now actually does, including why both concurrency parts are needed (concurrency is evaluated before `if`)
- [x] 4.5 Confirm `push` remains the deploying event so the preview URL stays attached to the branch head SHA

## 5. Verify end to end

- [x] 5.1 Unconfigured pack repo: push and confirm a green check, with the "not configured" message naming the provisioning skill
- [x] 5.2 Provisioned repo with an open PR: push a commit and confirm exactly one deploy, one version bound to the alias, and no cancelled run
- [x] 5.3 Confirm `gh pr checks` reports success (not `fail` from a cancellation) so `/ship` is not blocked
- [x] 5.4 Confirm `.claude/skills/save/scripts/preview-url.sh` still resolves the preview URL for the commit

## 6. Docs

- [x] 6.1 Fix `wiki/stack/d1-pipeline.md`'s claim that the check "skips rather than fails … so adopting the pack never produces a permanently red check" — state the three skip conditions (no credential, no config, no `env.staging`)
- [x] 6.2 Check the rest of `wiki/stack/` for the same promise stated elsewhere and reconcile it

## 7. Release

- [x] 7.1 Bump `VERSION` (patch if shipped alone, else fold into the release it rides with)
- [x] 7.2 Add the `CHANGELOG.md` entry, stating explicitly that existing pack repos keep their own `deploy.yml` and will be *offered* the fix through `/wong-sync`'s adapt step rather than receiving it automatically

<!-- end tasks.md -->
<!-- file specs/cf-secret-parity/spec.md utf8 2923 -->
## MODIFIED Requirements

### Requirement: The gate skips cleanly on a repo that has not adopted the model

The parity gate's **secret** half SHALL detect the absence of `CLOUDFLARE_API_TOKEN` and skip with an explanatory message and a success exit status, rather than failing. This matches the workflow's existing behaviour of building without deploying before provisioning, so a repo that has not yet run provisioning gets a real pull-request check instead of a permanently red one. The **binding** half needs no credential and SHALL still run, so an unprovisioned repo gets that signal.

The **binding** half SHALL likewise skip, not fail, when the wrangler config declares no `env.staging` at all. The gate's purpose is catching drift *within* the two-Worker model, not requiring a repo to adopt it: a repo partway through the adoption runbook, or one shipping a template app, would otherwise get exactly the permanently red check the pack's CI is designed to avoid. A binding missing from a *declared* `env.staging` still fails.

**Where no wrangler config exists at all, the gate SHALL skip and exit zero.** This is the state the pack ships in — its CI arrives before `/wong-cloudflare` creates the config — so it is the *first* state the gate is ever evaluated in, not an edge case. Aborting here fails the check on a new adopter's first push, before they have done anything wrong. The absence of a config SHALL be treated exactly as the absence of `env.staging` is: nothing to compare, so nothing to report.

Where the config cannot be parsed as an object at all (a `wrangler.toml`), the gate SHALL report that it cannot check and continue, rather than inferring bindings.

The three skip conditions — no credential, no config, no `env.staging` — SHALL be stated together wherever the gate's behaviour is documented, so that "the check never produces a permanently red check" is a claim the code actually satisfies.

#### Scenario: No credential means skip, not fail

- **WHEN** the workflow runs on a repo where `CLOUDFLARE_API_TOKEN` is unset
- **THEN** the parity step reports that it is skipping the secret comparison because the repo is not provisioned
- **AND** the check does not fail
- **AND** the binding comparison still runs

#### Scenario: No wrangler config means skip, not abort

- **WHEN** the gate runs in a repo that has the pack installed but no wrangler config yet
- **THEN** it reports that there is no config to check and exits zero
- **AND** the workflow step passes

#### Scenario: Provisioning turns the gate on with no further edit

- **WHEN** a repo is provisioned and the secret is set
- **THEN** the same unchanged workflow step begins enforcing parity

#### Scenario: A repo not on the two-Worker model is not failed for it

- **WHEN** the gate runs against a wrangler config with no `env.staging`
- **THEN** it reports that it is skipping the binding comparison and exits zero

<!-- end specs/cf-secret-parity/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 5486 -->
## MODIFIED Requirements

### Requirement: The pack ships a GitHub Actions workflow as its CI

The pack SHALL include a GitHub Actions workflow file that runs the pack's build and deploy scripts on push, supplying the branch name they need and reading the Cloudflare credentials from GitHub repository secrets. It SHALL be a drop-in payload file subject to the same copy-if-absent, never-overwrite rule as every other pack file, and SHALL surface as a pull-request check so the existing delivery gate has something to wait on.

The workflow SHALL NOT reimplement any branch logic. Deciding which database to migrate and which Worker to deploy to belongs to `scripts/cf-build.sh` and `scripts/cf-deploy.sh`, so that both CI backends run identical code and the deploy model is independent of the CI choice.

Where the Cloudflare credentials are absent, the workflow SHALL build without deploying, so a repo that took the pack but has not yet been provisioned gets a useful check rather than a permanently failing one. That path SHALL NOT route through the build wrapper, which requires a staging environment an unprovisioned repo does not yet have.

**No step that runs before the credential guard SHALL fail on a repo the pack has been installed into but not yet configured.** The pack ships its CI before a wrangler config exists, so "installed, not yet provisioned" is the default state and every step reachable in it SHALL either succeed or skip. Where the workflow can find neither a wrangler config nor an app to build, it SHALL report that the repo is not yet configured, name the provisioning skill, and **exit green**. A step that aborts in this state produces exactly the permanently red check this requirement exists to prevent, and does so on the first push a new adopter makes.

#### Scenario: A pack repo gains a PR check

- **WHEN** a repo that took the pack pushes a branch and opens a pull request
- **THEN** the workflow runs and reports as a check on that pull request
- **AND** `/save` and `/ship` wait on it through the existing check-waiting path

#### Scenario: An unprovisioned repo still gets a green check

- **WHEN** the workflow runs in a repo with no `CLOUDFLARE_API_TOKEN` secret
- **THEN** it builds the app and deploys nothing
- **AND** it reports why, naming the provisioning skill as the next step

#### Scenario: A repo with no wrangler config is not failed for it

- **WHEN** the workflow runs in a repo that has the pack but no wrangler config — the state the pack ships in
- **THEN** no step aborts, the job reports that the repo is not yet configured, and the check is green
- **AND** the message names `/wong-cloudflare` as what turns deploying on

#### Scenario: The workflow is never overwritten

- **WHEN** `/wong-sync` runs in a repo that already has the workflow file
- **THEN** the existing file is left untouched
- **AND** any upstream change to it surfaces through the adapt step as a proposal

## ADDED Requirements

### Requirement: One commit deploys once

A commit on a branch SHALL produce exactly one deploy. The pack's workflow triggers on both `push` and `pull_request`, and those two events SHALL NOT both deploy the same commit: two concurrent `wrangler versions upload` calls race to bind the same per-commit preview alias, and while the race settles the alias intermittently serves Cloudflare's placeholder page — indistinguishable, to the person looking at it, from a failed deploy.

Three constraints hold together, and satisfying only some of them reintroduces the problem in a different form:

- **The concurrency group SHALL distinguish the event as well as the branch.** Keying on the branch alone makes the two triggers share a group, and GitHub **cancels** the loser. `gh pr checks` reports a cancelled run as `fail`, so a shared group converts a double deploy into a blocked `/ship`.
- **A job-level condition SHALL prevent the redundant run from starting** — `push`, plus pull requests whose head repository differs from the base (forks, which produce no push event in this repo). A same-repo pull request is already covered by its own push.
- **`push` SHALL remain the deploying event.** Its `github.sha` is the branch head, which is what the preview-URL resolver looks up; a `pull_request` SHA is the merge commit, which no deploy ever published.

The condition alone SHALL NOT be relied on, because **GitHub evaluates concurrency before a job's `if`** — a run that will be skipped can still cancel the run doing the work.

#### Scenario: A branch with an open PR deploys once

- **WHEN** a commit is pushed to a branch that has an open pull request in the same repository
- **THEN** exactly one job deploys it
- **AND** no second job uploads a version bound to the same preview alias

#### Scenario: A skipped run cancels nothing

- **WHEN** the redundant `pull_request` run is skipped by its condition
- **THEN** the `push` run that is deploying is not cancelled
- **AND** the check reports success rather than cancellation

#### Scenario: The preview URL still resolves

- **WHEN** the deploy publishes a preview URL for a branch commit
- **THEN** the URL is attached to the branch head SHA
- **AND** `.claude/skills/save/scripts/preview-url.sh` resolves it for that commit

#### Scenario: A fork pull request still gets a check

- **WHEN** a pull request arrives from a fork, which produces no push event in this repository
- **THEN** the `pull_request` run executes so the contribution is still checked

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
