#!/usr/bin/env bash
# CI build wrapper: apply D1 migrations to the right database, then build.
#
# Wire it up as your `build` script (package.json). Cloudflare Workers Builds
# runs `npm run build` on every push, so this wrapper makes the dashboard's
# default command do the right thing with no dashboard config.
#
# Behavior:
#   - In CI (CF_BRANCH or WORKERS_CI_BRANCH is set):
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

# `--app-dir` prints the directory holding package.json and exits. It exists so
# the pack's GitHub Actions workflow can `npm ci` in the right place without
# duplicating the resolution logic in YAML.
if [ "${1:-}" = "--app-dir" ]; then
  echo "$BUILD_DIR"
  exit 0
fi

# The branch in CI. `CF_BRANCH` is the CI-neutral name the pack's GitHub Actions
# workflow sets; `WORKERS_CI_BRANCH` is what Cloudflare Workers Builds sets on
# its own. Either backend works, and a repo can run both while it migrates.
CI_BRANCH="${CF_BRANCH:-${WORKERS_CI_BRANCH:-}}"

# Local (non-CI) runs: skip the migrate, just build.
if [ -z "$CI_BRANCH" ]; then
  echo "cf-build: not in CI — running plain build only"
  cd "$BUILD_DIR" && exec npm run build:app
fi

BRANCH="$CI_BRANCH"
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

# Regenerate the binding types before building. `wrangler.jsonc` is the source
# of truth for bindings and `worker-configuration.d.ts` is generated from it, so
# a binding added during provisioning — or in any later change — fails `tsc`
# with "Property 'DB' does not exist on type 'Env'" until someone remembers to
# run this by hand. CI regenerates, so nobody has to remember. Non-fatal: a repo
# that doesn't use TypeScript has nothing to generate.
if [ -f "$APP_DIR/package.json" ] && grep -q '"typescript"' "$APP_DIR/package.json"; then
  echo "cf-build: regenerating binding types"
  (cd "$APP_DIR" && npx wrangler types) || echo "cf-build: WARNING — wrangler types failed; continuing" >&2
fi

echo "cf-build: building"

# `CLOUDFLARE_ENV` is how a wrangler environment is selected when the build goes
# through @cloudflare/vite-plugin: the plugin flattens the chosen environment
# into a generated `dist/**/wrangler.json` and drops a
# `.wrangler/deploy/config.json` pointing wrangler at it. That selection happens
# HERE, at build time — Cloudflare's docs are explicit that `--env` on
# `wrangler deploy` "will have no effect" once the redirect exists.
#
# Get this wrong and the failure is silent and severe: the build emits a
# production config, `wrangler deploy --env staging` finds no environment to
# apply, does not complain, and deploys branch code to the PRODUCTION Worker
# bound to the PRODUCTION database. Exporting it here is what makes the staging
# environment real for a plugin-built app. A plain (non-plugin) build ignores
# the variable, and `cf-deploy.sh` passes `--env staging` for that case instead.
if [ "$WHICH" = "staging" ]; then
  export CLOUDFLARE_ENV=staging
  echo "cf-build: CLOUDFLARE_ENV=staging (selects the staging environment at build time)"
fi

cd "$BUILD_DIR" && npm run build:app
