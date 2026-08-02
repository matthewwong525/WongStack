# Deploy and data pipeline

How code and data ship on the [Cloudflare stack](README.md): **two environments, two Workers, migrations that apply on deploy.** A push to a feature branch migrates and deploys the *staging* Worker; a merge to the default branch migrates and deploys the *production* Worker. The [pack scripts](#the-scripts) implement it and read every repo-specific value from `wrangler.jsonc`, so they're identical in every repo that takes the pack.

This is the runnable half of the stack — the [core stack](core-stack.md) is *what* you build on, this is *how* changes reach production safely. Skip to the [recovery runbooks](#recovery-a-bad-migration-reached-production) when production is red; read top-to-bottom to set it up. Already running the older one-Worker model? Go to [adopting the staging environment](#adopting-the-staging-environment).

## Why staging is a whole Worker

Start here, because it explains every other decision on this page.

Cloudflare Workers Builds does two different things depending on the branch. On the default branch it **deploys**. On any other branch it uploads a **version** — an immutable snapshot served at its own alias URL. Versions are why per-commit preview URLs are cheap, and they look like a complete deploy. They aren't:

```
                        HTTP req    queue msg   cron   DO alarm
  version (preview) ──▶    ✓           ✗         ✗       ✗
  deployment        ──▶    ✓           ✓         ✓       ✓
```

**A version only serves HTTP.** Queue consumers, cron triggers, and every other non-request entry point are attached to the Worker's *deployed* version. Enqueue a message while your branch is uploaded as a version and the **production** deployment handles it — production code, production bindings.

So isolating staging at the *binding* level can't work. Redirecting a database id inside an uploaded version covers the request path and silently misses everything else. The unit of isolation on Cloudflare is the **Worker**, and a [Wrangler environment](https://developers.cloudflare.com/workers/wrangler/environments/) is how you get a second one:

```
   ┌─ wrangler.jsonc ─────────────────────────────┐
   │  name: my-app            ← production Worker │
   │  d1_databases: [ prod ]                      │
   │                                              │
   │  env.staging:                                │
   │    name: my-app-staging  ← a second Worker   │
   │    d1_databases: [ staging ]                 │
   └──────────────────────────────────────────────┘
```

`my-app-staging` is a Worker in its own right: its own deployment, its own queue consumers, its own bindings. A branch deployed there runs imports, crons, and alarms end to end on branch code.

## Auto-migrate on build, deploy by branch

Two CI steps, two pack scripts, one rule each:

```
                     push (GitHub Actions)
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
       build command                            deploy command
   scripts/cf-build.sh                      scripts/cf-deploy.sh
                │                                       │
     ┌──────────┴──────────┐              ┌─────────────┴─────────────┐
 default branch      other branch     default branch            other branch
     │                     │               │                          │
 migrations apply    migrations apply  wrangler deploy        wrangler deploy → staging
 --remote            --remote                                     (staging Worker)
 (production D1)     --env staging                                        +
     │               (staging D1)      (production Worker)   versions upload → staging
     │                     │                                 --preview-alias <branch>
     └──────────┬──────────┘
                ▼
        npm run build:app
```

- **Default branch** → migrations apply to **production**, then a deploy to the production Worker.
- **Any other branch** → migrations apply to **staging**, then a deploy to the staging Worker (plus a per-commit version, below).
- **A developer's terminal** (no `CF_BRANCH` or `WORKERS_CI_BRANCH`) → the build wrapper just builds and the deploy wrapper does nothing. A remote database is never touched, and nothing is ever deployed, from a laptop.

Nothing rewrites `wrangler.jsonc`. Which database a branch binds follows from which Worker it deploys to — and [how that Worker gets chosen](#how-the-environment-actually-gets-selected) depends on how the app is built.

### The two commands

`scripts/cf-build.sh` is the **build command** (`npm run build`), so the dashboard's default does the right thing with no dashboard config. It reads both database names from `wrangler.jsonc` — the top-level one for production, the one inside `env.staging` for staging — so nothing is baked in. Your real build lives under `build:app`, which the wrapper calls after migrating.

`scripts/cf-deploy.sh` is the **deploy command**, and it is the one thing you must set by hand:

```
Workers Builds → Settings → Build → Deploy command:   bash scripts/cf-deploy.sh
```

Leave the default `npx wrangler deploy` in place and branch pushes go back to uploading versions of the *production* Worker — the exact behaviour this model replaces. The production branch defaults to `main`; set `CF_PRODUCTION_BRANCH` in CI if yours differs.

On a branch it **deploys first, then uploads the version.** That order is load-bearing: `wrangler versions upload` refuses to run against a Worker that doesn't exist yet, which is exactly the state on the first branch push in a repo — so uploading first would fail before the deploy that creates the staging Worker. On the production branch, wrangler warns that environments are defined but none was named; that's expected, and the bindings it prints are the top-level production ones.

### Two preview URLs, and only one of them runs your queue

A branch push produces two reachable URLs, and they are not equivalent:

| URL | What it is | Serves HTTP | Runs queues, crons |
|---|---|---|---|
| `<branch>-<worker>-staging.workers.dev` | a version of the staging Worker, pinned to that commit | ✓ | ✗ |
| `<worker>-staging.workers.dev` | the deployed staging Worker | ✓ | ✓ |

Use the alias URL for UI review — it's per-commit, so two branches never collide. Use the staging Worker URL when you're exercising an import, a queue, or anything scheduled. "Why didn't my import run?" is almost always "you were on the alias URL."

#### How the alias URL reaches the tooling

`/save` prints a preview link and `/ship`'s [staging walkthrough](ship-walkthrough.md) walks one, and both find it the same way — by asking GitHub what was deployed for this commit. Which CI backend you're on decides who tells GitHub:

- **Workers Builds** — Cloudflare's GitHub integration attaches the URL to the commit itself. Nothing in the pack has to do anything.
- **GitHub Actions** — there is no such integration. `cf-deploy.sh` therefore **harvests the URL out of `wrangler versions upload`'s own output** and hands it to the workflow, which publishes a GitHub Deployment carrying it as `environment_url`.

The URL is harvested, never rebuilt from the shape in the table above. A hand-constructed URL is a guess that can answer `200` while pointing at a different commit — exactly what a per-commit URL exists to rule out. If wrangler prints nothing, the pack publishes nothing and the tooling says so, rather than offering a URL nobody verified.

## How the environment actually gets selected

There are two mechanisms, and using the wrong one fails **silently** — the deploy succeeds, prints a preview URL, and has overwritten production.

| Layout | Selected by | When |
|---|---|---|
| plain wrangler build | `wrangler deploy --env staging` | deploy time |
| `@cloudflare/vite-plugin` (the SPA layout the pack ships) | `CLOUDFLARE_ENV=staging` | **build** time |

The plugin flattens the chosen environment into a generated `dist/<worker>/wrangler.json` and writes `.wrangler/deploy/config.json` pointing wrangler at it. From that moment the environment is baked in, and [Cloudflare's docs state plainly](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/) that `CLOUDFLARE_ENV` on `wrangler deploy` "will have no effect".

So the pack handles both: `cf-build.sh` exports `CLOUDFLARE_ENV=staging` on a non-production branch, and `cf-deploy.sh` drops `--env staging` when it detects the redirect.

**Why this is written down rather than left to the scripts.** Before the pack did this, a plugin-built repo silently deployed *every* feature branch to the production Worker bound to the production database. Nothing errored: the build was green, a preview URL was printed, and it happened to be production's. Worse, migrations still went to the staging database, so code and schema drifted apart in exactly the way the two-environment model exists to prevent.

### The guard

`cf-deploy.sh` re-reads the name wrangler will actually deploy — from the generated config when one exists, the source config otherwise — and **refuses to deploy** when a non-production branch resolves to production's Worker:

```
cf-deploy: ERROR — on branch 'feat/x' the staging environment resolves to the
cf-deploy: production Worker 'myapp'. Deploying would overwrite production.
```

It catches the whole class — a missing `env.staging.name`, a build that didn't select the environment, a future plugin change — rather than any one instance of it. Verified against a live repo: with the selection deliberately broken, the deploy is blocked and production is untouched.

## Twin every stateful binding

Among `vars` and bindings, an environment **inherits nothing it doesn't redeclare**. Every stateful binding must appear inside `env.staging` pointing at its own resource — a *twin*, not a shared resource with a staging namespace inside it.

That scope matters, because the rest of the config behaves the *opposite* way:

```
  non-inheritable   vars, bindings        env.staging starts EMPTY
                                          → forget one and staging lacks it

  inheritable       triggers, limits,     env.staging starts from PRODUCTION
                    observability, …      → forget one and staging silently
                                            acquires production's behaviour
```

Both directions are silent. The first is the one the twin table below covers; the second is why [cron triggers](#cron-triggers-inherit-omitting-them-does-not-disable-them) need an explicit override rather than an omission.

That's a deliberate rule, and the reason is cost:

- A **twin** is a second resource behind the same binding name. It needs **zero application code** — the Worker never learns which one it got.
- A **prefix** (one bucket, staging keys under `staging/`) needs **every call site to cooperate**, forever. One forgetful write goes into production data.

So: twin by default; a prefix only where a twin genuinely isn't available.

| Binding | In staging | Note |
|---|---|---|
| D1 | twin database | must declare its own `database_name` — the scripts read it from inside the environment |
| Queues | twin queue | **producer and consumer both**, or staging messages land on the production consumer |
| R2 | twin bucket | not a `staging/` key prefix |
| KV | twin namespace | |
| Durable Objects | nothing to do | DO storage is per-Worker; a separate Worker is already isolated |
| Cron triggers | **explicit** `"triggers": { "crons": [] }` | inheritable — omitting the key inherits production's schedule, it does not disable it |
| Secrets | `npm run secrets:push` | loads both Workers from `.dev.vars`; see [the secret model](#one-declared-list-of-secrets-two-workers) |
| Service bindings | **repoint** at the staging counterpart | |

The last two bite differently. A missing staging secret fails **loudly** on the first run. A service binding copied into `env.staging` but left pointing at production fails **quietly** — staging code, production side effects, no error anywhere.

You don't have to catch either by eye: **`npm run secrets:check`** fails the build when a binding declared at the top level is missing from `env.staging` or when the two Workers' secret names disagree, and warns when a staging service binding still targets production's service. It runs on every push.

The exact JSONC to merge is in the pack's [config fragments](../../.claude/skills/wong-sync/references/stack-pack-fragments.md).

### Cron triggers inherit; omitting them does not disable them

The row above is the one place the twin table's logic inverts, so it is worth stating on its own. `triggers` is an **inheritable** key. Declare crons at the top level and leave `env.staging` silent, and the staging Worker inherits that schedule and fires on it — against the staging database, with no error and nothing in the config that looks wrong.

To keep staging manual-only, say so:

```jsonc
"env": {
  "staging": {
    "triggers": { "crons": [] }
  }
}
```

Omit the key **only** when staging genuinely should run production's schedule.

Exercising a cron by manual trigger instead is a reasonable choice, and it costs less than it looks: what goes untested is the *schedule*, not the handler. Keep `scheduled()` and the manual trigger calling the same function so the tested path can't drift from the real one. The cron expression itself is only ever verifiable in production — check the Worker's Triggers tab after the first deploy.

## One declared list of secrets, two Workers

`env.staging` is a second Worker, so it has a second secret store. Nothing syncs the two: a `wrangler secret put` reaches exactly one of them, which makes "remember two commands, forever" the maintenance burden and drift the default state.

The pack collapses that to one declared list.

```
  .dev.vars            ─┬─▶  production Worker
  (git-ignored,         │
   your real values)    └─▶  staging Worker        ← unless .dev.vars.staging exists

  .dev.vars.example    committed, names only — what `secrets:check` compares against
```

```bash
npm run secrets:push    # load both Workers from .dev.vars
npm run secrets:check   # do the two Workers still agree?
```

`wrangler dev` already reads `.dev.vars`, so the same file serves local development and both deployments.

### `.env` and `.dev.vars` are not interchangeable

| File | Holds | Reaches |
|---|---|---|
| `.env` | what CI and the pack's scripts authenticate **with** — chiefly `CLOUDFLARE_API_TOKEN` | Cloudflare's API. **Never a Worker.** |
| `.dev.vars` | what the **Worker** reads off `env` | both Workers, via `secrets:push` |

`CLOUDFLARE_API_TOKEN` can widen its own permissions and create account resources. Put it in a Worker's runtime environment and any log leak or code-execution bug there escalates to the whole Cloudflare account. `secrets:push` **refuses** to load `.env` — it resolves symlinks first, and it also stops if `.dev.vars` itself contains a `CLOUDFLARE_*` or `CF_ACCESS_*` key. That's a guard rather than a note in a doc because the two files look interchangeable and the mistake only has to happen once.

### Same values by default; diverge where writes escape

`secrets:push` falls back to `.dev.vars` for staging, so both Workers get identical values unless you create a git-ignored **`.dev.vars.staging`**. No command changes; the file's existence is the switch.

Identical values are fine for read-only or harmless credentials. **Diverge for anything with third-party write side effects** — payment keys, outbound email and SMS, webhook targets. Sharing those lets a branch on staging charge a real card or email a real customer: the same production-contamination hole that twinning the database closes, re-opened one layer up at the API. It fails quietly, in the same family as a service binding left pointing at production.

### What the gate can and can't see

`secrets:check` compares **names only** — no value is read, printed, or logged, so it is safe in CI where output is retained. Because `.dev.vars` is git-ignored and absent in CI, the assertion that *fails* is Worker against Worker: production's secret names against staging's. `.dev.vars.example` is consulted when present, but only to **warn** — it is uncorroborated, and a repo may set a secret out of band.

That leaves one blind spot by construction: a key missing from *both* Workers looks like perfect parity. The example file's warning is what covers it, which is the reason to keep it current.

The check skips rather than fails when the repo has no `CLOUDFLARE_API_TOKEN` (not provisioned) or no `env.staging` (not on the two-Worker model), so adopting the pack never produces a permanently red check.

## Staging is shared, and that's the trade

There is one staging Worker and one staging database, shared by every branch. The last branch to push owns them.

```
  per-commit          shared
  ──────────          ──────
  alias URLs   │   staging Worker + staging D1
  (UI review)  │   (imports, queues, crons)
```

Two consequences, both real:

- Two branches pushing in the same window overwrite each other's staging deploy. For a small team this is a shrug; if it starts hurting, the branch name is already in `cf-deploy.sh`, so narrowing the scope is a small change rather than a redesign.
- Concurrent resets or migrations across parallel branches can stomp each other, and an abandoned branch can leave its migration applied. [`db:reset:staging`](#seeded-staging-production-untouched) is the routine recovery, not a heavyweight operation.

### Why not a Worker per pull request

Because Cloudflare doesn't offer one, and building it isn't worth it. A Worker per PR means, per PR: a created-migrated-seeded D1, its own queue, its own bucket, its own secrets, its own [Access](cloudflare-access.md) policy — and a teardown job on close, or orphaned resources accumulate forever. That's an environment provisioner, easily larger than the app using it.

The decision is recorded here so it isn't re-litigated. If contention ever justifies it, the escape hatch is the branch name `cf-deploy.sh` already has.

## Timestamp migrations, additive and order-independent

Migration files live in `schema/migrations/` and are named:

```
YYYYMMDDHHMMSS_short_name.sql      e.g. 20260727142530_add_users_email.sql
```

The timestamp prefix does real work: **filename order equals author order equals apply order.** Two branches authoring migrations in parallel structurally cannot collide on a prefix — each gets the second it was written. That's why the pack carries *no* duplicate-prefix guard: with timestamps, a collision can't happen.

**The rule: migrations are additive and order-independent.** A slow branch can merge a migration with an *older* timestamp *after* a newer one already landed. A fresh database (staging after a reset, a new environment) then replays them in filename order — a different order than production applied them in. If every migration only *adds* (a new table, a new nullable column, a new index) that reordering is harmless. A migration that *depends on another having run first* — backfilling a column another migration added, say — breaks under replay. Keep each migration self-contained and additive; when a change genuinely needs ordering, fold it into a single migration file.

Forward-only, too: no `down` scripts. A migration that shouldn't have shipped is fixed by a *new* migration (or, for production, [Time Travel](#recovery-a-bad-migration-reached-production)) — never by editing or deleting the file that already ran, which fresh databases still need to replay.

## Seeded staging, production untouched

Staging is a **seeded fixture database, not a mirror of production.** `npm run db:reset:staging` runs [`scripts/reset-staging-d1.mjs`](#the-scripts), which:

1. Drops every object (tables, views, triggers) from the staging database.
2. Applies the migrations to staging.
3. Applies `schema/seed.sql` — data-only INSERTs.

It never reads, exports, or touches production. That makes the reset safe, fast, and deterministic — the escape hatch when [shared staging](#staging-is-shared-and-thats-the-trade) gets wedged by an abandoned branch's migration.

`schema/seed.sql` ships as a commented, empty template. Fill it with the few rows a preview needs to be exercisable. **A change that alters a seeded table updates `schema/seed.sql` in the same change** — so a reset always matches the current schema.

The trade-off, stated plainly: fixtures won't catch a migration that only breaks on production-scale data shapes (400k rows, an unexpected NULL). The mitigation is that production migrations are forward-only and run against real data for the first time at merge, with [Time Travel](#recovery-a-bad-migration-reached-production) behind them.

## The scripts

All of them read repo-specific values from `wrangler.jsonc` (names, ids) or `.env` (secrets) — no per-repo literal, so every copy is byte-identical and upstream refreshes never conflict.

| Script | Run by | Does |
|---|---|---|
| `scripts/cf-build.sh` | the workflow's **build** step | Migrate production or staging by branch, then build. `--app-dir` prints where `package.json` lives, so CI can install in the right place. |
| `scripts/cf-deploy.sh` | the workflow's **deploy** step | Deploy the production Worker on the default branch; on any other, deploy the staging Worker and then upload a per-commit staging version for the alias URL. |
| `scripts/reset-staging-d1.mjs` | `npm run db:reset:staging` | Drop staging → apply migrations → apply `schema/seed.sql`. Never touches production. |
| `scripts/cf-secrets.mjs` | `npm run secrets:push` / `secrets:check`, and the workflow's **parity** step | Load both Workers from `.dev.vars`, refusing `.env`; compare the two Workers' secret names and staging's bindings against production's. |
| `scripts/lib-wrangler-config.sh`<br>`scripts/lib-wrangler-config.mjs` | sourced/imported by the above | One copy of "where is the wrangler config" and "what is this environment's database name", so a build and its deploy can't resolve different apps. |

Common operations:

```bash
npm run db:migrate:staging   # apply pending migrations to staging without a reset
npm run db:migrate:prod      # apply pending migrations to production (rare; the deploy does this)
npm run db:reset:staging     # rebuild staging from migrations + seed

npm run secrets:push         # load both Workers from .dev.vars
npm run secrets:check        # do the two Workers still agree?
```

## CI is GitHub Actions

The pack ships `.github/workflows/deploy.yml`, and it is deliberately thin — it sets the branch and runs the two scripts above:

```yaml
CF_BRANCH: ${{ github.head_ref || github.ref_name }}
CF_PRODUCTION_BRANCH: ${{ github.event.repository.default_branch }}
```

**The scripts own every deploy decision, not the workflow.** That's the point: production, the staging Worker, and the per-commit preview alias behave identically whichever CI invokes them, and switching backends is a matter of where the scripts are called from.

| Variable | Set by | If absent |
|---|---|---|
| `CF_BRANCH` | the workflow | falls back to `WORKERS_CI_BRANCH`; neither set → local mode, migrate and deploy nothing |
| `CF_PRODUCTION_BRANCH` | the workflow, from the repo's default branch | `main` |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub repository secrets | no secrets → build-only |

`WORKERS_CI_BRANCH` is still honored, so a repo on Cloudflare Workers Builds keeps working unchanged and a repo mid-migration can run both.

**Before the repo is provisioned there are no secrets, and the workflow builds without deploying** — an unprovisioned repo gets a real pull-request check (types, build errors) instead of a permanently red one. [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md) sets the secrets, and it starts deploying.

### Why not Cloudflare's own Workers Builds

It can't be automated. Cloudflare's Builds API triggers builds, patches existing triggers, and reads logs, but **cannot create the repository connection, set the production branch, or create the first trigger** — and the GitHub App it needs requires browser OAuth consent that `gh` cannot grant. That's three dashboard steps per repo, forever.

Actions is `gh secret set` plus this file. It also produces a real pull-request check, and a red build is `gh run view --log-failed` — the surface `/save` and `/ship` already read, with no Cloudflare credential involved. The costs, plainly: Actions minutes are billable on private repos (2,000/month free; public unlimited), and the credentials also live in GitHub secrets.

Staying on Workers Builds is supported and needs no changes — point its build command at `scripts/cf-build.sh` and its deploy command at `scripts/cf-deploy.sh`, and don't add the workflow.

## Adopting the staging environment

For a repo running the older model — one Worker, a `preview_database_id`, and a `swap-d1-id.js` that rewrote the binding on preview branches. [`/wong-sync`](../../.claude/skills/wong-sync/SKILL.md) never modifies a file a repo already has, so it copies in what's missing and leaves the rest to you. This is the sequence, ordered so that stopping partway leaves the repo behaving exactly as it did before:

1. **Create the staging twins** — a D1 database (reuse the one `preview_database_id` already points at), plus a queue, bucket, or KV namespace for each stateful binding the Worker has. See [the twin table](#twin-every-stateful-binding).
2. **Add the `env.staging` block** to `wrangler.jsonc`, redeclaring every stateful binding, and remove `preview_database_id`. Nothing changes yet — the deploy command is still the default.
3. **Put the secrets**: collect every secret the Worker reads into `.dev.vars` and run `npm run secrets:push`, which loads both Workers. Add `.dev.vars.staging` for any value that must differ — see [the secret model](#one-declared-list-of-secrets-two-workers).
4. **Repoint service bindings** inside `env.staging` at their staging counterparts. This is the quiet one — nothing fails if you skip it.
5. **Check [Access](cloudflare-access.md) covers the staging Worker's hostname.** The recommended `*.<subdomain>.workers.dev` wildcard already does; a per-hostname application list needs `<worker>-staging` added.
6. **Take the scripts**: `scripts/cf-deploy.sh`, `scripts/lib-wrangler-config.sh`, and `scripts/cf-secrets.mjs` are new; `cf-build.sh`, `reset-staging-d1.mjs`, and `lib-wrangler-config.mjs` are updated. Delete `scripts/swap-d1-id.js`.
7. **Update `package.json`**: `db:migrate:staging` moves from `--preview` to `--env staging` and takes the staging database's name.
8. **Repoint the deploy command** to `bash scripts/cf-deploy.sh`. *This is the switch* — everything before it was preparation.
9. **Verify**: push a branch, open both [preview URLs](#two-preview-urls-and-only-one-of-them-runs-your-queue), and confirm a queue message is handled by the staging Worker against the staging database.

Rolling back is restoring `swap-d1-id.js`, reverting the config, and resetting the deploy command. No data migration is involved — staging is a [seeded fixture](#seeded-staging-production-untouched) that `db:reset:staging` rebuilds.

## Recovery: a bad migration reached production

Migrations are forward-only and auto-applied on merge. If one breaks production, restore with **D1 Time Travel** — point-in-time restore, no down script needed:

```bash
# Find a bookmark from before the bad migration ran (timestamps in UTC):
npx wrangler d1 time-travel info <db-name>

# Restore to it:
npx wrangler d1 time-travel restore <db-name> --bookmark <bookmark>
```

The default Time Travel window is 30 days on the standard plan — confirm your retention before relying on it for a non-trivial recovery. Then revert the offending migration in git and write a corrected one; the next merge applies it.

## Recovery: never hand-apply schema to production

**The build script is the only thing that should run DDL against production.** It replays `schema/migrations/` through `wrangler d1 migrations apply`, which records each file it ran in the `d1_migrations` ledger. Run an `ALTER TABLE` / `CREATE TABLE` against production by hand and you change the schema **without** recording anything in that ledger. The next deploy re-runs the migration file that "owns" that change and fails — `duplicate column name`, `table already exists` — turning the default branch red and blocking *every* deploy until it's reconciled. (This is not hypothetical: a hand-applied column once kept a production branch red for 8 commits.)

So ship every schema change as a migration through the normal flow: [`/save`](../../.claude/skills/save/SKILL.md) exercises it on staging, the merge applies it to production. If a genuine emergency forces a hand-apply, record it in the ledger **in the same session** so history matches reality:

```bash
npx wrangler d1 execute <db-name> --remote \
  --command "INSERT INTO d1_migrations (name) VALUES ('<the-migration-filename>.sql')"
```

## Recovery: production schema drifted from `d1_migrations`

**Symptom:** the deploy is red with `duplicate column name: X` or `table X already exists`, yet `wrangler d1 migrations list <db-name> --remote` still shows that migration as **pending**. Production's schema already has the change, but the ledger doesn't record the file that introduces it — a hand-apply, or a migration that errored *after* its DDL ran but *before* it was recorded.

**Fix — reconcile the ledger to reality; don't edit the migration file:**

```bash
# 1. Confirm the change is genuinely already in production:
npx wrangler d1 execute <db-name> --remote \
  --command "SELECT sql FROM sqlite_master WHERE name='<table>'"

# 2. Mark the migration applied so the next deploy skips it:
npx wrangler d1 execute <db-name> --remote \
  --command "INSERT INTO d1_migrations (name) VALUES ('<the-migration-filename>.sql')"

# 3. Verify it (and only it) dropped off the pending list:
npx wrangler d1 migrations list <db-name> --remote
```

Leave the migration **file unchanged** — fresh databases and staging still need it to add the change normally; only production's *recorded history* was out of sync. The build goes green on the next deploy.

## Next

- What you build on the pipeline: the [core stack](core-stack.md).
- The tokens the scripts need in CI: [Cloudflare credentials](cloudflare-credentials.md).
- The login wall over production, staging, and the preview URLs: [Cloudflare Access](cloudflare-access.md).
- Back to the stack overview: [Cloudflare stack](README.md).
