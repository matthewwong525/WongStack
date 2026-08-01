# Stack-pack config fragments

The [Cloudflare stack pack](payload-manifest.md#the-opt-in-stack-pack) delivers two kinds of file. Its **drop-in files** (the `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) are whole files the target owns — they ride the manifest and follow the normal rule: copied if absent, adapted if present, never overwritten. The four **config fragments** below are different: they must *merge* into files the target already owns, so they are **not** manifest pull-files. They are applied the way the `CLAUDE.md` `WONG-STACK` block is: **show the fragment, apply it with the user's confirmation, never blind-write over the target's file.**

Apply these only for a repo that took the pack (`components.stackPack: true`): `/wong-setup` applies them on the first install (reading them here from the source clone), and `/wong-sync` surfaces a changed fragment through its adapt step on the rare occasion upstream changes one. A fragment can't be cleanly re-merged into a file the user has since edited, so it is *re-offered* as a guided edit, never auto-merged.

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
    "db:reset:staging": "node scripts/reset-staging-d1.mjs"
  }
}
```

If the repo already has a `build`, rename it to `build:app` (confirm first) so `cf-build.sh` can call it.

**Paths here are relative to the `package.json` you're merging into.** When the Worker lives in a subdirectory (the `app/` layout the SPA pack ships), that's `app/package.json`, so the two script paths become `bash ../scripts/cf-build.sh` and `node ../scripts/reset-staging-d1.mjs`. The scripts themselves resolve the repo root from their own location, so they work from either layout.

Write the **literal** `database_name` into each `db:migrate:*` script — the production name for `db:migrate:prod`, the staging twin's name for `db:migrate:staging`. (An earlier version of this page used `$npm_package_config_db`, which expands to an empty string unless the `package.json` also defines a `config.db` key — leaving wrangler with no database argument.) These two are only a convenience alias: the scripts under `scripts/` read the name out of the wrangler config themselves.

## `wrangler.jsonc` → bindings + `env.staging`

The top level declares production's bindings. A `staging` environment declares its own Worker name and a **twin** of every stateful binding — a second database, a second queue, a second bucket. Merge both parts, filling the ids from the resources you created:

```jsonc
{
  "name": "<your-worker>",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<your-db-name>",
      "database_id": "<production database_id>",
      "migrations_dir": "schema/migrations"
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
          "migrations_dir": "schema/migrations"
        }
      ]
    }
  }
}
```

Four rules the scripts depend on:

- **`env.staging` needs its own `name`.** Without it the environment inherits production's, and a branch deploy lands on the production Worker. `cf-deploy.sh` refuses to deploy when the staging environment resolves to production's name, so this fails loudly rather than silently — but declare the name and the check never has to fire.
- **`env.staging` needs its own `d1_databases` entry**, with the staging database's own `database_name`. `cf-build.sh` and `reset-staging-d1.mjs` read the name from *inside* the environment block; without it they stop with an explicit error rather than touching production.
- **An environment inherits nothing it doesn't redeclare.** Every stateful binding must be repeated inside `env.staging` pointing at its twin. A binding you forget is simply absent in staging; a *service* binding you copy without repointing quietly calls production.
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

## Workers Builds → the deploy command

Not a fragment — there is no file to merge it into. It is a **dashboard setting a human changes once**, and the pack does not work without it.

In the Cloudflare dashboard, under the Worker's **Settings → Build → Deploy command**, replace the default `npx wrangler deploy` with:

```bash
bash scripts/cf-deploy.sh
```

(`bash ../scripts/cf-deploy.sh` in the `app/` layout, matching the build command's path.)

Workers Builds offers one deploy command for every branch, which is exactly why the branch logic lives in a script: the production branch deploys the production Worker, and any other branch deploys the staging Worker *and* uploads a per-commit preview version. Leave the default in place and branch pushes keep uploading versions of the production Worker — the behaviour the staging environment exists to replace. Say this step out loud when installing or adopting the pack; it is the one thing no file in the repo can do for the user.

## `.env.example` → Cloudflare variables

Add these documented, blank lines (the pack's [credentials page](../../../../wiki/stack/cloudflare-credentials.md) explains each). Real values go in the git-ignored `.env`:

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens
# (NOT an account token — the Workers Builds log API rejects those).
CLOUDFLARE_USER_TOKEN=
# Your Cloudflare account ID (dashboard → any domain → Overview, or the URL).
CLOUDFLARE_ACCOUNT_ID=
# Cloudflare Access service token — lets CI reach Access-gated preview URLs.
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

## `.gitignore` → `.dev.vars`

Cloudflare's local secrets file is never committed. Add the line if it isn't already there:

```gitignore
.dev.vars
```
