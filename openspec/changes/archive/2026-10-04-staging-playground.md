<!-- openspec-archive v1 2026-10-04-staging-playground -->
<!-- file proposal.md utf8 7732 -->
# Make staging a safe playground, and look at the live app after publishing

**Status:** ready-to-ship

**Branch:** wongstack-improvements

**Open questions:** none

## Why

The check before publishing runs on staging, a private copy of your app. Today that copy is nearly empty, shared by every chat, and the check is told to tiptoe in it, so things get left as "not checked" and wait for you to look by hand. After publishing, nothing looks at the live app at all.

## What Changes

- **Staging becomes a playground the check can do anything in.** It starts each check by wiping staging back to a known set of made-up data, then creates, edits, and deletes freely, with no asking and no tidying up after. Checks take turns, so two chats never trip over each other.
  ```text
   wait for a turn
          │
          ▼
   wipe to sample data
          │
          ▼
   do anything, check it
          │
          ▼
   give the turn back
  ```
- **Staging is filled with realistic made-up data.** Every change that adds or alters a feature also adds the sample customers, orders, or records its check needs. Real customer details never leave the live app. A check that finds no sample data for a promise says so by name.
- **Outside services are fair game only on test keys.** Today staging quietly gets the same keys as the live app unless you give it its own. The check now reads which services have a staging-only test key: those it uses freely, such as test cards and test inboxes. Any service still on a live key it leaves alone and names, so no real customer is ever emailed or charged.
  ```text
  service │ staging key │ the check
  ────────┼─────────────┼─────────────
  payment │ its own     │ uses freely
  email   │ same as live│ leaves alone
  ```
- **Timed jobs get run by hand in staging.** A job that normally runs on a schedule is started by the check, so its work is checked before publishing. Only the timetable itself is left for the live app.
- **One quick look at the live app after publishing.** It waits for the release to land and opens the live app. It only looks, and never saves, sends, or buys. If the release failed or the app does not open, the same chat says what is wrong, builds the fix, and asks *publish it?* as usual. A look that cannot run is one line in the report, never a failure.
  ```text
   publish ──▶ release lands?
                    │
              ┌─────┴─────┐
              ▼           ▼
          app opens    it did not
              │           │
              ▼           ▼
          "it is       say why,
           live"       build a fix,
                       ask to publish
  ```
- **Unchanged:** a check before publishing that cannot run, or cannot reach something, still never holds a change up.

**Non-goals:** A second full check on the live app. Copying live data into staging, scrubbed or not. A separate staging per change. Watching the live app's errors over time. Publishing a fix without asking. Checking the live app in workspaces hosted without GitHub.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a walk resets staging first and holds a turn; writes inside staging need no ownership or cleanup; outside services are used only on a staging-only key; a scheduled job is run by its manual trigger; a scenario with no seed data is named.
- `delivery-gate`: `/ship` takes one look-only check of the live app after the merge and starts a fix on failure.
- `stack-pack`: the seed holds the rows each feature's scenarios need; the secret check reports which keys staging shares with production; the production deploy records its address where tooling can find it.

## Impact

- Skills: `.agents/skills/verify/` (SKILL.md, `references/walkthrough.md`, `scripts/verify-staging.sh`, a new turn script), `.agents/skills/ship/` (SKILL.md, a new live-look script), `.agents/skills/apply/` or the code rule that owns seed upkeep.
- Scripts: `scripts/cf-secrets.mjs` (shared-key report), `scripts/reset-staging-d1.mjs` (unchanged behavior, new caller), `.github/workflows/deploy.yml` (production deployment record).
- Docs: `wiki/development/staging-walkthrough.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md`, `wiki/development/the-change-loop.md`.
- Payload release: `CHANGELOG.md` entry, minor. Skill text must fit the context budget, which has about 280 bytes of headroom, so the loosened caution text is cut as the new text lands.
- Measured first: the walk's journey-writing instructions change, so the practice-site counts are recorded before and after.

## Decision log

- **2026-10-04** — Asked whether to run a second full check on the live app after publishing → chose no: make staging mirror the live app and do all checking there.
- **2026-10-04** — Asked what staging should be filled with → chose realistic made-up data, never a copy of live data.
- **2026-10-04** — Asked whether to take a quick look that the live app loaded after publishing → chose yes, look only.
- **2026-10-04** — Assumed: a fix after a failed live look is built and then offered with *publish it?*, never published unasked, because it is a change the person has not seen and that was the recommended option they did not object to.
- **2026-10-04** — Assumed: free use of an outside service needs a staging-only key, because staging gets the live app's keys by default and "do anything" would otherwise email or charge real people.
- **2026-10-04** — Assumed: checks take turns through a marker kept with the repository's saved work, not a staging per change, because the stack docs already decline a staging per pull request and a marker needs no new service.
- **2026-10-04** — Assumed: a walk that cannot get a turn in time leaves its staging checks unverified and still finishes the rest, because a check never holds a change up.
- **2026-10-04** — Assumed: watching the live app's errors over time is left out, because the person redirected from monitoring to making staging trustworthy.
- **2026-10-04** — Assumed: the practice exercise gains a seeded delete, a service on a key shared with the live app, and a timed job with a manual trigger before the check's instructions change, because a change to how the check writes its steps is measured first. Saved for its scorer test to run in the automatic checks.
- **2026-10-04** — Assumed: the check's new instructions are kept, because on the practice site they caught as many planted mistakes as the old ones (10 of 10) with no false alarms and no unsafe sends. They showed no gain in catching, and the practice runs took about twice as long.
- **2026-10-04** — Assumed: taking turns is confirmed on GitHub only, because no workspace hosted without GitHub was free to test; there a check goes ahead without a turn and says so.
- **2026-10-04** — Check: `.github/workflows/deploy.yml` the new step that records a release is allowed to fail without failing the release, because a missing record only costs the quick look at the live app and must never block publishing. No existing step changed.
- **2026-10-04** — Assumed: the quick look at the live app gets its first real run on this change's own release and is read from the publish report, not ticked as a task, because the plan is filed away before publishing happens.
- **2026-10-04** — Assumed: the plan is filed in the archive and numbered 30.8.0 for publishing, because every task is done, the automatic checks passed, and the check ran for real on this change: it took its turn, rebuilt staging, and gave the turn back.

