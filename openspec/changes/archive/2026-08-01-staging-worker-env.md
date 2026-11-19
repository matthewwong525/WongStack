<!-- openspec-archive v1 2026-08-01-staging-worker-env -->
<!-- file proposal.md utf8 8485 -->
# staging-worker-env

**Status:** ready-to-ship
**Open questions:** none

## Why

The stack pack's staging model isolates the *database* but not the *Worker*. On a non-production branch, Workers Builds uploads a **version** of the one production Worker, and a version only serves HTTP — queue consumers, cron triggers, and every other non-request handler run on the **deployed** version, with production bindings. So `swap-d1-id.js` only ever covered the request path: a repo that adds a queue cannot test it on staging at all, and staging messages get handled by production code against the production database.

The fix is to make staging a real deployment: a separate Worker declared as a Wrangler environment, with its own twin bindings. That also removes the config-rewriting hack the current design needs only because there is one Worker.

## What Changes

- **BREAKING** — `scripts/swap-d1-id.js` is **removed** from the pack, and `preview_database_id` is no longer part of the model. Staging D1 becomes a normal binding inside `env.staging`.
- **BREAKING** — the `wrangler.jsonc` config fragment gains an `env.staging` block (own Worker `name`, twin D1, twin queue, twin bucket) in place of the two-id `d1_databases` entry.
- **New** `scripts/cf-deploy.sh` — the pack's fourth zero-config script, wired to the Workers Builds **deploy** command. Default branch → `wrangler deploy`; any other branch → `wrangler deploy --env staging` (updates the deployed staging Worker so queues and crons run branch code) followed by `wrangler versions upload --env staging --preview-alias <branch>` (keeps the per-commit preview URL).
- `scripts/cf-build.sh` loses its swap leg; branch builds migrate staging via `--env staging` instead of `--preview`.
- `scripts/reset-staging-d1.mjs` targets staging via `--env staging` instead of `--preview`.
- **Twin-by-default becomes the stated rule**: every stateful binding gets a second resource inside `env.staging` rather than a namespace prefix, because a twin costs no application code and a prefix taxes every call site forever. Documented as a table covering D1, Queues, R2, KV, Durable Objects, cron triggers, secrets, and service bindings.
- `wiki/stack/d1-pipeline.md` is rewritten as the **staging-environment** page: the version-vs-deployment diagnostic up front, two environments instead of two databases, the twin table, why not per-PR environments, and the two-preview-URLs-differ-in-capability gotcha. Migration mechanics and both production-recovery runbooks carry over unchanged.
- An **adoption runbook** for repos already carrying the old scripts — `/wong-sync` never modifies a file that already exists, so the upgrade has to be a documented, human-run sequence surfaced through the adapt step.
- `VERSION` → 8.0.0, with a newest-first `CHANGELOG.md` entry.

## Non-goals

Per-PR Worker environments (a provisioner with per-PR databases, queues, secrets, and teardown — declined, and documented as declined). Changing migration mechanics, the seeded-staging model, or the recovery runbooks. Any application code in this repo's `app/`.

## Capabilities

### New Capabilities

_None — this changes how the existing pack behaves._

### Modified Capabilities

- `stack-pack`: staging isolation moves from a swapped binding on one Worker to a separate Worker declared as a Wrangler environment; the pack gains a deploy script and drops the swap script; the twin-by-default rule and the adoption runbook become stated requirements; the docs requirement moves from a two-database model to a two-environment model.

## Impact

