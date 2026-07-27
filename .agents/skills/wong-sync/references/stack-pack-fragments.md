# Stack-pack config fragments

The [Cloudflare stack pack](payload-manifest.md#the-opt-in-stack-pack) delivers two kinds of file. Its **drop-in files** (the three `scripts/`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) are whole files the target owns — they ride the manifest and pull/refresh through the normal three-way diff. The four **config fragments** below are different: they must *merge* into files the target already owns, so they are **not** manifest pull-files. They are applied the way the `CLAUDE.md` `WONG-STACK` block is: **show the fragment, apply it with the user's confirmation, never blind-write over the target's file.**

Apply these only for a repo that took the pack (`components.stackPack: true`): `/wong-setup` applies them on the first install (reading them here from the source clone), and `/wong-sync` re-offers a fragment as a guided edit on the rare occasion upstream changes one. A three-way diff can't cleanly re-merge a changed fragment into a file the user has since edited, so the fragment is *re-offered*, never auto-merged.

For each fragment: read the target's current file, show what you'd add, and merge on a yes — preserving everything already there. If the target file doesn't exist yet, create it from the fragment.

## `package.json` → `scripts`

The `build` script becomes the CI wrapper; the repo's real build moves to `build:app` (what `cf-build.sh` delegates to). Merge these keys into the existing `scripts` object, keeping every other script:

```jsonc
{
  "scripts": {
    "build": "bash scripts/cf-build.sh",
    "build:app": "<the repo's existing build command — e.g. tsc -b && vite build>",
    "db:migrate:staging": "wrangler d1 migrations apply $npm_package_config_db --remote --preview",
    "db:migrate:prod": "wrangler d1 migrations apply $npm_package_config_db --remote",
    "db:reset:staging": "node scripts/reset-staging-d1.mjs"
  }
}
```

If the repo already has a `build`, rename it to `build:app` (confirm first) so `cf-build.sh` can call it. The `db:migrate:*` scripts pass the database name explicitly; if the repo prefers, replace `$npm_package_config_db` with the literal `database_name` — the scripts under `scripts/` read the name from `wrangler.jsonc` themselves, so this is only a convenience alias.

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

`cf-build.sh` reads `database_name` from here; `swap-d1-id.js` reads and swaps the two ids. Keep the two `_id` values distinct — the swap refuses to run when they're identical.

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
