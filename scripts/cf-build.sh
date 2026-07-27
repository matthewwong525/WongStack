#!/usr/bin/env bash
# CI build wrapper: apply D1 migrations to the right database, then build.
#
# Wire it up as your `build` script (package.json). Cloudflare Workers Builds
# runs `npm run build` on every push, so this wrapper makes the dashboard's
# default command do the right thing with no dashboard config.
#
# Behavior:
#   - In CI (WORKERS_CI_BRANCH is set):
#       - branch = production branch (default `main`) → apply migrations to
#         the PROD D1, then build.
#       - any other branch → apply migrations to the STAGING D1
#         (preview_database_id), swap wrangler.jsonc so the deploy binds
#         staging, then build.
#   - Anywhere else (a developer's terminal, a quality gate) → skip
#     migrate/swap and just build. A remote database is never touched from a
#     developer machine.
#
# After this exits, Workers Builds runs `npx wrangler deploy`, which reads
# whatever wrangler.jsonc now says.
#
# Zero-config: no database name or id is baked in here. The name is read from
# wrangler.jsonc; the ids live there too (swap-d1-id.js reads them). Every repo
# ships this file byte-for-byte identical.
#
# See wiki/stack/d1-pipeline.md for the full lifecycle.

set -euo pipefail

# Local (non-CI) runs: skip migrate + swap, just build.
if [ -z "${WORKERS_CI_BRANCH:-}" ]; then
  echo "cf-build: not in CI — running plain build only"
  exec npm run build:app
fi

BRANCH="$WORKERS_CI_BRANCH"
PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-main}"
echo "cf-build: branch=$BRANCH (production branch: $PRODUCTION_BRANCH)"

# Read the D1 database name from wrangler.jsonc — no name is baked into this
# script, so every repo's copy is identical.
DB_NAME=$(grep -oE '"database_name"[[:space:]]*:[[:space:]]*"[^"]+"' wrangler.jsonc \
  | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)".*/\1/')
if [ -z "$DB_NAME" ]; then
  echo "cf-build: ERROR — could not read database_name from wrangler.jsonc" >&2
  exit 1
fi

if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  echo "cf-build: production branch — applying migrations to prod D1 ($DB_NAME)"
  npx wrangler d1 migrations apply "$DB_NAME" --remote
else
  echo "cf-build: preview branch — applying migrations to staging D1 (preview_database_id)"
  npx wrangler d1 migrations apply "$DB_NAME" --remote --preview
  echo "cf-build: swapping wrangler.jsonc database_id to staging"
  node scripts/swap-d1-id.js staging
fi

echo "cf-build: building"
npm run build:app
