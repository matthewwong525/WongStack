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
#         the PRODUCTION D1, then build.
#       - any other branch → apply migrations to the STAGING D1 (the one
#         declared by the `staging` environment in wrangler.jsonc), then build.
#   - Anywhere else (a developer's terminal, a quality gate) → skip migrate
#     and just build. A remote database is never touched from a developer
#     machine.
#
# Nothing here rewrites wrangler.jsonc. Which Worker a branch lands on is
# decided by `cf-deploy.sh`, wired to the Workers Builds *deploy* command;
# this script only decides which database the migrations run against.
#
# Zero-config: no database name or id is baked in here. Both names are read
# from wrangler.jsonc — the top-level one for production, the one inside the
# `staging` environment for staging. Every repo ships this file byte-for-byte
# identical.
#
# See wiki/stack/d1-pipeline.md for the full lifecycle.

set -euo pipefail

# Anchor every path on this script's own location, not the caller's CWD — the
# Workers Builds root directory may be the repo root or the app subdirectory.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(dirname "$SCRIPT_DIR")

# shellcheck source=lib-wrangler-config.sh
source "$SCRIPT_DIR/lib-wrangler-config.sh"

wong_resolve_wrangler_config "$ROOT"

# Local (non-CI) runs: skip the migrate, just build.
if [ -z "${WORKERS_CI_BRANCH:-}" ]; then
  echo "cf-build: not in CI — running plain build only"
  cd "$BUILD_DIR" && exec npm run build:app
fi

BRANCH="$WORKERS_CI_BRANCH"
PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-main}"
echo "cf-build: branch=$BRANCH (production branch: $PRODUCTION_BRANCH)"

# Read a `database_name` out of the wrangler config — no name is baked into
# this script, so every repo's copy is identical. With an environment argument,
# read the name declared *inside* that environment's block: staging binds a
# twin database, which has its own name. The `env.staging` block must therefore
# declare its own `d1_databases` entry (see the stack-pack config fragments).
#
# `|| true` so a no-match grep doesn't trip `set -e`/`pipefail` and kill the
# script before the explanatory error below can print.
read_database_name() {
  local env_name="${1:-}"
  local text
  if [ -n "$env_name" ]; then
    # Everything from the environment's key onwards.
    text=$(sed -n "/\"$env_name\"[[:space:]]*:/,\$p" "$WRANGLER_CONFIG" || true)
  else
    text=$(cat "$WRANGLER_CONFIG")
  fi
  printf '%s' "$text" \
    | grep -oE '"?database_name"?[[:space:]]*[:=][[:space:]]*"[^"]+"' \
    | head -1 | sed -E 's/.*[:=][[:space:]]*"([^"]+)".*/\1/' || true
}

if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  WHICH="production"
  DB_NAME=$(read_database_name)
  WRANGLER_ENV=()
else
  WHICH="staging"
  DB_NAME=$(read_database_name staging)
  WRANGLER_ENV=(--env staging)
fi

if [ -z "$DB_NAME" ]; then
  echo "cf-build: ERROR — could not read the $WHICH database_name from $WRANGLER_CONFIG" >&2
  if [ "$WHICH" = "staging" ]; then
    echo "cf-build: the \`staging\` environment needs its own d1_databases entry." >&2
  fi
  exit 1
fi

echo "cf-build: $WHICH branch — applying migrations to the $WHICH D1 ($DB_NAME)"
# wrangler resolves config-relative paths (migrations_dir, assets) from the
# config's own directory, so run it from there.
(cd "$APP_DIR" && npx wrangler d1 migrations apply "$DB_NAME" --remote ${WRANGLER_ENV[@]+"${WRANGLER_ENV[@]}"})

echo "cf-build: building"
cd "$BUILD_DIR" && npm run build:app
