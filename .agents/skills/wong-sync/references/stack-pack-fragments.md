# Stack-pack config fragments

The [Cloudflare stack pack](payload-manifest.md#the-opt-in-stack-pack) delivers two kinds of file. Its **drop-in files** (the `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) are whole files the target owns — they ride the manifest and follow the normal rule: copied if absent, adapted if present, never overwritten. The four **config fragments** below are different: they must *merge* into files the target already owns, so they are **not** manifest pull-files. They are applied the way the `CLAUDE.md` `WONG-STACK` block is: **show the fragment, apply it with the user's confirmation, never blind-write over the target's file.**

Apply these only for a repo that took the pack (`components.stackPack: true`). **[`/wong-cloudflare`](../../wong-cloudflare/SKILL.md) is the applier**: the id-free fragments (`package.json`, `.env.example`, `.gitignore`) at the start of a run where they're missing, and the `wrangler.jsonc` block at its binding step, filled with the real resource ids it just created. `/wong-setup` applies none of them. `/wong-sync` surfaces a changed fragment through its adapt step on the rare occasion upstream changes one — a fragment can't be cleanly re-merged into a file the user has since edited, so it is *re-offered* as a guided edit, never auto-merged.

For each fragment: read the target's current file, show what you'd add, and merge on a yes — preserving everything already there. If the target file doesn't exist yet, create it from the fragment.

## `package.json` → `scripts`

The `build` script becomes the CI wrapper; the repo's real build moves to `build:app` (what `cf-build.sh` delegates to). Merge these keys into the existing `scripts` object, keeping every other script:

```jsonc
{
  "scripts": {
    "build": "bash scripts/cf-build.sh",
    "build:app": "<the repo's existing build command — e.g. tsc -b && vite build>",
    "db:migrate:staging": "wrangler d1 migrations apply <your-staging-db-name> --remote --env staging",
    "db:migrate:prod": "wrangler d1 migrations apply <your-db-name> --remote",
    "db:reset:staging": "node scripts/reset-staging-d1.mjs",
    "secrets:push": "node scripts/cf-secrets.mjs push",
    "secrets:check": "node scripts/cf-secrets.mjs check"
  }
}
```

If the repo already has a `build`, rename it to `build:app` (confirm first) so `cf-build.sh` can call it.

**Paths here are relative to the `package.json` you're merging into.** When the Worker lives in a subdirectory (the `app/` layout the SPA pack and the [app scaffold](payload-manifest.md#the-opt-in-app-scaffold) ship), that's `app/package.json`, so the script paths become `bash ../scripts/cf-build.sh`, `node ../scripts/reset-staging-d1.mjs`, and `node ../scripts/cf-secrets.mjs`. The two `db:migrate:*` scripts have no such path — they invoke `wrangler` directly and are unchanged between layouts, but wrangler must find the config, so run them from the directory holding it. The scripts under `scripts/` resolve the repo root from their own location, so they work from either layout.

Write the **literal** `database_name` into each `db:migrate:*` script — the production name for `db:migrate:prod`, the staging twin's name for `db:migrate:staging`. (An earlier version of this page used `$npm_package_config_db`, which expands to an empty string unless the `package.json` also defines a `config.db` key — leaving wrangler with no database argument.) These two are only a convenience alias: the scripts under `scripts/` read the name out of the wrangler config themselves.

**Those two scripts live here and nowhere else.** A hardcoded database name cannot travel between repos, so no copied payload file may carry one — the [app scaffold's](payload-manifest.md#the-opt-in-app-scaffold) `app/package.json` ships without them deliberately. `/wong-cloudflare` fills them from the databases it derives, as part of applying this fragment, so they arrive correct the first time they exist rather than arriving broken and waiting to be edited.

## `wrangler.jsonc` → the Worker entry, bindings, and `env.staging`

This fragment is the **only thing in the payload that creates a wrangler config**, so it describes a deployable Worker and not bindings alone. The top level declares the entry point, the static assets, and production's bindings. A `staging` environment declares its own Worker name and a **twin** of every stateful binding — a second database, a second queue, a second bucket. Merge every part, filling the ids from the resources you created:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "<your-worker>",
  "main": "worker/index.ts",
  "compatibility_date": "<today, YYYY-MM-DD>",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<your-db-name>",
      "database_id": "<production database_id>",
      "migrations_dir": "../schema/migrations"
    }
  ],
  "env": {
    "staging": {
      "name": "<your-worker>-staging",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "<your-db-name>-staging",
          "database_id": "<staging database_id>",
          "migrations_dir": "../schema/migrations"
        }
      ],
      // Only if production declares crons — see the fifth rule below.
      "triggers": { "crons": [] }
    }
  }
}
```

Seven rules the scripts depend on:

- **`migrations_dir` is written per layout, and the block above shows the `app/` one.** Wrangler resolves it relative to the **config file**, exactly like `main` — but unlike `main` the two layouts need *different* text, because the pack ships `schema/` at the **repo root** while the config sits beside the Worker. In the `app/` layout the app scaffold ships (the default for a repo that had no app of its own) that is `../schema/migrations`; where the Worker and its config sit at the repo root, drop the `../` and write `schema/migrations`.
  Getting it wrong costs a build: a config in `app/` saying `schema/migrations` points at `app/schema/migrations`, which never exists, and `cf-build.sh` stops with `No migrations present at …` on the first change that carries one. It is not silent — the wrapper exits non-zero and CI goes red — but the path in the error is one the user never chose and cannot place.
- **The fragment must describe a deployable Worker, not just bindings.** Nothing else in the payload creates a wrangler config — `app/wrangler.jsonc` is [deliberately not copied](payload-manifest.md#the-opt-in-app-scaffold), because it carries live `database_id`s — so a config produced from bindings alone has no entry point and `wrangler deploy` has nothing to build. To the user that is indistinguishable from a broken install: the provisioning run reports success and the address serves nothing. Hence `main`, `assets`, `compatibility_date`, and `compatibility_flags` above. `main` is resolved relative to the config file, so `worker/index.ts` is right for both layouts — the config sits beside the Worker either way. Set `compatibility_date` to the day you create the config, not to a date copied from elsewhere.
- **`env.staging` needs its own `name`.** Without it the environment inherits production's, and a branch deploy lands on the production Worker. `cf-deploy.sh` refuses to deploy when the staging environment resolves to production's name, so this fails loudly rather than silently — but declare the name and the check never has to fire.
- **`env.staging` needs its own `d1_databases` entry**, with the staging database's own `database_name`. `cf-build.sh` and `reset-staging-d1.mjs` read the name from *inside* the environment block; without it they stop with an explicit error rather than touching production.
- **An environment inherits nothing it doesn't redeclare — among `vars` and bindings.** Every stateful binding must be repeated inside `env.staging` pointing at its twin. A binding you forget is simply absent in staging; a *service* binding you copy without repointing quietly calls production. (`npm run secrets:check` fails the build on the first of those and warns on the second.)
- **Cron triggers are the exception: `triggers` is inheritable.** Leave it out of `env.staging` and the environment inherits production's schedule, so the staging Worker fires on its own against the staging database — the opposite of what omitting a key looks like it does, with no error. To keep staging manual-only, declare `"triggers": { "crons": [] }` explicitly, as above. Omit the key entirely only when staging *should* run production's schedule.
- **`migrations_dir` is resolved relative to the wrangler config file, not the repo root** — and it must be repeated inside the environment. The value above is right when the config sits at the repo root; in the `app/` layout it's `"../schema/migrations"`, since `schema/` stays at the root. Get it wrong and wrangler reports no migrations to apply rather than erroring.

Twin every other stateful binding the same way. A queue needs both halves inside the environment, or staging messages land on the production consumer:

```jsonc
"queues": {
  "producers": [{ "binding": "CAPTURE_QUEUE", "queue": "<your-queue>-staging" }],
  "consumers": [{ "queue": "<your-queue>-staging" }]
}
```

**If the app builds through `@cloudflare/vite-plugin`, the environment is chosen at BUILD time.** The plugin flattens the selected environment into a generated `dist/<worker>/wrangler.json` and writes `.wrangler/deploy/config.json` redirecting wrangler at it — after which [Cloudflare's docs are explicit](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/) that `--env` on `wrangler deploy` "will have no effect". `cf-build.sh` therefore exports `CLOUDFLARE_ENV=staging` on non-production branches, and `cf-deploy.sh` drops `--env staging` when it sees the redirect. Both are handled for you; the reason it matters is that getting it wrong deploys branch code to production **without any error at all**.

There is no `preview_database_id` and no swap script: which database a branch binds is decided by which Worker it deploys to. See [`d1-pipeline.md`](../../../../wiki/stack/d1-pipeline.md) for the full twin table and the reasoning.

## Workers Builds fallback only: the deploy command

Not a fragment, and **not part of the default install**: the pack's CI is [GitHub Actions](../../../../wiki/stack/d1-pipeline.md#ci-is-github-actions), which needs no dashboard step. Only a repo that chose the [Workers Builds fallback](../../../../wiki/stack/d1-pipeline.md#why-not-cloudflares-own-workers-builds) has this one dashboard setting to change — pointing the deploy command at `bash scripts/cf-deploy.sh` — and that page owns it. Mention it only when a repo is actually on that fallback.

## `.env.example` → Cloudflare variables

Add these documented, blank lines (the pack's [credentials page](../../../../wiki/stack/cloudflare-credentials.md) explains each, and **owns the token variable's name** — don't rename it here; a rename is a behavioural change requiring a version bump, and it has silently regressed three times). Real values go in the git-ignored `.env`:

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens
# (NOT an account token — the /user/* endpoints this setup depends on reject those).
# Two permission groups is all it needs: setup widens the token's own scope from there, no asking.
CLOUDFLARE_API_TOKEN=
# Your Cloudflare account ID (dashboard → any domain → Overview, or the URL).
CLOUDFLARE_ACCOUNT_ID=
# Cloudflare Access service token — lets CI reach Access-gated preview URLs.
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

## `.gitignore` → the two secrets files

Two files hold real credentials and are never committed: `.env` (the account-level Cloudflare token — the one the credentials page calls *"effectively account-root, treat it like a root password"*) and `.dev.vars` (the Worker's runtime secrets). Both have per-environment variants holding real values, and both have a committed, values-blank `.example` twin. Add these four lines if they aren't already there:

```gitignore
.env*
!.env.example
.dev.vars*
!.dev.vars.example
```

**One rationale covers both pairs, and each pair needs both lines.** The wildcard is what stops a `.env.staging` or a `.dev.vars.staging` full of live values becoming committable; the negation is what keeps the `.example` file — the committed name list a new contributor works down, and that `secrets:check` reads — from being swallowed by that same wildcard. Getting either half wrong is silent: you either commit real secrets or lose the name list from git, and nothing complains.

`.env` matters most at the exact moment `/wong-cloudflare` asks for a token, since that is when a repo which never had a `.env` acquires one full of credentials. Apply this fragment **before** asking for the token, not after.

**Widening `.gitignore` does not untrack a file already committed.** If the repo has a `.env` (or `.dev.vars`) in git history, adding these lines changes nothing for it — say so plainly rather than leaving a false sense of coverage, and give them the two steps: `git rm --cached .env` to stop tracking it, and **rotate the credential**, because it is in the history of every clone and the ignore rule cannot reach back. Check with `git ls-files .env .dev.vars` before applying.

A repo that already has the bare `.dev.vars` line keeps working; widening it is the upgrade.
