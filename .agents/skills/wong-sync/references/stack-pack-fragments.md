# Stack-pack config fragments

The [Cloudflare stack pack's](payload-manifest.md#the-stack-pack) **drop-in files** (the `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) ride [the manifest](payload-manifest.md): copied if absent, adapted if present, never overwritten. Its four **config fragments**, below, merge into files the target owns, so they are **not** manifest pull-files. Treat each like the `CLAUDE.md` `WONG-STACK` block: read the target's file, **show what you'd add, merge on the user's yes**, and keep everything already there; never blind-write. No file yet → create it from the fragment.

**[Setup's provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) applies them**: the id-free `package.json`, `.env.example`, and `.gitignore` fragments before it creates resources, and the `wrangler.jsonc` block at its config step, with the real ids. When upstream changes a fragment, `/wong-sync` re-offers it in its plan as a guided edit, never auto-merged.

## `package.json` → `scripts`

`build` becomes the CI wrapper; the real build moves to `build:app`, which `cf-build.sh` calls. Merge these keys into `scripts`, keeping every other script:

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

**Paths are relative to the `package.json` you merge into.** In the [app scaffold's](payload-manifest.md#the-app-scaffold) `app/package.json` they become `bash ../scripts/cf-build.sh`, `node ../scripts/reset-staging-d1.mjs`, and `node ../scripts/cf-secrets.mjs`. The `db:migrate:*` scripts call `wrangler` directly, so they stay as they are; run them from the wrangler config's folder. The `scripts/` files find the repo root themselves.

Write the **literal** `database_name` into each `db:migrate:*` script: production's for `db:migrate:prod`, the staging twin's for `db:migrate:staging`. Never use `$npm_package_config_db`: without a `config.db` key it expands to nothing. **These two live only here**, so the [scaffold's](payload-manifest.md#the-app-scaffold) `app/package.json` ships without them, and provisioning fills them from the databases it derives ([why](../../../../wiki/stack/d1-pipeline.md#the-scripts)).

## `wrangler.jsonc` → the Worker entry, bindings, and `env.staging`

The **only thing in the payload that creates a wrangler config**, so a deployable Worker: the top level declares the entry point, static assets, and production's bindings; `staging` its own Worker name and a **twin** of every stateful binding. Merge every part, filling ids from the resources you created:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "<your-worker>",
  "main": "worker/index.ts",
  "compatibility_date": "<today, YYYY-MM-DD>",
  // disallow_importable_env: code reaches a binding only through the env a
  // route hands it, and a mini app's env leaves out the memory store, so it
  // can not import it.
  "compatibility_flags": ["nodejs_compat", "disallow_importable_env"],
  // Signed Access identity is checked before every page, asset, API, and mini app.
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": true
  },
  "vars": {
    "WONG_ENVIRONMENT": "production",
    "CF_ACCESS_TEAM_DOMAIN": "<access team domain>",
    "CF_ACCESS_AUD": "<access audience>",
    "CF_ACCESS_APP_ID": "<access app id>",
    "CF_ACCESS_WORKER_ID": "<production Worker id>"
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
      "vars": {
        "WONG_ENVIRONMENT": "staging",
        "CF_ACCESS_TEAM_DOMAIN": "<access team domain>",
        "CF_ACCESS_AUD": "<access audience>",
        "CF_ACCESS_APP_ID": "<access app id>",
        "CF_ACCESS_WORKER_ID": "<staging Worker id>"
      },
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
    },
    "local": {
      "name": "<your-worker>-local",
      "vars": { "WONG_ENVIRONMENT": "local", "SKIP_AUTH": "true" },
      "d1_databases": [{ "binding": "DB", "database_name": "<your-db-name>-local", "database_id": "<production database_id>", "remote": false, "migrations_dir": "../schema/migrations" }]
    }
  }
}
```

Six rules the scripts depend on:

- **Write `migrations_dir` per layout; the block shows `app/`'s.** Wrangler resolves it from the **config file**, but `schema/` sits at the **repo root**: `../schema/migrations` in `app/`, `schema/migrations` with the config at the root. Repeat it inside the environment. A wrong path stops `cf-build.sh` with `No migrations present at …` on the first migration, and CI goes red.
- **Describe a deployable Worker, not just bindings.** `app/wrangler.jsonc` is [not copied](payload-manifest.md#the-app-scaffold), and a config with no entry point deploys nothing while provisioning reports success; hence `main`, `assets`, `compatibility_date`, and `compatibility_flags`. `main` also resolves from the config file, so `worker/index.ts` fits both layouts. Set `compatibility_date` to the day you create the config.
- **Give `env.staging` its own `name`,** or it inherits production's and a branch deploy lands on the production Worker. `cf-deploy.sh` refuses that deploy; declare the name so the check never fires.
- **Redeclare every stateful binding in `env.staging`, pointing at its twin** ([the twin table](../../../../wiki/stack/d1-pipeline.md#twin-every-stateful-binding)): an environment inherits no `vars` or bindings. Its `d1_databases` entry needs the staging database's own `database_name`; `cf-build.sh` and `reset-staging-d1.mjs` read it from *inside* the block and stop rather than touch production. A forgotten binding is absent in staging, and `npm run secrets:check` fails the build; a *service* binding copied without repointing quietly calls production, and it warns.
- **Cron `triggers` do inherit** ([why](../../../../wiki/stack/d1-pipeline.md#cron-triggers-inherit-omitting-them-does-not-disable-them)): omitted, production's schedule fires silently on staging. Keep the empty `crons` list unless staging *should* run production's schedule.
- **Never twin the memory bindings.** `MEMORY_DB` and `MEMORY_BUCKET` sit at the top level only: session memory lives on the production Worker alone ([the memory convention](../../../../wiki/development/memory.md#the-memory-key)). `secrets:check` skips `MEMORY_*` bindings, and the pipeline scripts never read `MEMORY_DB` as the app's database. Leave Wrangler's warning that `MEMORY_DB` is not on `env.staging`; it is expected.

A queue twin needs both halves inside the environment, or staging messages land on the production consumer:

```jsonc
"queues": {
  "producers": [{ "binding": "CAPTURE_QUEUE", "queue": "<your-queue>-staging" }],
  "consumers": [{ "queue": "<your-queue>-staging" }]
}
```

**With `@cloudflare/vite-plugin`, the build picks the environment**, not `wrangler deploy --env`: `cf-build.sh` exports `CLOUDFLARE_ENV=staging` off production branches, and `cf-deploy.sh` drops `--env staging`. A mistake here deploys branch code to production **with no error** ([how the environment gets selected](../../../../wiki/stack/d1-pipeline.md#how-the-environment-actually-gets-selected)). No `preview_database_id` or swap script: the Worker a branch deploys to picks its database.

## Workers Builds fallback only: the deploy command

Not a fragment, and **not in the default install**, whose CI is [GitHub Actions](../../../../wiki/stack/d1-pipeline.md#ci-is-github-actions). Mention it only to a repo on the [Workers Builds fallback](../../../../wiki/stack/d1-pipeline.md#why-not-cloudflares-own-workers-builds): its dashboard deploy command runs `bash scripts/cf-deploy.sh`, and that page owns it.

## `.env.example` → Cloudflare variables

Add these blank, commented lines. The [credentials page](../../../../wiki/stack/cloudflare-credentials.md) explains each and **owns the token variable's name**; never rename it. Real values go in the primary worktree's git-ignored `.env` ([the secrets convention](../../../../wiki/development/secrets.md)); a linked worktree's `.env.example` still gets the blank lines. A rotated value changes no line unless the variable contract or guidance did:

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens
# (NOT an account token — the /user/* endpoints this setup depends on reject those).
# Two permission groups is all it needs: setup widens the token's own scope from there, no asking.
CLOUDFLARE_API_TOKEN=
# Your Cloudflare account ID (dashboard → any domain → Overview, or the URL).
CLOUDFLARE_ACCOUNT_ID=
# Separate verification credential, provisioned into ignored .env; never a human login token.
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

## `.gitignore` → the two secrets files, and scratch

Never commit the two credential files: `.env`, whose Cloudflare token is *"effectively account-root"*, and `app/.dev.vars`, the Worker's runtime secrets ([the secrets convention](../../../../wiki/development/secrets.md)). Each has per-environment variants and a committed, values-blank `.example` twin. Add these four lines if missing:

```gitignore
.env*
!.env.example
.dev.vars*
!.dev.vars.example
```

**Each pair needs both lines**: the wildcard keeps a `.env.staging` or `.dev.vars.staging` of live values uncommittable, and the negation keeps the `.example` name list `secrets:check` reads out of the wildcard. Either mistake is silent.

Apply it **before** asking for the token, when the repo first gets a `.env` of credentials. Widening `.gitignore` doesn't untrack a file, so check `git ls-files .env .dev.vars` first. If either is tracked, say so plainly and give the two steps: `git rm --cached .env`, and **rotate the credential**, since every clone's history has it. A repo with the bare `.dev.vars` line keeps working; widening it is the upgrade.

Add one more line, so agents' throwaway files in `.scratch/` never show as unsaved work, block closing a workspace, or get committed:

```gitignore
.scratch/
```
