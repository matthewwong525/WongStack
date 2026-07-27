# D1 pipeline

How data ships on the [Cloudflare stack](README.md): **one binding, two databases, migrations that apply on deploy.** A push to a feature branch migrates and deploys against staging; a merge to the default branch migrates and deploys against production. The three [pack scripts](#the-scripts) implement it and read every repo-specific value from `wrangler.jsonc`, so they're identical in every repo that takes the pack.

This is the runnable half of the stack — the [core stack](core-stack.md) is *what* you build on, this is *how* changes reach the database safely. Skip to the [recovery runbooks](#recovery-a-bad-migration-reached-production) when production is red; read top-to-bottom to set it up.

## The two-database model

One `d1_databases` binding in `wrangler.jsonc` names both databases:

- `database_id` — **production**. What `wrangler deploy` binds at runtime.
- `preview_database_id` — **staging**. What `wrangler ... --preview` targets.

The Worker code only ever sees the `DB` binding; which physical database it resolves to is decided at build time by the branch (below). Two databases, one binding, zero code branching.

## Auto-migrate on deploy

Cloudflare Workers Builds runs `npm run build` on every push, and the pack points `build` at [`scripts/cf-build.sh`](#the-build-wrapper). That wrapper is the whole pipeline:

```
                     push (Workers Builds runs npm run build)
                                    │
                          scripts/cf-build.sh
                                    │
                 ┌──────────────────┴──────────────────┐
           default branch                        any other branch
                 │                                       │
   migrations apply --remote            migrations apply --remote --preview
        (production D1)                          (staging D1)
                 │                                       │
                 │                    swap database_id ↔ preview_database_id
                 │                          (scripts/swap-d1-id.js)
                 └──────────────────┬──────────────────┘
                                    │
                            npm run build:app
                                    │
                            wrangler deploy
                       (binds whatever database_id now says)
```

- **Default branch** → migrations apply to **production**, then a normal build + deploy to the production URL.
- **Any other branch** → migrations apply to **staging**, then [`swap-d1-id.js`](#the-scripts) rewrites `wrangler.jsonc` so the deploy's `database_id` points at staging, so the preview URL runs on staging.
- **A developer's terminal** (no `WORKERS_CI_BRANCH`) → the wrapper skips migrate/swap and just builds. A remote database is never touched from a laptop.

The production migration runs **for the first time at merge** — the same migration already ran against staging on the branch's preview build, so the merge is its second run. There are no `down` scripts; migrations are forward-only, and recovery is [Time Travel](#recovery-a-bad-migration-reached-production).

### The build wrapper

`scripts/cf-build.sh` exists so the Workers Builds dashboard's default command (`npm run build`) does the right thing with no dashboard config. It reads the database name from `wrangler.jsonc`, so nothing is baked in. Your real build lives under `build:app` (what the wrapper calls after migrating) — e.g. `tsc -b && vite build`. The production branch defaults to `main`; set `CF_PRODUCTION_BRANCH` in CI if yours differs.

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

1. Drops every object (tables, views, triggers) from staging.
2. Applies the migrations to staging.
3. Applies `schema/seed.sql` — data-only INSERTs.

It never reads, exports, or touches production. That makes the reset safe, fast, and deterministic — the routine escape hatch when a shared staging database gets wedged by an abandoned branch's migration, not a heavyweight operation.

`schema/seed.sql` ships as a commented, empty template. Fill it with the few rows a preview needs to be exercisable. **A change that alters a seeded table updates `schema/seed.sql` in the same change** — so a reset always matches the current schema.

The trade-off, stated plainly: fixtures won't catch a migration that only breaks on production-scale data shapes (400k rows, an unexpected NULL). The mitigation is that production migrations are forward-only and run against real data for the first time at merge, with [Time Travel](#recovery-a-bad-migration-reached-production) behind them. And because every preview branch binds the *same* staging database, concurrent resets or migrations across parallel branches can stomp each other — that's the nature of a shared staging; `db:reset:staging` is the recovery.

## The scripts

All three read repo-specific values from `wrangler.jsonc` (name, ids) or `.env` (secrets) — no per-repo literal, so every copy is byte-identical and upstream refreshes never conflict.

| Script | Run by | Does |
|---|---|---|
| `scripts/cf-build.sh` | `npm run build` (CI) | Migrate the right database by branch, swap for previews, then build. |
| `scripts/swap-d1-id.js` | `cf-build.sh`, preview branches | Regex-swap `database_id` ↔ `preview_database_id` in `wrangler.jsonc` (comments preserved) so a preview deploy binds staging. Reads both ids from the file. |
| `scripts/reset-staging-d1.mjs` | `npm run db:reset:staging` | Drop staging → apply migrations → apply `schema/seed.sql`. Never touches production. |

Common operations:

```bash
npm run db:migrate:staging   # apply pending migrations to staging without a reset
npm run db:migrate:prod      # apply pending migrations to production (rare; the deploy does this)
npm run db:reset:staging     # rebuild staging from migrations + seed
```

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

So ship every schema change as a migration through the normal flow: `/save` exercises it on staging, the merge applies it to production. If a genuine emergency forces a hand-apply, record it in the ledger **in the same session** so history matches reality:

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
- The login wall over the preview URLs: [Cloudflare Access](cloudflare-access.md).
- Back to the stack overview: [Cloudflare stack](README.md).
