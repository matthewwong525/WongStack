# Stack-pack config fragments

The [Cloudflare stack pack](payload-manifest.md#the-opt-in-stack-pack) delivers two kinds of file. Its **drop-in files** (the three `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) are whole files the target owns — they ride the manifest and follow the normal rule: copied if absent, adapted if present, never overwritten. The four **config fragments** below are different: they must *merge* into files the target already owns, so they are **not** manifest pull-files. They are applied the way the `CLAUDE.md` `WONG-STACK` block is: **show the fragment, apply it with the user's confirmation, never blind-write over the target's file.**

Apply these only for a repo that took the pack (`components.stackPack: true`): `/wong-setup` applies them on the first install (reading them here from the source clone), and `/wong-sync` surfaces a changed fragment through its adapt step on the rare occasion upstream changes one. A fragment can't be cleanly re-merged into a file the user has since edited, so it is *re-offered* as a guided edit, never auto-merged.

For each fragment: read the target's current file, show what you'd add, and merge on a yes — preserving everything already there. If the target file doesn't exist yet, create it from the fragment.

## `package.json` → `scripts`

The `build` script becomes the CI wrapper; the repo's real build moves to `build:app` (what `cf-build.sh` delegates to). Merge these keys into the existing `scripts` object, keeping every other script:

```jsonc
{
  "scripts": {
    "build": "bash scripts/cf-build.sh",
    "build:app": "<the repo's existing build command — e.g. tsc -b && vite build>",
    "db:migrate:staging": "wrangler d1 migrations apply <your-db-name> --remote --preview",
    "db:migrate:prod": "wrangler d1 migrations apply <your-db-name> --remote",
    "db:reset:staging": "node scripts/reset-staging-d1.mjs"
  }
}
```

If the repo already has a `build`, rename it to `build:app` (confirm first) so `cf-build.sh` can call it.

**Paths here are relative to the `package.json` you're merging into.** When the Worker lives in a subdirectory (the `app/` layout the SPA pack ships), that's `app/package.json`, so the two script paths become `bash ../scripts/cf-build.sh` and `node ../scripts/reset-staging-d1.mjs`. The scripts themselves resolve the repo root from their own location, so they work from either layout.

Write the **literal** `database_name` into the `db:migrate:*` scripts. (An earlier version of this page used `$npm_package_config_db`, which expands to an empty string unless the `package.json` also defines a `config.db` key — leaving wrangler with no database argument.) These two are only a convenience alias: the scripts under `scripts/` read the name out of the wrangler config themselves.

## `wrangler.jsonc` → `d1_databases`

One binding entry carries both databases — production in `database_id`, staging in `preview_database_id` — plus the migrations directory. Merge (or add) the `d1_databases` array; fill the ids from the D1 databases you created:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<your-db-name>",
      "database_id": "<production database_id>",
      "preview_database_id": "<staging database_id>",
      "migrations_dir": "schema/migrations"
    }
  ]
}
```

**`migrations_dir` is resolved relative to the wrangler config file, not the repo root.** The value above is right when the config sits at the repo root. In the `app/` layout it must be `"../schema/migrations"`, since `schema/` stays at the repo root — get this wrong and wrangler reports no migrations to apply rather than erroring.

`cf-build.sh` reads `database_name` from here; `swap-d1-id.js` reads and swaps the two ids. Keep the two `_id` values distinct — the swap refuses to run when they're identical.

One cosmetic gotcha: `wrangler deploy`'s binding summary prints the entry's `preview_database_id`, so after a preview swap the log names the *other* database. The deployed binding follows `database_id` and is correct; verify against the generated `dist/**/wrangler.json` rather than the log line.

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
