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
