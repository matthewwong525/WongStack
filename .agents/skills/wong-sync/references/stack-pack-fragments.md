# Stack-pack config fragments

The [Cloudflare stack pack](payload-manifest.md#the-stack-pack) delivers two kinds of file. Its **drop-in files** (the `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) ride [the manifest](payload-manifest.md): copied if absent, adapted if present, never overwritten. The four **config fragments** below must *merge* into files the target already owns, so they are **not** manifest pull-files. Apply them like the `CLAUDE.md` `WONG-STACK` block: **show the fragment, apply it with the user's confirmation, never blind-write over the target's file.**

**[Setup's provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) is the applier**: the id-free fragments (`package.json`, `.env.example`, `.gitignore`) before it creates resources, and the `wrangler.jsonc` block at its config step, filled with the real ids. When upstream changes a fragment, `/wong-sync` *re-offers* it through its plan as a guided edit, never auto-merged.

For each fragment: read the target's file, show what you'd add, and merge on a yes, keeping everything already there. No file yet → create it from the fragment.

## `package.json` → `scripts`

`build` becomes the CI wrapper; the repo's real build moves to `build:app`, which `cf-build.sh` calls. Merge these keys into the existing `scripts` object, keeping every other script:

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

If the repo already has a `build`, rename it to `build:app` (confirm first).

**Paths here are relative to the `package.json` you merge into.** In the `app/` layout the SPA pack and the [app scaffold](payload-manifest.md#the-app-scaffold) ship, that is `app/package.json`, so the paths become `bash ../scripts/cf-build.sh`, `node ../scripts/reset-staging-d1.mjs`, and `node ../scripts/cf-secrets.mjs`. The two `db:migrate:*` scripts invoke `wrangler` directly and stay the same in both layouts, but run them from the directory holding the wrangler config. The scripts under `scripts/` find the repo root themselves.

Write the **literal** `database_name` into each `db:migrate:*` script — the production name for `db:migrate:prod`, the staging twin's for `db:migrate:staging`. Never use `$npm_package_config_db`: it expands to an empty string without a `config.db` key. These two are only a convenience alias; the scripts under `scripts/` read the name from the wrangler config.

**Those two scripts live here and nowhere else**, because a hardcoded database name cannot travel between repos; the [app scaffold's](payload-manifest.md#the-app-scaffold) `app/package.json` ships without them. Provisioning fills them from the databases it derives.

## `wrangler.jsonc` → the Worker entry, bindings, and `env.staging`

This fragment is the **only thing in the payload that creates a wrangler config**, so it describes a deployable Worker, not bindings alone. The top level declares the entry point, the static assets, and production's bindings. A `staging` environment declares its own Worker name and a **twin** of every stateful binding. Merge every part, filling the ids from the resources you created:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "<your-worker>",
  "main": "worker/index.ts",
  "compatibility_date": "<today, YYYY-MM-DD>",
  // disallow_importable_env: code reaches a binding only through the env a
  // route hands it, so a mini app can not import the memory store.
  "compatibility_flags": ["nodejs_compat", "disallow_importable_env"],
  // The Worker runs first for every path it serves. Once this list exists,
  // any path NOT in it gets the single-page fallback, even a POST (which gets
  // 405), so each Worker route must be here — add your own prefixes too.
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/_memory/*", "/apps/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<your-db-name>",
      "database_id": "<production database_id>",
      "migrations_dir": "../schema/migrations"
    },
    // Session memory, production only. No migrations_dir: the memory skill migrates it.
    {
      "binding": "MEMORY_DB",
      "database_name": "<your-repo>-memory",
      "database_id": "<memory database_id>"
    }
  ],
  // Only when the memory store has a bucket.
  "r2_buckets": [
    { "binding": "MEMORY_BUCKET", "bucket_name": "<your-repo>-memory" }
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

- **`migrations_dir` is written per layout, and the block above shows the `app/` one.** Wrangler resolves it relative to the **config file**, like `main`, but `schema/` sits at the **repo root**, so the layouts need *different* text: `../schema/migrations` in the `app/` layout the app scaffold ships, and `schema/migrations` when the Worker and its config sit at the repo root. Repeat it inside the environment.
  A config in `app/` saying `schema/migrations` points at `app/schema/migrations`, which never exists, and `cf-build.sh` stops with `No migrations present at …` on the first change that carries one: CI goes red on a path the user never chose.
- **The fragment must describe a deployable Worker, not just bindings.** `app/wrangler.jsonc` is [deliberately not copied](payload-manifest.md#the-app-scaffold), and a config without an entry point deploys nothing while provisioning reports success. Hence `main`, `assets`, `compatibility_date`, and `compatibility_flags` above. `main` is resolved relative to the config file, so `worker/index.ts` is right for both layouts. Set `compatibility_date` to the day you create the config.
- **`env.staging` needs its own `name`.** Without it the environment inherits production's, and a branch deploy lands on the production Worker. `cf-deploy.sh` refuses that deploy, but declare the name so the check never fires.
- **`env.staging` needs its own `d1_databases` entry**, with the staging database's own `database_name`. `cf-build.sh` and `reset-staging-d1.mjs` read the name from *inside* the environment block and stop with an error rather than touch production.
- **An environment inherits nothing it doesn't redeclare — among `vars` and bindings.** Repeat every stateful binding inside `env.staging`, pointing at its twin. A forgotten binding is absent in staging; a *service* binding copied without repointing quietly calls production. `npm run secrets:check` fails the build on the first and warns on the second.
- **Cron triggers are the exception: `triggers` is inheritable.** Leave it out of `env.staging` and the staging Worker fires production's schedule against the staging database, with no error. To keep staging manual-only, declare `"triggers": { "crons": [] }` as above. Omit the key only when staging *should* run production's schedule.
- **The memory bindings are the one exception to twinning.** `MEMORY_DB` and `MEMORY_BUCKET` sit at the top level only, because session memory lives on the production Worker alone: [the memory convention](../../../../wiki/development/memory.md#the-memory-key). Never add them to `env.staging`. `secrets:check` skips every `MEMORY_*` binding, and the pipeline scripts never read `MEMORY_DB` as the app's database. Wrangler's build warning that `MEMORY_DB` is not on `env.staging` is expected; leave it.

Twin every other stateful binding the same way ([the twin table](../../../../wiki/stack/d1-pipeline.md#twin-every-stateful-binding)). A queue needs both halves inside the environment, or staging messages land on the production consumer:

```jsonc
"queues": {
  "producers": [{ "binding": "CAPTURE_QUEUE", "queue": "<your-queue>-staging" }],
  "consumers": [{ "queue": "<your-queue>-staging" }]
}
```

**If the app builds through `@cloudflare/vite-plugin`, the environment is chosen at BUILD time**, and `--env` on `wrangler deploy` "will have no effect" ([Cloudflare's docs](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/)). `cf-build.sh` exports `CLOUDFLARE_ENV=staging` on non-production branches, and `cf-deploy.sh` drops `--env staging` when it sees the redirect. [How the environment gets selected](../../../../wiki/stack/d1-pipeline.md#how-the-environment-actually-gets-selected) explains why a mistake here deploys branch code to production **without any error at all**.

There is no `preview_database_id` and no swap script: the Worker a branch deploys to decides its database ([`d1-pipeline.md`](../../../../wiki/stack/d1-pipeline.md)).

## Workers Builds fallback only: the deploy command

Not a fragment, and **not part of the default install**: the pack's CI is [GitHub Actions](../../../../wiki/stack/d1-pipeline.md#ci-is-github-actions), which needs no dashboard step. Only a repo on the [Workers Builds fallback](../../../../wiki/stack/d1-pipeline.md#why-not-cloudflares-own-workers-builds) points the dashboard deploy command at `bash scripts/cf-deploy.sh`, and that page owns it. Mention it only for such a repo.

## `.env.example` → Cloudflare variables

Add these documented, blank lines. The pack's [credentials page](../../../../wiki/stack/cloudflare-credentials.md) explains each and **owns the token variable's name** — never rename it here. Real values go in the primary worktree's git-ignored `.env` per the [secrets convention](../../../../wiki/development/secrets.md); linked-worktree branches still get these blank declarations in their active `.env.example`. A value rotation changes no example line unless the variable contract or guidance changed:

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

Two files hold real credentials and are never committed: `.env` (the account-level Cloudflare token the credentials page calls *"effectively account-root, treat it like a root password"*) and `app/.dev.vars` (the Worker's runtime secrets, beside the wrangler config). Each has per-environment variants and a committed, values-blank `.example` twin. Add these four lines if they aren't there:

```gitignore
.env*
!.env.example
.dev.vars*
!.dev.vars.example
```

**Each pair needs both lines.** The wildcard keeps a `.env.staging` or `.dev.vars.staging` full of live values uncommittable; the negation keeps the `.example` file — the committed name list that `secrets:check` reads — from being swallowed by it. Either mistake is silent.

Apply this fragment **before** asking for the token, since that is when a repo first gets a `.env` full of credentials.

**Widening `.gitignore` does not untrack a file already committed.** Check with `git ls-files .env .dev.vars` before applying. If either is tracked, say so plainly and give the two steps: `git rm --cached .env` to stop tracking it, and **rotate the credential**, because it is in the history of every clone.

A repo that already has the bare `.dev.vars` line keeps working; widening it is the upgrade.
