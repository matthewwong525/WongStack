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

# Anchor every path on this script's own location, not the caller's CWD — the
# Workers Builds root directory may be the repo root or the app subdirectory.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(dirname "$SCRIPT_DIR")

# Find the wrangler config: repo root first, then each immediate subdirectory.
# Keeps this script identical across repos whether the Worker sits at the root
# or in an `app/` subdirectory.
WRANGLER_CONFIG=""
for name in wrangler.jsonc wrangler.json wrangler.toml; do
  if [ -f "$ROOT/$name" ]; then WRANGLER_CONFIG="$ROOT/$name"; break; fi
done
if [ -z "$WRANGLER_CONFIG" ]; then
  for dir in "$ROOT"/*/; do
    base=$(basename "$dir")
    # Skip node_modules and dotted directories — match on the basename only,
    # since the repo's own absolute path may contain a dotted component.
    case "$base" in node_modules|.*) continue ;; esac
    for name in wrangler.jsonc wrangler.json wrangler.toml; do
      if [ -f "$dir$name" ]; then WRANGLER_CONFIG="$dir$name"; break 2; fi
    done
  done
fi
if [ -z "$WRANGLER_CONFIG" ]; then
  echo "cf-build: ERROR — no wrangler config found under $ROOT" >&2
  exit 1
fi
APP_DIR=$(dirname "$WRANGLER_CONFIG")

# Run the build where package.json actually lives.
BUILD_DIR="$ROOT"
[ -f "$APP_DIR/package.json" ] && BUILD_DIR="$APP_DIR"

# Local (non-CI) runs: skip migrate + swap, just build.
if [ -z "${WORKERS_CI_BRANCH:-}" ]; then
  echo "cf-build: not in CI — running plain build only"
  cd "$BUILD_DIR" && exec npm run build:app
fi

BRANCH="$WORKERS_CI_BRANCH"
PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-main}"
echo "cf-build: branch=$BRANCH (production branch: $PRODUCTION_BRANCH)"

# Read the D1 database name from the wrangler config — no name is baked into
# this script, so every repo's copy is identical.
# `|| true` so a no-match grep doesn't trip `set -e`/`pipefail` and kill the
# script before the explanatory error below can print.
DB_NAME=$(grep -oE '"?database_name"?[[:space:]]*[:=][[:space:]]*"[^"]+"' "$WRANGLER_CONFIG" \
  | head -1 | sed -E 's/.*[:=][[:space:]]*"([^"]+)".*/\1/' || true)
if [ -z "$DB_NAME" ]; then
  echo "cf-build: ERROR — could not read database_name from $WRANGLER_CONFIG" >&2
  exit 1
fi

# wrangler resolves config-relative paths (migrations_dir, assets) from the
# config's own directory, so run it from there.
if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  echo "cf-build: production branch — applying migrations to prod D1 ($DB_NAME)"
  (cd "$APP_DIR" && npx wrangler d1 migrations apply "$DB_NAME" --remote)
else
  echo "cf-build: preview branch — applying migrations to staging D1 (preview_database_id)"
  (cd "$APP_DIR" && npx wrangler d1 migrations apply "$DB_NAME" --remote --preview)
  echo "cf-build: swapping $WRANGLER_CONFIG database_id to staging"
  node "$SCRIPT_DIR/swap-d1-id.js" staging
fi

echo "cf-build: building"
cd "$BUILD_DIR" && npm run build:app
