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
#       - a Worker that binds no D1 database → skip the migrate, then build.
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

# `--app-dir` prints the directory holding package.json and exits. It exists so
# the pack's GitHub Actions workflow can `npm ci` in the right place without
# duplicating the resolution logic in YAML.
#
# It answers with a THIRD outcome as well as found/broken: exit 3 means "this
# repo has no wrangler config yet" — the state the pack ships in, before
# setup's Cloudflare provisioning writes one. That is not a build failure and a caller is
# meant to route it somewhere green; the workflow's locate step does exactly
# that. Exit 1 stays reserved for a genuine error, so a provisioned repo whose
# config is broken still fails loudly instead of yielding an empty path and a
# confusing `npm ci` two steps later.
#
# The resolver *returns* non-zero rather than exiting, so guarding the call is
# all it takes to ask the question without `set -e` killing the script — no
# duplicate search logic, and the two paths can never disagree about which file
# they'd pick.
if [ "${1:-}" = "--app-dir" ]; then
  if ! wong_resolve_wrangler_config "$ROOT"; then
    echo "cf-build: this repo is not configured for Cloudflare yet — run /wong-sync to plan provisioning." >&2
    exit 3
  fi
  echo "$BUILD_DIR"
  exit 0
fi

wong_resolve_wrangler_config "$ROOT"

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

if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  WHICH="production"
  CONFIG_ENV=""
  WRANGLER_ENV=()
else
  WHICH="staging"
  CONFIG_ENV="staging"
  WRANGLER_ENV=(--env staging)
fi

# Which database to migrate. No name is baked into this script, so every repo's
# copy is identical: `wong_config` reads the top-level `d1_databases` for
# production and the `staging` environment's own entry for staging. Each read is
# an assignment, so a config the parser refuses stops the build under `set -e`.
# `$CONFIG_ENV` is unquoted on purpose: empty means no argument (production).
HAS_D1=$(wong_config has-d1 $CONFIG_ENV)
PROD_HAS_D1=$(wong_config has-d1)

# Only staging can differ from production here. An environment inherits no
# binding, so staging code would run against no database.
if [ "$HAS_D1" = false ] && [ "$PROD_HAS_D1" = true ]; then
  echo "cf-build: ERROR — could not read the staging database_name from $WRANGLER_CONFIG" >&2
  echo "cf-build: the \`staging\` environment needs its own d1_databases entry." >&2
  exit 1
fi

# A Worker that binds no D1 database has nothing to migrate.
if [ "$HAS_D1" = true ]; then
  DB_NAME=$(wong_config database-name $CONFIG_ENV)
  echo "cf-build: $WHICH branch — applying migrations to the $WHICH D1 ($DB_NAME)"
  # wrangler resolves config-relative paths (migrations_dir, assets) from the
  # config's own directory, so run it from there.
  (cd "$APP_DIR" && npx wrangler d1 migrations apply "$DB_NAME" --remote ${WRANGLER_ENV[@]+"${WRANGLER_ENV[@]}"})
else
  echo "cf-build: $WHICH binds no D1 database — skipping migrations"
fi

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