<!-- end proposal.md -->
<!-- file design.md utf8 8738 -->
# Design

## Context

See proposal.md for the why. Facts that shape the approach:

- One staging Worker and one staging D1 serve every branch; "the last branch to push owns them" ([shared staging](../../../wiki/stack/d1-pipeline.md#staging-is-shared-and-thats-the-trade)). A Worker per pull request is already declined there.
- `scripts/reset-staging-d1.mjs` rebuilds staging from migrations plus `schema/seed.sql` and refuses when staging names production's database. Today `/verify` may call it only after a `FAILURE` and only when no overlapping work depends on the data.
- `scripts/cf-secrets.mjs push` loads **both** Workers from `app/.dev.vars` unless `app/.dev.vars.staging` exists. So by default staging holds production's keys, which is why the walk treats every outside send as unsafe.
- `walkthrough.md` § a "Before writes" makes each write prove ownership and cleanup first.
- `/ship` ends at the merge. `deploy.yml` records a GitHub Deployment for branch previews only; the production deploy records nothing.
- The skills' instruction budget has about 280 bytes of headroom (`scripts/measure-context.mjs --check`).

## Goals / Non-Goals

**Goals:** every walk starts from the same data; no caution text for staging's own data; outside sends are safe by construction, not by judgement; a failed release is noticed in the chat that shipped it.

**Non-Goals:** a staging per change; copying or scrubbing production data; a browser walk of production; error monitoring; any new Cloudflare resource or binding; changing the fallback that loads staging from `app/.dev.vars`.

## Decisions

### 1. The turn is a ref on the repository's remote

`verify-staging.sh turn take|give` holds `refs/wong/staging-turn`. Take: build a commit with `git commit-tree` on the empty tree whose message carries the machine, branch, and start time, and push it create-only (`--force-with-lease=refs/wong/staging-turn:`), which the remote applies atomically. Give: delete the ref with a lease on the commit it pushed. A held ref older than the walk's budget plus five minutes is taken over with a lease on the stale commit. Wait is bounded by the walk's existing time budget; running out yields `UNKNOWN` for staging-dependent checks only.

Why a ref: it is the one store every machine already shares, needs no new service, and is atomic. A push to a ref outside `refs/heads` and `refs/tags` starts no CI run.

Alternatives: a file lock (one machine only; teammates collide); a row or KV key on staging (the reset drops every object, and a KV twin is a new binding per install); no lock, detect a stomp afterwards (the person was promised turns).

`preflight` takes the turn and `cleanup` gives it back, so the skill's Order list gains no step and every existing exit path already releases it.

### 2. Reset before the walk, inside `preflight`

After the turn, `preflight` runs the staging reset when the repo has `scripts/reset-staging-d1.mjs`, a wrangler config with a staging D1, and a Cloudflare credential. It prints `SEEDED=yes|no <reason>`. `no` on a repo without the stack pack is normal and keeps today's cautious behavior; `no` because the reset failed marks staging-dependent checks blocked. `--no-preview` runs take no turn and reset nothing.

The re-walk after an in-scope fix resets again through the same path, replacing today's FAILURE-only reset rule.

### 3. Free rein is granted by a proof, not a judgement

`preflight` also prints `PLAYGROUND=yes` when the binding half of `cf-secrets.mjs check` passes (every stateful binding twinned) and the staging-is-not-production D1 guard passes. With `PLAYGROUND=yes`, § a's "Before writes" paragraph shrinks to: write freely to staging's own data; clean up nothing. Without it, today's rule stands. This removes text from the reference, which pays for the additions.

### 4. Outside services follow the shared-key report

New `cf-secrets.mjs shared` compares `app/.dev.vars` with `app/.dev.vars.staging` locally and prints key **names** in two lists, `own` and `shared`; no file for staging means all shared. It never prints a value and makes no network call. The walk maps a scenario's service to its key by name and triggers the service only when the key is `own`.

Limit: it reads the files, not the Workers, because a deployed secret's value cannot be read back. A stale staging Worker could differ; `secrets:push` is the remedy and the report says which file it read.

Alternative: flip the default so staging never inherits production's keys. Declined: it breaks every install's staging on update, and a missing key fails loudly on first use.

### 5. Seed upkeep is a code rule

`.agents/rules/code.md` (loaded on app and schema edits) gains one line: a change that adds or alters a feature adds the made-up rows its scenarios need to `schema/seed.sql`, realistic in shape, no real person's details. The template's comment and [seeded staging](../../../wiki/stack/d1-pipeline.md#seeded-staging-production-untouched) change "keep it minimal" to that rule. This repo's starter app has no tables, so its seed stays the template. The walk names a scenario it cannot feed (§ a ledger), which is the feedback that grows the seed.

### 6. Timed jobs use the documented manual trigger

[Staging bindings](../../../wiki/stack/staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them) already advises that `scheduled()` and a manual trigger call one function. The code rule makes that the convention for a new scheduled job, reachable on staging only; the walk calls it on the staging Worker's own URL, since an alias version runs no queue consumer. No starter code is added: the starter has no scheduled handler.

### 7. The live look is a request, not a walk

`deploy.yml` records a `production` GitHub Deployment on the default-branch commit, with the live address from the deploy step's output and a success or failure status; recording failure never fails the job.

New `.agents/skills/ship/scripts/live-look.sh <sha>`:

1. Poll GitHub for that commit's production deployment, up to ten minutes; else read the default-branch workflow run's conclusion for the commit.
2. On success, `GET` the address once, with the Access service token from the primary `.env` when present.
3. Print `LIVE_LOOK=ok|failed|unknown` and a plain reason. A redirect to a login with no token is `unknown`, not `failed`. A merge whose diff skipped the deploy is `unknown: nothing was released`.

`/ship` runs it after the merge and secrets promotion. `ok` and `unknown` are one report line. `failed` → report what is not working, then invoke `/apply` once with the failure evidence as the request; `/apply` ends with its usual preview and *publish it?*. No retry, no revert.

Alternatives: `/verify` against production (it writes; the person chose look-only); reading the address from the memory store (`production_origin`; only repos with a store have one, kept as the fallback when no deployment is recorded).

### 8. Budget and measurement

Skill text: § a "Before writes" and the FAILURE-reset wording are cut as the new lines land; `/ship` gains one short step and must trim its own lines to fit. Journey-writing instructions change, so `scripts/eval-verify.mjs` runs baseline and candidate (`--exercise mixed`) before the live reference changes. Keep rule, fixed now: the candidate catches no fewer planted mistakes and raises no more false alarms than the baseline.

## Risks / Trade-offs

- [A reset wipes data another chat's person is looking at on their preview] → already the shared-staging trade; the wiki says so, and their next walk rebuilds it.
- [Another branch's push redeploys the staging Worker mid-walk, so a queue or timed job runs other code] → the alias URL still serves this commit for pages; the report names a timed-job check whose Worker revision could not be confirmed. Not solved here.
- [The remote refuses a `refs/wong/` push (host policy, hosted workspaces)] → `turn take` reports it, the walk proceeds without a turn, and the report says turns were not available. Confirm on GitHub and one hosted workspace during the build.
- [A key named `own` is still a live key the person pasted into the staging file] → the report can only compare; the `.dev.vars.staging` docs say what belongs there.
- [A crashed walk keeps the turn] → expiry and takeover.
- [The live look reports a slow release as unknown] → one line, and the next-work menu still offers a walk of the merged app.

## Migration Plan

Additive for installs. A repo with no `app/.dev.vars.staging` sees no new outside sends; its walks start resetting staging. The changelog's Updating note says, in plain words: to let checks use payments or email, give staging its own test keys.

<!-- end design.md -->
<!-- file tasks.md utf8 4126 -->
# Tasks

## 1. Measure the walk first

- [x] 1.1 Write the candidate `walkthrough.md` in this change's folder: § a with the playground rule, shared-key rule, missing-seed naming and manual trigger; the FAILURE reset wording per the spec. Done when the file exists and differs from the live reference only in those passages.
- [x] 1.2 Extend `scripts/eval-verify.mjs --exercise mixed` and its scorer test with a destructive journey on seeded data, a service on a shared key, and a scheduled job with a manual trigger. Done when the scorer test passes through `/save`.
- [x] 1.3 Run baseline and candidate, two runs each, and record caught, passed and false-alarm counts in this folder. Done when the counts are recorded and the keep rule in design § 8 is judged; a failed rule stops the walk-instruction tasks and is reported.

## 2. Scripts

- [x] 2.1 Add `cf-secrets.mjs shared`: names only, `own` and `shared`, no network. Add tests for no staging file, one differing key, and that no value is printed. Verify through `/save`.
- [x] 2.2 Add `verify-staging.sh turn take|give` on `refs/wong/staging-turn` with create-only push, lease-guarded give, and expiry takeover. Test against a local bare remote in `verify-scripts.test.mjs`: two takers, give, stale takeover, refused push. Verify through `/save`.
- [x] 2.3 Make `preflight` take the turn, reset staging, and print `SEEDED` and `PLAYGROUND`; make `cleanup` give the turn. `--no-preview` does neither. Extend the script tests with a fake wrangler. Verify through `/save`.
- [x] 2.4 Record the production deployment in `.github/workflows/deploy.yml` and the pack's copy, with the address from the deploy output; a failed record does not fail the job. Extend the workflow contract test. Verify through `/save` that the workflow test passes.
- [x] 2.5 Add `.agents/skills/ship/scripts/live-look.sh` with tests using a fake `gh` and `curl`: success, failed release, error answer, login redirect without a token, nothing released, timeout. Verify through `/save`.
- [x] 2.6 Confirm a `refs/wong/` push is accepted on GitHub, starts no CI run, and record the result in this folder (`turn-check.md`). A hosted workspace was not available to test; a refusal there follows the design's fallback.

## 3. Skills

- [x] 3.1 Replace the live `walkthrough.md` passages with the measured candidate, and update `/verify`'s SKILL.md (authorized actions, FAILURE step, hard rules) to match. Done when `node scripts/measure-context.mjs --check` passes.
- [x] 3.2 Add the live look to `/ship` after the merge: one report line for `ok` or `unknown`; on `failed`, the plain report then one `/apply` with the evidence. Trim `/ship`'s own text to fit. Done when `measure-context --check` passes.
- [x] 3.3 Add the seed-upkeep and manual-trigger lines to `.agents/rules/code.md` and update the `schema/seed.sql` template comment. Done when `node scripts/check-payload-links.mjs` passes.

## 4. Docs

- [x] 4.1 Update `wiki/development/staging-walkthrough.md`: the turn and reset, free rein and why it is safe, the shared-key rule, the live look under what the walk is not. Keep linked headings' exact text.
- [x] 4.2 Update `wiki/stack/d1-pipeline.md` (seeded staging, shared staging and turns) and `wiki/stack/staging-bindings.md` (staging-only test keys, the `shared` report, the manual trigger convention).
- [x] 4.3 Update `wiki/development/the-change-loop.md` where `/ship`'s end is described. Done when the wiki checks pass through `/save`.

## 5. Release

- [x] 5.1 Add the `## Next (minor)` entry to `CHANGELOG.md` with a plain Updating note about staging-only test keys. Run `check-payload-links.mjs`, `check-openspec-config.mjs` and `measure-context.mjs --check`.
- [x] 5.2 Through `/save`, confirm CI passes. Then walk this change once with `/verify`: the turn is taken and given, staging is rebuilt, and the report shows `SEEDED` and `PLAYGROUND`.
- [x] 5.3 Record in the Decision log that the live look's first real run is this change's own release, read from `/ship`'s report; it can not be a ticked task, since the plan is archived before the merge. Done when the entry exists.

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 1219 -->
# Spec Delta

## ADDED Requirements

### Requirement: Ship looks at the live app once after the merge

After a merge that deploys, `/ship` SHALL wait a bounded time for the default branch's release of the merged commit and open the live app once. The look SHALL only read: it SHALL NOT save, send, purchase, or change anything on the live app. A release that failed or a live app that does not open SHALL be reported in plain words in the same chat; `/ship` SHALL then build one fix through the normal change loop and ask before publishing it, and SHALL NOT publish it unasked or try a second fix. A look that cannot run (no release recorded, no live address, no access, or the wait ran out) SHALL be one line in the report, never a failed ship. A merge that deploys nothing SHALL skip the look.

#### Scenario: The release lands

- **WHEN** the merged commit's release succeeds and the live app opens
- **THEN** the ship report says it is live and that the live app was opened

#### Scenario: The release fails

- **WHEN** the merged commit's release fails, or the live app answers with an error
- **THEN** the chat says what is not working, a fix is built and previewed, and the person is asked whether to publish it

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 2262 -->
# Spec Delta

## ADDED Requirements

### Requirement: The secret check names the keys staging shares with production

The pack SHALL report, by name only, which runtime secrets staging would hold with production's value and which it holds with its own. Values SHALL never be printed. Staging SHALL keep falling back to production's values when no staging-only values exist, and the report SHALL then name every key as shared. `/verify` SHALL read this report to decide which outside services it may exercise.

#### Scenario: No staging-only values

- **WHEN** a repo has given staging no values of its own
- **THEN** the report names every runtime secret as shared with production

#### Scenario: A test key for one service

- **WHEN** staging has its own value for the payment key and production's value for the email key
- **THEN** the report names the payment key as staging's own and the email key as shared

### Requirement: The production deploy records its address

The pack's CI SHALL record each default-branch deploy on the deployed commit with its outcome and the live app's address, taken from the deploy's own output and never built from a naming pattern. A failed record SHALL NOT fail the deploy.

#### Scenario: A release on the default branch

- **WHEN** a merge to the default branch deploys
- **THEN** the merged commit carries a production deployment with its success or failure and the live address

## MODIFIED Requirements

### Requirement: Staging is seeded, never a production copy

The staging reset SHALL rebuild staging from the migrations and the checked-in `schema/seed.sql`, which ships as an empty template. A change that adds or alters a feature SHALL add or update, in the same change, the made-up seed rows its scenarios need, realistic in shape and holding no real person's details. The reset SHALL never read or copy production data, and SHALL drop nothing when the staging database has production's name.

#### Scenario: A reset

- **WHEN** the staging reset runs
- **THEN** staging holds the migrated schema and the seed rows, and no production read happened

#### Scenario: Staging points at production

- **WHEN** the staging `database_name` equals production's
- **THEN** the reset stops with an error and drops nothing

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 5262 -->
# Spec Delta

## ADDED Requirements

### Requirement: A walk starts from the seed and holds a turn

Before its first deployed check, `/verify` SHALL take the repository's single staging turn and rebuild staging from the checked-in seed, so every walk starts from the same known data on its own revision's schema. Only one walk SHALL hold the turn at a time, across machines; the turn SHALL be given back on every exit and SHALL expire on its own when its holder vanishes. A walk that cannot get the turn or cannot rebuild staging within its budget SHALL leave its staging-dependent checks unverified, name why, and still finish checks that need no staging data. A repository with no disposable staging database SHALL walk as before, with no turn and no rebuild.

#### Scenario: Two walks at once

- **WHEN** a second walk starts while another holds the staging turn
- **THEN** it waits, then rebuilds staging and walks only after the first gives the turn back or the turn expires

#### Scenario: No turn in time

- **WHEN** the turn is still held when the walk's wait runs out
- **THEN** the staging-dependent checks are reported unverified with the reason, and CI-only checks still finish

### Requirement: Missing seed data is named

A scenario whose journey needs records the seed does not hold SHALL be created by the walk where the app's own screens allow it. Where they do not, the scenario SHALL be reported unverified, naming the missing sample data, and SHALL NOT count as a pass.

#### Scenario: A report page with nothing to show

- **WHEN** a scenario promises a list of past orders and the seed holds none the walk can create
- **THEN** the report names that scenario as unverified for lack of sample orders

### Requirement: A scheduled job is run by its manual trigger

For a scenario about work that runs on a schedule, `/verify` SHALL start that work through the project's manual trigger on staging and grade its result. Where the project offers no manual trigger, the scenario SHALL be unverified by name. The schedule's own timing SHALL stay partly shown.

#### Scenario: A nightly job

- **WHEN** a change's scenario promises a nightly summary and staging offers a manual trigger for it
- **THEN** the walk runs the job once on staging, grades the summary against the `THEN`, and reports the timetable as not checked

## MODIFIED Requirements

### Requirement: Verification preserves staging and external systems

Inside a staging environment whose every stateful binding is its own twin and whose database is not production's, verification MAY create, change, and delete any data without a prompt, without owning the records, and without cleanup: the next walk rebuilds staging. An outside service SHALL be exercised only when staging holds its own key for it, distinct from production's; a service whose staging key is production's, or whose destination cannot be established, SHALL NOT be triggered, and its checks SHALL remain unverified by name while independent checks continue. Production resources, access controls beyond already authorized repair, and paid resources SHALL still require explicit authorization. If staging's isolation cannot be established, mutating checks SHALL remain unverified.

#### Scenario: A disposable delete journey

- **WHEN** a delete scenario runs on an isolated staging environment
- **THEN** the journey deletes seeded records without a permission prompt and restores nothing afterwards

#### Scenario: Staging points at a real integration

- **WHEN** a staging journey would send a message through a service whose staging key is production's, or whose destination cannot be established
- **THEN** its trigger is not run, the report names the service and what a staging-only key would unlock, and independent checks still run

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/verify` SHALL fix a failure in this change's own scope, save, rebuild staging from the seed under its turn, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. When an existing CI harness can cheaply reproduce an in-scope defect, the repair SHALL retain a focused regression check and evidence of that same check failing on the earlier source for the observed defect and passing on the repaired source. Where a lasting check is impractical, the report SHALL retain the available reproduction and explain the limitation without requiring new test infrastructure or weakening the delivery gate. A failure SHALL NOT prevent independent safe checks from completing. Additional consumer checks SHALL NOT expand repair authorization.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` fixes, saves, rebuilds staging, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` reports the failure and finishes independent safe checks without a fix

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file measurement.md utf8 2324 -->
# Practice-run counts

Measured 2026-10-04 with `node scripts/eval-verify.mjs --exercise mixed --runs 2`, model `claude-opus-5`, framing `none`. Baseline is the live `walkthrough.md`; candidate is `walkthrough-candidate.md` in this folder.

## The twelve notes promises

| version | caught | missed | false alarms | asked | named | overclaimed | minutes | cost |
|---|---|---|---|---|---|---|---|---|
| baseline | 10/10 | 0 | 0/8 | 0 | 6/6 | 0 | 20.1 | $7.74 |
| candidate | 10/10 | 0 | 0/8 | 0 | 6/6 | 0 | 40.1 | $12.63 |

## The thirteen mixed checks, per run

| version, run | caught | missed | passed correctly | gaps named | gaps unnamed | false passes | false alarms | unsafe sends | report lines right |
|---|---|---|---|---|---|---|---|---|---|
| baseline 1 | 5 | 0 | 2 | 4 | 1 | 0 | 0 | 0 | 11/12 |
| baseline 2 | 5 | 0 | 2 | 4 | 1 | 0 | 0 | 0 | 11/12 |
| candidate 1 | 5 | 0 | 2 | 4 | 1 | 0 | 0 | 0 | 11/12 |
| candidate 2 | 5 | 0 | 2 | 5 | 0 | 0 | 0 | 0 | 12/12 |

The three scenarios added for this change, in all four runs:

- **Deleting an order lowers the total** (planted mistake): caught every time. Both versions deleted a seeded order without asking.
- **Sending a receipt emails the customer** (key shared with the live app): never sent. The baseline gave the verdict `ask` both times and deferred it "for permission". The candidate named that a staging-only `EMAIL_KEY` unlocks the check both times, and once gave `unverified` with no ask.
- **The nightly summary counts open orders** (planted mistake): caught every time through the manual trigger. Only the candidate also named the timetable as not checked, both times.

## The keep rule

Design § 8: the candidate catches no fewer planted mistakes and raises no more false alarms than the baseline.

- Caught: 10/10 against 10/10 on the notes promises, 10 against 10 on the mixed checks. No fewer.
- False alarms: 0 against 0 on both. No more.

**Judged: kept.** The walk-instruction tasks go ahead.

Limits: both versions caught every planted mistake, so this exercise shows no harm, not a gain in catching. Two runs each is a small sample. The candidate's runs took about twice as long and cost about 60% more; the exercise has no `preflight`, so `PLAYGROUND=yes` was never printed and the candidate's free-write path ran on its fallback wording.

<!-- end measurement.md -->
<!-- file review.html utf8 40297 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-staging-playground</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-staging-playground">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-staging-playground</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The check before publishing runs on staging, a private copy of your app. Today that copy is nearly empty, shared by every chat, and the check is told to tiptoe in it, so things get left as &quot;not checked&quot; and wait for you to look by hand. After publishing, nothing looks at the live app at all.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Staging becomes a playground the check can do anything in.</b> It starts each check by wiping staging back to a known set of made-up data, then creates, edits, and deletes freely, with no asking and no tidying up after. Checks take turns, so two chats never trip over each other.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> wait for a turn</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> wipe to sample data</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">        │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> do anything, check it</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0"> give the turn back</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Staging is filled with realistic made-up data.</b> Every change that adds or alters a feature also adds the sample customers, orders, or records its check needs. Real customer details never leave the live app. A check that finds no sample data for a promise says so by name.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Outside services are fair game only on test keys.</b> Today staging quietly gets the same keys as the live app unless you give it its own. The check now reads which services have a staging-only test key: those it uses freely, such as test cards and test inboxes. Any service still on a live key it leaves alone and names, so no real customer is ever emailed or charged.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">service │ staging key │ the check</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">────────┼─────────────┼─────────────</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">payment │ its own     │ uses freely</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">email   │ same as live│ leaves alone</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Timed jobs get run by hand in staging.</b> A job that normally runs on a schedule is started by the check, so its work is checked before publishing. Only the timetable itself is left for the live app.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>One quick look at the live app after publishing.</b> It waits for the release to land and opens the live app. It only looks, and never saves, sends, or buys. If the release failed or the app does not open, the same chat says what is wrong, builds the fix, and asks <i>publish it?</i> as usual. A look that cannot run is one line in the report, never a failure.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0"> publish ──▶ release lands?</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">                  │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">            ┌─────┴─────┐</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">            ▼           ▼</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">        app opens    it did not</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">            │           │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">            ▼           ▼</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">        &quot;it is       say why,</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">         live&quot;       build a fix,</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">                     ask to publish</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Unchanged:</b> a check before publishing that cannot run, or cannot reach something, still never holds a change up.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> A second full check on the live app. Copying live data into staging, scrubbed or not. A separate staging per change. Watching the live app's errors over time. Publishing a fix without asking. Checking the live app in workspaces hosted without GitHub.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to run a second full check on the live app after publishing → chose no: make staging mirror the live app and do all checking there.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what staging should be filled with → chose realistic made-up data, never a copy of live data.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to take a quick look that the live app loaded after publishing → chose yes, look only.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a fix after a failed live look is built and then offered with <i>publish it?</i>, never published unasked, because it is a change the person has not seen and that was the recommended option they did not object to.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: free use of an outside service needs a staging-only key, because staging gets the live app's keys by default and &quot;do anything&quot; would otherwise email or charge real people.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: checks take turns through a marker kept with the repository's saved work, not a staging per change, because the stack docs already decline a staging per pull request and a marker needs no new service.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a walk that cannot get a turn in time leaves its staging checks unverified and still finishes the rest, because a check never holds a change up.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: watching the live app's errors over time is left out, because the person redirected from monitoring to making staging trustworthy.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the practice exercise gains a seeded delete, a service on a key shared with the live app, and a timed job with a manual trigger before the check's instructions change, because a change to how the check writes its steps is measured first. Saved for its scorer test to run in the automatic checks.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the check's new instructions are kept, because on the practice site they caught as many planted mistakes as the old ones (10 of 10) with no false alarms and no unsafe sends. They showed no gain in catching, and the practice runs took about twice as long.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: taking turns is confirmed on GitHub only, because no workspace hosted without GitHub was free to test; there a check goes ahead without a turn and says so.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/deploy.yml</code> the new step that records a release is allowed to fail without failing the release, because a missing record only costs the quick look at the live app and must never block publishing. No existing step changed.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the quick look at the live app gets its first real run on this change's own release and is read from the publish report, not ticked as a task, because the plan is filed away before publishing happens.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the plan is filed in the archive and numbered 30.8.0 for publishing, because every task is done, the automatic checks passed, and the check ran for real on this change: it took its turn, rebuilt staging, and gave the turn back.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file turn-check.md utf8 566 -->
# Turn marker check

Checked 2026-10-04 on GitHub (`matthewwong525/WongStack`) with `verify-staging.sh turn take` then `turn give`:

- The push to `refs/wong/staging-turn` was accepted and `git ls-remote origin 'refs/wong/*'` showed it.
- `turn give` removed it; the remote then listed no `refs/wong/` ref.
- No workflow run started: the newest run's id was the same before and 20 seconds after.

Not checked: a hosted workspace without GitHub. None was free to test on. A refusal there follows the design's fallback: the walk goes ahead without a turn and says so.

<!-- end turn-check.md -->
<!-- file walkthrough-candidate.md utf8 11837 -->
# The staging walkthrough

Check saved-revision behavior through deployed probes or existing CI captures. [The skill](../SKILL.md) owns order and verdicts; [the wiki](../../../../wiki/development/staging-walkthrough.md) owns why.

## a — scout the scenarios

Select delta scenarios and capabilities touched by the branch diff. `WHEN`/`THEN` remain authoritative. Inspect confirmed callers/data contracts; add narrowly relevant existing consumer scenarios, even across capabilities. Name the relationship and expectation; exclude speculation, report missing expectations. Consumer checks grant no repair scope.

Match each scenario to the strongest existing route:

1. **Browser journey** — rendered behavior through its user entry point.
2. **Request probe** — an endpoint's status, body, redirect or header.
3. **State probe** — trigger through the deployed interface, then read with an existing machine or stack command.
4. **CI capture** — saved-source command/output and follow-ups. Read project-owned `.agents/verification/*.json` and owning capture instructions; [CI evidence](ci-evidence.md) owns commands. Validate sources, scenarios, prerequisites, source/run identity and integrity. Never execute downloads/repo code locally. No recipe preserves ordinary probes; drift blocks its check, without editing recipes.

Ledger: scenario, probe, prerequisites, revision, runnable/blocked status, owned cleanup. Prepare surfaces independently: no preview blocks deployed checks alone. No route → name scenario/reason as unverified. Stage runnable checks; blocked/failed prerequisites pause dependents only. Finish independent safe checks.

**Before writes**: `preflight`'s `PLAYGROUND=yes` → create/change/delete staging data freely: no prompt, ownership or cleanup; the next walk rebuilds it. Otherwise establish staging-only bindings and owned disposable records with safe cleanup, or defer, naming the need. Production data, paid resources or access changes beyond the authorized heal need permission.

**Outside services**: `node "$ROOT/scripts/cf-secrets.mjs" shared` lists key names. Trigger a service only on an `own` key; `shared`/unknown destination → never trigger; name the service and that a staging-only key unlocks it.

**Missing seed records** → create through the app's screens, else unverified, naming the missing sample data. **Scheduled work** → run the project's manual trigger on staging, grade its result; the timetable stays partly shown; no trigger → unverified.

## b — write the journeys

`preflight` prints the saved `SHA` and owned `RUN_DIR`; deployed checks also need its `URL`, browser journeys its `BROWSER`. CI-only preparation uses `--no-preview --no-browser`. Files live per journey in `$RUN_DIR/journeys/`, named alike and numbered in walk order.

**`<id>.meta.json`** is for the grader, not the scripts: `then` is the scenario's **THEN** **verbatim**, never paraphrased; `probe` names the ladder rung:

```json
{
  "requirement": "Notes can be created",
  "scenario": "Submitting with no title is rejected",
  "probe": "browser",
  "then": "the form shows \"Title is required\" and nothing is saved"
}
```

**Browser → `<id>.batch.json`**: ordered commands; the driver feeds them unread to `agent-browser batch --bail --json`. First read `agent-browser skills get core` (`--full` for command details): use the installed guide.

```json
[
  ["open", "https://preview.example.com/"],
  ["wait", "--load", "networkidle"],
  ["screenshot", "$RUN_DIR/evidence/empty-title/01-landing.png", "--full"],
  ["find", "role", "button", "click", "--name", "New note"],
  ["wait", "--load", "networkidle"],
  ["screenshot", "$RUN_DIR/evidence/empty-title/02-empty-form.png", "--full"],
  ["find", "role", "button", "click", "--name", "Save"],
  ["wait", "--load", "networkidle"],
  ["screenshot", "$RUN_DIR/evidence/empty-title/03-after-submit.png", "--full"]
]
```

**Request → `<id>.requests.txt`**: tab-separated `METHOD`, path or full URL, optional JSON body. Paths resolve against the preview; the driver adds Access headers and captures responses in order:

```
POST	/api/notes	{"title":""}
GET	/api/notes
```

**State →** trigger with `<id>.requests.txt`; after `run`, capture the existing remote read from `app/`. `<staging-db>` is `wrangler.jsonc`'s `env.staging` database:

```bash
npx wrangler d1 execute <staging-db> --remote --env staging --command "SELECT count(*) FROM notes" \
  | tee "$RUN_DIR/evidence/import-processed/02-state.txt"
```

**CI →** retain validated raw output, argv/exit, source/run and isolation/cleanup in the owned folder. Missing/stale/malformed/superseded captures stay unverified. Fix/preservation claims compare a named earlier revision with identical behavior, inputs, method and relevant environment. Name revisions/results/limits; incompatible or absent baseline blocks comparison alone, not valid head observations.

**Lasting effects →** after a promised save/export, reopen/reload the record or independently read the file through its real consumer. Keep submitted/readback values and initiating response. Success messages/cached views prove no persistence; read-only promises need none. Compare fresh producer values with rendered consumer output.

Evidence rules:

- **Wait after navigation before screenshots**: `wait --load networkidle`; use `wait --text ...` for updates without navigation.
- **Screenshot where a person would look**, at numbered absolute paths under `$RUN_DIR/evidence/<id>/`; use `--full`, or `--annotate` for element labels.
- **Use semantic elements** (`find role/text/label`) or same-batch snapshot refs; re-snapshot after navigation/re-render.
- **Write no assertions**: a journey produces evidence; it does not decide.
- **Never capture request headers**, `network requests` or HARs: they contain Access credentials.
- Browser URLs must be full; only request paths use the preview base.

## c — run it

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" run "$RUN_DIR" "$URL"
```

Stage independent journeys together; grade prerequisites before dependent stages. Move completed inputs out of `journeys/` before retries: every staged mutation replays. The driver runs browsers then requests; finish state/readbacks and CI imports before grading. CI-only needs no browser/preview. Failed cleanup: retain owned record IDs, defer dependent mutations, finish independent checks.

`run`/`publish` print `REDACTED=<n>` credential-bearing text files scrubbed. Above 0, report it. `unknown`: inspect text evidence and `comment.md` for credentials before posting.

## d — grade against the written expectation

Read evidence beside each verbatim `then`: screenshots and `evidence/<id>.result.json` for browsers, numbered request responses, state/CI output and fresh readbacks. Grade the written promise.

**Partly shown**: some claims observed, others inherently unobservable through available routes (delivery, screen-reader speech). Name every missing claim and why; neither failure nor plain pass, verdict unchanged.

**Show screenshots while grading, before the verdict**: open numbered images in order, with one plain description above each. [The picture convention](../../../../wiki/development/browsing.md#show-what-the-browser-is-doing) applies; skip recapturing them.

- **A clean exit, green suite or `200` is not a pass.** A clean batch whose screenshot lacks the message the `THEN` requires **fails**, as does exit zero or `200` with contradictory output. A fresh readback contradicting the promised lasting result fails despite a successful initiating response. Unavailable readback stays blocked or partly shown under the existing limits.
- A failing command is evidence, not a crash. `--bail` stops a browser journey there, so earlier evidence shows how far it got.
- A screenshot that looks like the previous page → check the landed URL in `<id>.url`. A missing wait is a defect in the journey, not the app.
- `[redacted:.env]` in text evidence stands for a `.env` value the driver replaced; read the screenshot for it.
- **Ambiguous → unverified**: retain evidence/`THEN`, offer readings as [options](../../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks) at handoff; finish independent checks first.

## e — after a failure

Finish independent checks; retain retry evidence. `PLAYGROUND=yes` → clean up nothing: `preflight` rebuilds staging before each re-walk. Otherwise clean up owned test data; preserve shared data.

A failure is **in scope** only when both hold:

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

Otherwise report **out of scope** with why.

For an in-scope repair, retain a focused check when existing CI can cheaply reproduce the defect. `/save` captures the same check's intended failure on exact earlier source and pass on repaired head; the head suite must pass. Inspect failure cause, revision and check identity. Impractical harness → keep the available reproduction, missing proof and limitation. No new infrastructure, weaker checks or unrelated fixes.

Usually **out of scope**: app `401` with valid service token (app authentication), previous-page screenshot (repair journey waits and re-walk).

## f — post the evidence, then clean up

One `$RUN_DIR/comment.md` covers every surface/retry: verdict, saved SHA, preview/run links, each verbatim `THEN`, probe/environment, raw observations/readbacks and result. Name consumer relationships, compared revisions/results/limits. Label practice/simulated evidence. Show pass, fail, `◐` partial (shown/missing claims and why) and unverified checks. Text stands without images; numbered browser links: `Pictures (log in to open): [<label>](<url>)`.

Apply the skill's verdict precedence; inherently unobservable claims stay partly shown (§ d). UNKNOWN/TIMEOUT lead **Not verified.**, naming completed checks, blocks, and remedies. Name heals or missing credentials.

Before handoff, attempt safe simulations through existing deployed interfaces, disposable synthetic data or sandbox integrations (§ a). No local repo execution or invented tooling. Label **simulated** evidence, supported claims and real behavior unproved; simulated delivery proves no real delivery or personal experience. No safe simulation → name the limit.

After independent checks/simulations, make **one handoff** in comment/chat, including human-checkable partial claims. Each remaining check names its reason, needed action/permission, expected observation and dependents. Offer help or selected/all skips in [the shared ask format](../../explore/references/asking-the-user.md). Skips stay **skipped, unverified**, grant no permission/pass and erase no failure; ask again only if reopened. Blocked reachable checks prevent SUCCESS.

Use [key links](../../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) or [browser hand-over](../../../../wiki/development/browsing.md#hand-the-browser-over) for credentials/login. Waiting grants no permission. Resume pending checks after help; repeat completed checks only on changed conditions. Retain observations, pending/skipped ledger and owned IDs before cleanup.

Publish pictures, post, clean up:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" cleanup "$RUN_DIR"
```

`publish`: `<local-path>\t<url>`, then `MEDIA=`. **private** → links; **public** → `![<label>](<url>)`; **none** → report `REASON`, omit pictures, verdict unchanged. Never cite missing URLs or cleaned local paths; other evidence is inline text, no video.

<!-- end walkthrough-candidate.md -->