- **Pack scripts** — `scripts/cf-build.sh` (edit), `scripts/cf-deploy.sh` (new), `scripts/reset-staging-d1.mjs` (edit), `scripts/swap-d1-id.js` (delete).
- **Payload manifest** — `.claude/skills/wong-sync/references/payload-manifest.md`: the pack's drop-in file list changes from three scripts to three (swap out, deploy in).
- **Config fragments** — `.claude/skills/wong-sync/references/stack-pack-fragments.md`: the `wrangler.jsonc` fragment and the `package.json` scripts fragment both change; a new Workers Builds deploy-command setting is added.
- **Wiki** — `wiki/stack/d1-pipeline.md` (rewritten), `wiki/stack/cloudflare-access.md` (the staging Worker's own hostname needs a policy), `wiki/stack/README.md` and `wiki/stack/cloudflare-credentials.md` (link and per-environment secrets).
- **Release** — `VERSION`, `CHANGELOG.md`.
- **Downstream repos** — every repo that took the pack has the old scripts and keeps them until a human follows the runbook; nothing breaks until they opt to upgrade.

## Decision log

- **2026-08-01** — Planned and implemented in one session; all 20 tasks complete, VERSION 8.0.0. The diagnosis that drove the whole change: a branch preview is a Workers Builds *version*, and a version serves only HTTP, so the old `swap-d1-id.js` binding swap isolated the request path and nothing else — queues, crons, and alarms always ran on the production deployment. Fixed by making staging a real Worker (`env.staging`). **Two things the plan didn't anticipate, both found while implementing:** (1) a twin staging D1 has its *own* `database_name`, so the name readers in `cf-build.sh` and `lib-wrangler-config.mjs` had to become environment-aware — reading the name from inside the `env.staging` block, and erroring explicitly rather than falling back to production's name; (2) `cf-deploy.sh` needs the same wrangler-config discovery `cf-build.sh` has, so rather than a third copy of that rule (bash, bash, and `.mjs`) it was extracted to `scripts/lib-wrangler-config.sh` and sourced by both — a build and its deploy resolving different apps would be a silent, ugly failure. Added as tasks 1.5 and 1.6. **Ruled out:** a second queue alone (a consumer binds to a Worker, not a version, so staging messages would still hit the production deployment); an R2 `staging/` key prefix (a twin bucket is free and needs no code, a prefix taxes every call site forever); dropping the per-commit version-alias URLs (they're generated by the default deploy command a custom one replaces, so keeping them is now an explicit line in `cf-deploy.sh`); per-PR Worker environments (documented as declined — it's an environment provisioner larger than the app). **Verified in a synthetic repo:** the scripts were exercised — production and staging name reads resolve correctly, a missing `env.staging` errors with the right message, the branch→alias sanitizer handles `feat/Add_Thing` and rejects unusable names, and every new wiki link and anchor resolves.
- **2026-08-01** — **Rehearsed end to end against real Cloudflare** before shipping, on the account's existing test D1s (`wongstack-test-db{,-staging}`) plus a scratch Worker and twin queues, all torn down afterwards. It found a **real bug the synthetic tests could not**: `wrangler versions upload --env staging` refuses to run against a Worker that doesn't exist yet ("You cannot upload a new version of a Worker that does not yet exist"), which is precisely the state on a repo's *first* branch push — so with the upload ordered first, `set -e` killed `cf-deploy.sh` before the deploy that would have created the staging Worker. Every repo adopting the pack would have hit it on day one. Fixed by deploying first and uploading the alias version second; the corrected order is propagated to the wiki, both specs, the design, and the changelog. **What the rehearsal then proved:** two distinct Workers exist (`…-env-test`, `…-env-test-staging`); each queue has its own consumer; a message enqueued on the staging queue was handled by the *staging* Worker and written to the *staging* database, while production's row came only from production; `cf-build.sh` migrated the staging D1 on a branch and the production D1 on `main`; and the alias URL came out as `feat-add-thing-<worker>-staging.workers.dev`, matching the documented shape, serving HTTP 200. **Also found:** wrangler warns on a production deploy when environments are defined but none is named. Verified harmless — the printed bindings are the top-level production ones — and *not* "fixed" with `--env=""`, which silences it but is a newer wrangler semantic the pack can't assume, since it pins no wrangler version. Documented as expected instead. **Still unverifiable from this repo:** that Workers Builds accepts `bash scripts/cf-deploy.sh` as its deploy command — a dashboard setting only a connected repo can exercise.

<!-- end proposal.md -->
<!-- file design.md utf8 10920 -->
## Context

The pack's current staging model is one Worker with two databases. `wrangler.jsonc` carries a single `d1_databases` entry holding `database_id` (production) and `preview_database_id` (staging); on a non-production branch `scripts/cf-build.sh` migrates staging and then `scripts/swap-d1-id.js` regex-swaps the two ids so the resulting deploy binds staging.

That design rests on an assumption that only holds for HTTP handlers. Cloudflare Workers Builds uploads a **version** on non-production branches — which is why previews are served at `<branch-alias>-<worker>.workers.dev` — and a version is not a deployment:

```
                        HTTP req    queue msg   cron   DO alarm
  version (preview) ──▶    ✓           ✗         ✗       ✗
  deployment (prod) ──▶    ✓           ✓         ✓       ✓
```

Queue consumers, cron triggers, and every other non-request entry point are attached to the Worker's **deployed** version. A branch version never receives them; the production deployment does, running production code against production bindings. The swap is therefore not an imperfect isolation — it is isolation of exactly one code path, and silently absent for the rest.

The unit of isolation on Cloudflare is the **Worker**, and a Wrangler environment is how you get a second one. The constraint that originally blocked this — Workers Builds running a single fixed deploy command for all branches — does not actually hold: the deploy command is configurable, confirmed during exploration. That makes a deploy wrapper the natural sibling of the existing build wrapper.

## Goals / Non-Goals

**Goals:**

- Staging is a real deployment of a separate Worker, so queues, crons, and any future non-request handler run branch code against staging bindings.
- The config-rewriting hack is removed, not replaced by a different one. No script mutates `wrangler.jsonc`.
- Per-commit preview URLs survive the switch to a custom deploy command.
- The pack states a rule that answers "what does staging bind to?" for bindings it does not yet ship, so the next stateful resource does not reopen this bug.
- Repos already carrying the old scripts have a written upgrade path, since `/wong-sync` will not modify a file that exists.

**Non-Goals:**

- Per-PR Worker environments. Explicitly declined and documented as declined (see Decisions).
- Any change to migration mechanics, timestamp prefixes, forward-only rules, the seeded-staging model, or the production-recovery runbooks.
- Application changes in this repo's `app/` — it is the scaffold SPA and binds no database.

## Decisions

### A Wrangler environment, not a second queue

Adding a staging queue alone does nothing: a queue consumer is registered against a Worker, so a second queue naming the same Worker as consumer still delivers to the deployed production version. The environment is what creates a second Worker (`env.staging.name`), and only a second Worker can carry its own consumer registration.

Alternative considered: keep one Worker and gate behavior on an environment variable at runtime. Rejected — the bindings themselves are the thing that must differ, and a runtime branch means production code paths carry staging logic forever.

### `cf-deploy.sh`, the fourth pack script

Workers Builds exposes one deploy command, so branch logic lives in a script the same way `cf-build.sh` already handles the build:

```
  scripts/cf-build.sh    npm run build      migrate the right D1, then build
  scripts/cf-deploy.sh   deploy command     deploy to the right Worker
```

Behavior:

| Branch | Command(s) |
|---|---|
| production | `wrangler deploy` |
| any other | `wrangler deploy --env staging` then `wrangler versions upload --env staging --preview-alias <branch>` |

Both non-production commands carry `--env staging`. Without it the version upload reverts to being a version of the *production* Worker, bound to production D1 — reintroducing exactly the bug this change removes. This is the single sharpest edge in the design and is called out in the script's header comment and the wiki page.

The script keeps the pack's zero-config property: it reads the branch from `WORKERS_CI_BRANCH`, the production branch from `CF_PRODUCTION_BRANCH` (default `main`), and locates the wrangler config through the shared `lib-wrangler-config.mjs` resolution rule. No repo-specific value is baked in, so every copy stays byte-identical.

### Two preview URLs with different capabilities

A branch push now produces two reachable URLs:

```
  <branch>-<worker>-staging.workers.dev   version alias — HTTP only, per-commit
  <worker>-staging.workers.dev            the deployed staging Worker — queues, crons
```

Keeping the alias preserves per-commit UI review, which the pack has today and which the custom deploy command would otherwise silently switch off. The cost is that "why didn't my import run?" is now answerable by "you were on the alias URL" — so the capability difference is documented at the point the URLs are introduced, not in a footnote.

Alternative considered: drop the alias and have one URL per branch. Rejected — the alias is free, already relied on, and its absence would be discovered as a regression.

### Twin by default, prefix only when a twin is impossible

Two ways to isolate a stateful binding, and they are not equally cheap:

- **Twin** — a second resource with a different id behind the same binding name. Zero application code; the Worker never learns which one it got.
- **Prefix** — one shared resource with staging namespaced inside it. Every write site must cooperate, forever, and one forgetful call site writes into production data.

That asymmetry decides it. The pack states **twin by default**, and the R2 key-prefix approach is explicitly rejected: a second bucket is free and needs no code, a prefix is a permanent tax on every future call site.

| Binding | Staging | Note |
|---|---|---|
| D1 | twin database | already the model |
| Queues | twin queue | producer *and* consumer both inside `env.staging` |
| R2 | twin bucket | not a key prefix |
| KV | twin namespace | |
| Durable Objects | free | DO storage is per-Worker; a separate Worker is already isolated |
| Cron triggers | declare or omit | omit unless staging should fire on its own schedule |
| Secrets | re-put per environment | `wrangler secret put --env staging` — the easiest one to forget |
| Service bindings | **must** repoint | a staging Worker bound to a production service is a silent cross-environment call |

The last two are the ones that bite. A missing secret fails loudly on first run; a service binding left pointing at production fails quietly — staging code, production side effects.

### Staging stays shared; per-PR environments are declined

Cloudflare does not give a Worker per PR, and the pack will not build one. A per-PR environment needs a created-migrated-seeded D1, its own queue, its own secrets, its own bucket, its own Access policy, and a teardown on PR close, or orphaned resources accumulate — a provisioner larger than most apps that would use it.

This is also less of a change than it appears: the pack's staging **database** has always been shared across branches, and `d1-pipeline.md` already documents branches stomping each other with `db:reset:staging` as the recovery. Code isolation now matches the isolation the data never had. The wiki records the decision so it is not re-litigated; the escape hatch is small, since `cf-deploy.sh` already knows the branch name.

### `swap-d1-id.js` is deleted, not deprecated

Keeping it would leave two contradictory staging models in the pack. It is removed from the manifest and the repo, and `preview_database_id` disappears from the fragment. `reset-staging-d1.mjs` and the `db:migrate:staging` script switch from `--preview` to `--env staging` in the same change, so `--preview` appears nowhere in the pack afterwards.

## Risks / Trade-offs

- **The Workers Builds deploy command must be repointed by hand.** → It is a one-time dashboard setting and the first step of the adoption runbook; a repo that forgets keeps the default command and simply gets today's behavior, which is not worse than the status quo.
- **`--env staging` omitted from `versions upload` reinstates the original bug, quietly.** → Called out in the script comment and the wiki; the script constructs both commands from one shared flag so they cannot drift apart.
- **Two branches pushing within the same window overwrite the staging Worker.** → Accepted, and consistent with the already-shared staging database. Documented alongside the existing shared-staging caveat.
- **Staging secrets and service bindings are per-environment and easy to miss.** → Both are rows in the twin table and steps in the adoption runbook; the service-binding case is flagged as the silent one.
- **`/wong-sync` cannot deliver this to a repo that already has the pack** — it never modifies an existing file, so `cf-build.sh` stays stale and `swap-d1-id.js` stays present. → The adoption runbook is the deliverable that covers it, surfaced through the adapt step as a proposal like any other present-file gap.
- **A repo mid-upgrade has an `env.staging` block but the old deploy command.** → The runbook orders the steps so the config lands before the dashboard is repointed; in that intermediate state branch deploys behave as they do today.

## Migration Plan

The adoption runbook, in the order a human runs it:

1. Create the staging twins: D1 (or reuse the existing `preview_database_id` database), queue, bucket, KV namespace as applicable.
2. Add the `env.staging` block to `wrangler.jsonc`; remove `preview_database_id`.
3. `wrangler secret put --env staging <NAME>` for every secret the Worker reads.
4. Repoint any service binding inside `env.staging` at its staging counterpart.
5. Add an Access policy for the staging Worker's hostname.
6. Take the new `scripts/cf-deploy.sh` and the updated `cf-build.sh` / `reset-staging-d1.mjs`; delete `scripts/swap-d1-id.js`.
7. Update the `package.json` `db:*` scripts from `--preview` to `--env staging`.
8. Set the Workers Builds **deploy command** to `bash scripts/cf-deploy.sh`.
9. Push a branch; confirm both URLs respond and that a queue message is handled by the staging Worker against the staging database.

Rollback is restoring `swap-d1-id.js`, reverting the fragment, and resetting the dashboard's deploy command to the default — no data migration is involved, since the staging database is a seeded fixture that `db:reset:staging` rebuilds.

## Open Questions

None blocking. Two are worth revisiting after a repo has run on this for a while: whether the version-alias upload is worth its extra build time once the staging Worker URL is habitual, and whether cron triggers should default to declared-but-disabled in `env.staging` rather than omitted.

<!-- end design.md -->
<!-- file tasks.md utf8 5461 -->
## 1. Pack scripts

- [x] 1.1 Add `scripts/cf-deploy.sh` — production branch → `wrangler deploy`; any other branch → `wrangler versions upload --env staging --preview-alias <branch>` then `wrangler deploy --env staging`. Anchor paths on `${BASH_SOURCE[0]}` and resolve the wrangler config with the same root-then-subdirectory rule `cf-build.sh` uses; read the branch from `WORKERS_CI_BRANCH` and the production branch from `CF_PRODUCTION_BRANCH` (default `main`); no-op outside CI. Header comment must call out that `--env staging` is required on *both* commands.
- [x] 1.2 Edit `scripts/cf-build.sh` — delete the swap leg and the `node swap-d1-id.js` call; change the non-production migrate from `--remote --preview` to `--remote --env staging`. Keep the CWD anchoring and local-build short circuit as they are.
- [x] 1.3 Edit `scripts/reset-staging-d1.mjs` — replace the `PREVIEW_FLAGS` `--preview` with `--env staging` and update the header comment (it currently explains staging as `preview_database_id`).
- [x] 1.4 Delete `scripts/swap-d1-id.js`. Confirm `--preview` and `preview_database_id` appear nowhere under `scripts/` afterwards.
- [x] 1.5 *(added during apply)* Extract the bash wrangler-config discovery into `scripts/lib-wrangler-config.sh`, sourced by both `cf-build.sh` and `cf-deploy.sh`, so a build and its deploy cannot resolve different apps.
- [x] 1.6 *(added during apply)* Teach both name readers about environments — `read_database_name [env]` in `cf-build.sh` and `readDatabaseName(configPath, env)` in `lib-wrangler-config.mjs` — since a twin staging database has its own `database_name`. Point `reset-staging-d1.mjs` at the `staging` environment through it.

## 2. wong-sync references

- [x] 2.1 Update `.claude/skills/wong-sync/references/payload-manifest.md` — the pack's drop-in list swaps `scripts/swap-d1-id.js` for `scripts/cf-deploy.sh`.
- [x] 2.2 Rewrite the `wrangler.jsonc` fragment in `.claude/skills/wong-sync/references/stack-pack-fragments.md` — a plain `d1_databases` binding plus an `env.staging` block (own `name`, twin D1, and the twin queue/bucket pattern). Drop `preview_database_id` and the swap/log-line gotcha; keep the `migrations_dir` relative-path warning.
- [x] 2.3 Update the `package.json` fragment in the same file — `db:migrate:staging` moves from `--preview` to `--env staging`.
- [x] 2.4 Add a short **Workers Builds deploy command** section to the fragments page: `bash scripts/cf-deploy.sh`, set by hand in the dashboard, explicitly not a mergeable fragment (per design.md — Config fragments requirement).

## 3. Wiki

- [x] 3.1 Rewrite `wiki/stack/d1-pipeline.md` as the staging-environment page: open with the version-vs-deployment diagnostic and its capability table, then two environments instead of two databases, the build+deploy flow diagram, and the two preview URLs with their differing capabilities. Carry over timestamp migrations, seeded staging, and both production-recovery runbooks unchanged.
- [x] 3.2 Add the twin-by-default rule and its table (D1, Queues, R2, KV, Durable Objects, cron, secrets, service bindings) to that page, including the rejection of an R2 key prefix and the two quiet failure modes (missing staging secret, service binding left on production).
- [x] 3.3 Add the "staging is shared / why not per-PR environments" section, folding in the existing shared-staging-database caveat so there is one statement of it rather than two.
- [x] 3.4 Update the script table on that page — four scripts, with `swap-d1-id.js` gone and `cf-deploy.sh` added.
- [x] 3.5 Add the adoption runbook (design.md — Migration Plan) as a section of the pipeline page, ordered so an interrupted upgrade leaves the repo behaving as before.
- [x] 3.6 Update `wiki/stack/cloudflare-access.md` — name the staging Worker's hostname in the wildcard section (the recommended `*.<subdomain>.workers.dev` wildcard already covers it; a per-hostname list does not).
- [x] 3.7 Update `wiki/stack/cloudflare-credentials.md` for per-environment secrets (`wrangler secret put --env staging`), and check `wiki/stack/README.md`'s description of the pipeline page still reads true.
- [x] 3.8 Sweep for stale references — `grep -rn "swap-d1-id\|preview_database_id\|--preview"` across `wiki/`, `.claude/`, and `AGENTS.md`; fix every live one (leave `CHANGELOG.md` history alone).

## 4. Release

- [x] 4.1 Bump `VERSION` to `8.0.0`.
- [x] 4.2 Add the newest-first `CHANGELOG.md` entry — the version-vs-deployment diagnosis, the `env.staging` model, `cf-deploy.sh` in, `swap-d1-id.js` out, twin-by-default, and a pointer to the adoption runbook for repos on the old model.

## 5. Verification *(added during apply)*

- [x] 5.1 Exercise the scripts against a synthetic `app/`-layout repo — production vs staging name reads, the missing-`env.staging` error path, and the branch→preview-alias sanitizer.
- [x] 5.2 Confirm `--preview-alias` and `--env` exist on the wrangler commands used (4.107.0).
- [x] 5.3 Full end-to-end rehearsal against real Cloudflare: scratch Worker + twin queues, both `cf-build.sh` legs, both `cf-deploy.sh` legs, a queue message enqueued on staging, and both databases inspected. Tear down every scratch resource afterwards.
- [x] 5.4 Fix what the rehearsal found — `wrangler versions upload` must run *after* `wrangler deploy --env staging`; propagate the corrected order to the wiki, both specs, the proposal, the design, and the changelog.


<!-- end tasks.md -->
<!-- file specs/stack-pack/spec.md utf8 12987 -->
## ADDED Requirements

### Requirement: Staging is a separate Worker declared as a Wrangler environment

The pack SHALL isolate staging at the Worker level, not the binding level. `wrangler.jsonc` SHALL declare a `staging` environment with its own Worker `name` and its own bindings, and a non-production branch SHALL be **deployed** to that Worker rather than uploaded as a version of the production Worker. No pack script SHALL rewrite `wrangler.jsonc` to redirect a binding.

The pack SHALL ship `scripts/cf-deploy.sh`, wired to the Workers Builds deploy command. On the production branch it SHALL run `wrangler deploy`. On any other branch it SHALL run `wrangler deploy --env staging` followed by `wrangler versions upload --env staging --preview-alias <branch>`, so the deployed staging Worker runs branch code *and* the per-commit preview URL is preserved. The deploy SHALL come first: a version cannot be uploaded against a Worker that does not yet exist, which is the state on a repo's first branch push. Both non-production commands SHALL carry `--env staging`; omitting it on the version upload binds the production Worker's resources.

#### Scenario: A queue message on a branch is handled by staging

- **WHEN** a non-production branch is pushed and a message is enqueued to the staging queue
- **THEN** the deployed staging Worker handles it, running that branch's code against the staging database
- **AND** neither the production Worker nor the production database is involved

#### Scenario: A branch push still yields a per-commit preview URL

- **WHEN** the deploy script runs on a non-production branch
- **THEN** a version alias URL for that commit is created against the staging environment
- **AND** the deployed staging Worker is updated in the same run

#### Scenario: The production branch deploys production

- **WHEN** the deploy script runs on the production branch
- **THEN** it runs `wrangler deploy` with no environment flag
- **AND** the staging Worker is not touched

#### Scenario: No script mutates the wrangler config

- **WHEN** any pack script runs, on any branch
- **THEN** `wrangler.jsonc` is left byte-for-byte unchanged

### Requirement: Every stateful binding gets a staging twin, not a namespace prefix

The pack SHALL state, and its docs SHALL follow, a twin-by-default rule: each stateful binding in `env.staging` SHALL point at a second resource of the same kind rather than share the production resource behind a namespace prefix. A twin requires no application code; a prefix requires every call site to cooperate and lets one omission write into production data. A prefix SHALL be used only where a twin is genuinely unavailable.

The rule SHALL be documented as a table covering at least D1, Queues, R2, KV, Durable Objects, cron triggers, secrets, and service bindings, and SHALL call out that secrets are per-environment (`wrangler secret put --env staging`) and that a service binding left pointing at production is a silent cross-environment call.

#### Scenario: R2 in staging is a second bucket

- **WHEN** a repo adds an R2 binding to a Worker that took the pack
- **THEN** the docs direct it to a second bucket inside `env.staging`
- **AND** a staging key prefix on the production bucket is explicitly rejected

#### Scenario: A newly added binding has a documented answer

- **WHEN** a repo adds a stateful binding the pack does not itself ship
- **THEN** the twin-by-default rule and its table answer what staging binds to without a new decision

### Requirement: The pack documents its adoption path for repos on the previous model

Because `/wong-sync` never modifies a file that already exists, a repo that installed the previous staging model keeps its old scripts and config indefinitely. The pack SHALL therefore document an ordered, human-run adoption runbook covering: creating the staging twins, adding the `env.staging` block and removing `preview_database_id`, putting secrets per environment, repointing service bindings, confirming Access covers the staging hostname, taking the new and updated scripts and deleting `scripts/swap-d1-id.js`, updating the `db:*` scripts, and repointing the Workers Builds deploy command. The runbook SHALL order the steps so an interrupted upgrade leaves the repo behaving as it did before.

#### Scenario: An existing repo upgrades deliberately

- **WHEN** a repo that took the previous pack syncs WongStack
- **THEN** its existing pack files are left untouched and the gap is surfaced through the adapt step
- **AND** the runbook gives the ordered steps to adopt the staging environment by hand

#### Scenario: A partial upgrade is not broken

- **WHEN** a repo has added `env.staging` but has not yet repointed the Workers Builds deploy command
- **THEN** branch deploys continue to behave as they did before the upgrade

## MODIFIED Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — that a repo installs only by opting in. A repo that does not opt in SHALL receive none of the pack's files and SHALL remain stack-agnostic. Opt-in state SHALL be recorded as `components.stackPack` (boolean) in `.claude/.wong-stack.json`; absent or false means the repo never took the pack.

#### Scenario: A repo that declines the pack is unaffected

- **WHEN** a repo installs or syncs WongStack without opting into the pack
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it
- **AND** `components.stackPack` is absent or false

#### Scenario: A repo that opts in receives the pack

- **WHEN** a repo opts into the pack
- **THEN** it receives the pack scripts, the seed template, and the pipeline docs, and is guided through the config fragments
- **AND** `components.stackPack` is true

### Requirement: The pack scripts are zero-config and byte-identical across repos

Every pack script SHALL be identical in every repo that installs it — no per-repo value SHALL be baked into a pack file. A script that needs the database name, an environment name, or the branch SHALL read it from the target-owned `wrangler.jsonc` or the CI environment; a script that needs a secret SHALL read it from the environment (`.env`). `scripts/cf-deploy.sh` SHALL hardcode no Worker name, environment id, or database id: it SHALL take the branch from `WORKERS_CI_BRANCH`, the production branch from `CF_PRODUCTION_BRANCH` (default `main`), and locate the wrangler config by the same root-then-subdirectory rule the other pack scripts share.

#### Scenario: Two repos install the identical script

- **WHEN** two different repos both take the pack
- **THEN** their copies of each pack script are byte-for-byte identical
- **AND** each script resolves repo-specific values from `wrangler.jsonc`, the CI environment, or `.env`, not from a constant in the script

#### Scenario: The deploy script picks the environment from the branch

- **WHEN** `cf-deploy.sh` runs in CI
- **THEN** it compares `WORKERS_CI_BRANCH` against `CF_PRODUCTION_BRANCH` to choose between a production deploy and a staging deploy
- **AND** it contains no hardcoded Worker name or database id

### Requirement: Migrations auto-apply on deploy, forward-only, by timestamp prefix

The pack SHALL apply D1 migrations automatically as part of the deploy build: on the default branch to the production database, on any other branch to the staging database bound by `env.staging`. Migrations SHALL be forward-only (no down scripts), and their filenames SHALL use a timestamp prefix (`YYYYMMDDHHMMSS_name.sql`) so that filename order matches author order and two branches cannot collide on a prefix. The pack SHALL NOT carry a duplicate-prefix guard — the timestamp scheme makes collisions structurally impossible. The build script SHALL NOT swap or otherwise rewrite any binding.

#### Scenario: Preview branch migrates staging

- **WHEN** the build runs on a non-default branch in CI
- **THEN** pending migrations apply to the staging database via the `staging` environment
- **AND** the production database is not touched and `wrangler.jsonc` is not modified

#### Scenario: Default branch migrates production

- **WHEN** the build runs on the default branch in CI
- **THEN** pending migrations apply to the production database as part of the same deploy

#### Scenario: Two branches add migrations without colliding

- **WHEN** two branches each add a new migration file
- **THEN** each filename carries a distinct timestamp prefix and both apply in timestamp order with no prefix collision

### Requirement: Staging is a seeded fixture database, never a prod mirror

The staging reset script SHALL rebuild staging from a checked-in seed, not from production data: it SHALL drop every object, apply the migrations, then apply `schema/seed.sql` (data-only INSERTs). It SHALL target staging through the `staging` environment, SHALL NOT read, export, or copy production data, and SHALL NOT touch the production database. `schema/seed.sql` SHALL ship as a commented, empty template. A change that alters a seeded table SHALL update `schema/seed.sql` in the same change.

#### Scenario: Reset rebuilds staging from the seed

- **WHEN** the staging reset script runs
- **THEN** it drops all objects, applies migrations, and applies `schema/seed.sql` against the `staging` environment's database
- **AND** it issues no read or export against the production database

#### Scenario: The seed ships empty

- **WHEN** a repo first takes the pack
- **THEN** `schema/seed.sql` is present as a commented, data-only template with no rows assumed

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` `.dev.vars` entry — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. The pack SHALL also document the one setting it cannot merge — the Workers Builds **deploy command**, which a human sets to `bash scripts/cf-deploy.sh` in the dashboard.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build` and `db:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: The deploy command is called out as a manual step

- **WHEN** a repo installs or adopts the pack
- **THEN** setting the Workers Builds deploy command is presented as an explicit human step, not a merged fragment

### Requirement: The pack ships the D1 pipeline and prod-recovery docs

The `wiki/stack/` section SHALL gain a core-stack page and pipeline documentation covering the two-**environment** model, auto-migrate-on-deploy, timestamp migrations, the seeded-staging model and reset, and the production-recovery runbooks — recovery via `wrangler d1 time-travel`, the rule never to hand-apply schema to production, and how to reconcile `d1_migrations` when production drifts.

The pipeline page SHALL open with the diagnostic that motivates the model — a preview branch produces a **version**, and a version serves only HTTP, so queue consumers, cron triggers, and other non-request handlers run on the deployed version — and SHALL also cover the twin-by-default table, the capability difference between the version-alias URL and the staging Worker URL, that staging is shared across branches, and why per-PR environments are declined. These pages SHALL follow the progressive-disclosure rulebook and link from the existing `wiki/stack/` hub. They SHALL install only with the pack.

#### Scenario: Pipeline docs are reachable from the hub

- **WHEN** a reader opens the `wiki/stack/` hub in a repo that took the pack
- **THEN** it links the core-stack page and the pipeline pages
- **AND** the pipeline page covers the two-environment model, timestamp migrations, seeded staging, and both prod-recovery runbooks

#### Scenario: The version-vs-deployment distinction is stated up front

- **WHEN** a reader opens the pipeline page
- **THEN** it explains before the mechanics that a branch preview is a version and that a version serves only HTTP
- **AND** it states which of the two preview URLs processes queue messages

#### Scenario: Per-PR environments are documented as declined

- **WHEN** a reader asks why each PR does not get its own Worker
- **THEN** the page records the decision and its cost, so it is not re-litigated

#### Scenario: Docs are absent without the pack

- **WHEN** a repo did not take the pack
- **THEN** the pack's pipeline docs are not installed

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-01

~~~
<!-- end .openspec.yaml -->
