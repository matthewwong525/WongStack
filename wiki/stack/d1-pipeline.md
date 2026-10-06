# Deploy and data pipeline

How code and data ship on the [Cloudflare stack](README.md): **two environments, two Workers, migrations that apply on deploy.** A push to a feature branch migrates and deploys the *staging* Worker; a merge to the default branch migrates and deploys the *production* Worker. The [pack scripts](#the-scripts) implement it and read every repo-specific value from `wrangler.jsonc`, so they're identical in every repo.

**The pipeline needs a Worker to run through it.** Everything below describes what happens to an application once it exists. An install starts from an empty folder and receives WongStack's own starter app, the [app scaffold](../../.agents/skills/wong-sync/references/payload-manifest.md#the-app-scaffold). The `wrangler.jsonc` that binds it to these two environments is written by [setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config) with the ids it provisions — including `main`, so the config points at whichever entry point the repo ended up with.

This is the runnable half of the stack — the [core stack](core-stack.md) is *what* you build on, this is *how* changes reach production safely. Go to [fix a broken production database](d1-recovery.md) when production is red; read top-to-bottom to set it up.

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

`scripts/cf-build.sh` is the **build step**. It reads both database names from `wrangler.jsonc` — the top-level one for production, the one inside `env.staging` for staging — so nothing is baked in. Your real build lives under `build:app`, which the wrapper calls after migrating.

`scripts/cf-deploy.sh` is the **deploy step**. On the pack's [GitHub Actions workflow](github-actions.md) — the default — both are invoked by `deploy.yml` and there is nothing to configure. The production branch defaults to `main`; set `CF_PRODUCTION_BRANCH` in CI if yours differs.

**Only on the [Workers Builds fallback](github-actions.md#why-not-cloudflares-own-workers-builds)** is there a dashboard step, and it's the one thing that CI cannot set for you:

```
Workers Builds → Settings → Build → Deploy command:   bash scripts/cf-deploy.sh
```

Leave that fallback's default `npx wrangler deploy` in place and branch pushes go back to uploading versions of the *production* Worker — the exact behaviour this model replaces.

On a branch it **deploys first, then uploads the version.** That order is load-bearing: `wrangler versions upload` refuses to run against a Worker that doesn't exist yet, which is exactly the state on the first branch push in a repo — so uploading first would fail before the deploy that creates the staging Worker. On the production branch, wrangler warns that environments are defined but none was named; that's expected, and the bindings it prints are the top-level production ones.

### Two preview URLs, and only one of them runs your queue

A branch push produces two reachable URLs, and they are not equivalent:

| URL | What it is | Serves HTTP | Runs queues, crons |
|---|---|---|---|
| `<branch>-<worker>-staging.workers.dev` | a version of the staging Worker, pinned to that commit | ✓ | ✗ |
| `<worker>-staging.workers.dev` | the deployed staging Worker | ✓ | ✓ |

Use the alias URL for UI review — it's per-commit, so two branches never collide. Use the staging Worker URL when you're exercising an import, a queue, or anything scheduled. "Why didn't my import run?" is almost always "you were on the alias URL."

#### How the alias URL reaches the tooling

`/save` prints a preview link and the [staging walkthrough](../development/staging-walkthrough.md) that `/verify` runs walks one, and both find it the same way — by asking GitHub what was deployed for this commit. Which CI backend you're on decides who tells GitHub:

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

Every stateful binding, such as a database, queue, or bucket, gets its own staging copy declared inside `env.staging`, and cron triggers need an explicit override. The table and the reasons live in [staging bindings and secrets](staging-bindings.md#twin-every-stateful-binding).

## One declared list of secrets, two Workers

One git-ignored `app/.dev.vars` loads both Workers' secrets through `npm run secrets:push`, and `npm run secrets:check` fails when they drift. How it works, and where staging's values should differ: [staging bindings and secrets](staging-bindings.md#one-declared-list-of-secrets-two-workers).

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

**Checks take turns.** [`/verify`](../development/staging-walkthrough.md) holds one staging turn while it walks, so two checks never reset or write staging at once, across machines. The turn is a marker kept with the repository's saved work (`refs/wong/staging-turn` on the remote): the one store every machine already shares, and a push there starts no CI run. A walk takes it, rebuilds staging, walks, and gives it back; a turn its holder never returned expires after 15 minutes. A host that refuses the marker walks without a turn and says so.

A turn covers checks only. A reset still wipes data someone is looking at on their preview, and another branch's push still redeploys the staging Worker mid-walk; the next walk rebuilds the data.

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

Forward-only, too: no `down` scripts. A migration that shouldn't have shipped is fixed by a *new* migration (or, for production, [Time Travel](d1-recovery.md#a-bad-migration-reached-production)) — never by editing or deleting the file that already ran, which fresh databases still need to replay.

## Seeded staging, production untouched

Staging is a **seeded fixture database, not a mirror of production.** `npm run db:reset:staging` runs [`scripts/reset-staging-d1.mjs`](#the-scripts), which:

1. Drops every object (tables, views, triggers) from the staging database.
2. Applies the migrations to staging.
3. Applies `schema/seed.sql` — data-only INSERTs.

It never reads, exports, or touches production. That makes the reset safe, fast, and deterministic — the escape hatch when [shared staging](#staging-is-shared-and-thats-the-trade) gets wedged by an abandoned branch's migration.

`schema/seed.sql` ships as a commented, empty template. **A change that adds or alters a feature adds the made-up rows its scenarios need, in the same change**: sample customers, orders, or records, realistic in shape, with no real person's details. Every check before publishing [starts from these rows](../development/staging-walkthrough.md#why-a-walk-runs-the-way-it-does), so a feature with no sample data goes unchecked, and the check names it. A change that alters a seeded table updates the file too, so a reset always matches the current schema.

The trade-off, stated plainly: fixtures won't catch a migration that only breaks on production-scale data shapes (400k rows, an unexpected NULL). The mitigation is that production migrations are forward-only and run against real data for the first time at merge, with [Time Travel](d1-recovery.md#a-bad-migration-reached-production) behind them.

## The scripts

All of them read repo-specific values from `wrangler.jsonc` (names, ids) or `.env` (secrets) — no per-repo literal, so every copy is byte-identical and upstream refreshes never conflict.

| Script | Run by | Does |
|---|---|---|
| `scripts/cf-build.sh` | the workflow's **build** step | Migrate production or staging by branch, then build. `--app-dir` prints where `package.json` lives, so CI can install in the right place. |
| `scripts/cf-deploy.sh` | the workflow's **deploy** step | Deploy the production Worker on the default branch; on any other, deploy the staging Worker and then upload a per-commit staging version for the alias URL. |
| `scripts/cf-preview.sh` | [`/apply`](../../.agents/skills/apply/SKILL.md), for a preview from the agent's machine | Install, migrate staging, build, upload a staging version under the preview alias, and print its URL. Never deploys production. |
| `scripts/reset-staging-d1.mjs` | `npm run db:reset:staging`, and `/verify` before each walk | Drop staging → apply migrations → apply `schema/seed.sql`. Never touches production. |
| `scripts/cf-secrets.mjs` | `npm run secrets:push` / `secrets:check`, and the workflow's **parity** step | Load both Workers from `app/.dev.vars`, refusing `.env`; compare the two Workers' secret names and staging's bindings against production's; `shared` lists which keys staging shares with production. |
| `scripts/check-app-keys.mjs` | the app's `npm test`, with the code checks | Fail when an app's server side or a main handler names a saved key [its route does not list](company-api.md#list-the-keys-a-route-uses). |
| `scripts/check-app-checks.mjs` | `npm run test:checks`, which the Test check runs when a check's settings or tools change | Hand each check of `npm test` a bad sample, and fail when one lets it through: [a check proves it can still fail](../development/the-change-loop.md#the-gate). |
| `scripts/lib-wrangler-config.sh`<br>`scripts/lib-wrangler-config.mjs` | sourced/imported by the above | One copy of "where is the wrangler config", "what is this environment's database name", "which branch is production", and the staging guards, so a build, its deploy, and a preview can't resolve different apps. |
| `scripts/lib-cli.mjs` | imported by the `.mjs` scripts | One CLI convention: `--help` prints usage and exits 0, and a usage error exits 2. It passes on the memory skill's `scripts/lib/cli.mjs`, which skills share too. |

Common operations:

```bash
npm run db:migrate:staging   # apply pending migrations to staging without a reset
npm run db:migrate:prod      # apply pending migrations to production (rare; the deploy does this)
npm run db:reset:staging     # rebuild staging from migrations + seed

npm run secrets:push         # load both Workers from app/.dev.vars
npm run secrets:check        # do the two Workers still agree?
```

The two `db:migrate:*` aliases are the one part of that list provisioning writes rather than copies, since they name your databases literally and a hardcoded name can't travel between repos — they arrive through the [`package.json` fragment](../../.agents/skills/wong-sync/references/stack-pack-fragments.md#packagejson--scripts). They're a convenience only: `cf-build.sh` migrates on every build, reading the name out of the wrangler config itself.

## CI is GitHub Actions

A thin `.github/workflows/deploy.yml` sets the branch and runs the two scripts above; the scripts own every deploy decision. The workflow, its variables, and why not Cloudflare's Workers Builds: [CI on GitHub Actions](github-actions.md).

## Next

- What you build on the pipeline: the [core stack](core-stack.md).
- What the staging Worker declares for itself: [staging bindings and secrets](staging-bindings.md).
- How CI runs it: [CI on GitHub Actions](github-actions.md).
- When production's database breaks: [fix a broken production database](d1-recovery.md).
- The tokens the scripts need in CI: [Cloudflare credentials](cloudflare-credentials.md).
- The login wall over production, staging, and the preview URLs: [Cloudflare Access](cloudflare-access.md).
- Back to the stack overview: [Cloudflare stack](README.md).
