#!/usr/bin/env bash
# A preview of the main app from the agent host, with no CI wait.
#
#     bash scripts/cf-preview.sh [--alias <name>]
#
# /apply runs it for a mini app (`--alias mini-<name>`): the main app's Worker
# serves every mini app under /apps/, so a preview builds the whole app. See
# wiki/stack/mini-apps.md.
#
# On the agent host, with CLOUDFLARE_API_TOKEN set (the skill sources the
# primary worktree's .env first):
#   1. refuse the default branch — unless `--alias` names the alias, because
#      /apply uploads before /save creates a branch
#   2. install the app's dependencies when it has no node_modules
#   3. apply pending migrations to the STAGING database
#   4. build the app for staging, with the mini apps in it (cf-build.sh)
#   5. upload a version of the staging Worker under the preview alias; when the
#      staging Worker does not exist yet, deploy it once and upload again
#   6. print the preview URL that wrangler reports
# It runs no tests: CI tests the change after the push. It never deploys
# production.
#
# Fail closed: it stops before any wrangler call when the staging Worker or the
# staging database resolves to production's, and again after the build when
# the built config names the production Worker.
#
# Exit: 0 done; 1 error; 2 usage; 3 a preview can not run here (not
# provisioned, or no credential) — the message is the one-line reason, and CI
# makes the preview after the push.
#
# Byte-identical in every repo: every name comes from the app's wrangler config.

set -euo pipefail

# Anchor every path on this script's own location, not the caller's CWD.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(dirname "$SCRIPT_DIR")

# shellcheck source=lib-wrangler-config.sh
source "$SCRIPT_DIR/lib-wrangler-config.sh"

USAGE="usage: bash scripts/cf-preview.sh [--alias <name>]
  build the app for staging on this host, upload a preview version, print its URL"

usage() { echo "$USAGE" >&2; exit 2; }
say() { echo "cf-preview: $*"; }
fail() { echo "cf-preview: ERROR — $*" >&2; exit 1; }
not_here() { echo "cf-preview: $* — no preview uploaded" >&2; exit 3; }

# ── Arguments ─────────────────────────────────────────────────────────────────
HAVE_ALIAS=false
ALIAS_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) echo "$USAGE"; exit 0 ;;
    --alias) [ $# -ge 2 ] || usage; HAVE_ALIAS=true; ALIAS_ARG="$2"; shift 2 ;;
    --alias=*) HAVE_ALIAS=true; ALIAS_ARG="${1#--alias=}"; shift ;;
    *) usage ;;
  esac
done

if $HAVE_ALIAS; then
  ALIAS=$(wong_preview_alias "$ALIAS_ARG")
  [ -n "$ALIAS" ] || { echo "cf-preview: --alias '$ALIAS_ARG' has no usable preview alias" >&2; usage; }
else
  BRANCH=$(git -C "$ROOT" symbolic-ref --quiet --short HEAD 2>/dev/null) \
    || fail "not on a branch — check out a branch, or pass --alias <name>"
  ORIGIN_HEAD=$(git -C "$ROOT" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
  PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-${ORIGIN_HEAD#origin/}}"
  PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"
  if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
    fail "'$BRANCH' is the default branch — preview from a branch, or pass --alias <name>; nothing uploaded"
  fi
  ALIAS=$(wong_preview_alias "$BRANCH")
  [ -n "$ALIAS" ] || fail "branch '$BRANCH' has no usable preview alias"
fi

# ── The config, and the guards that run before any wrangler call ─────────────
wong_resolve_wrangler_config "$ROOT" 2>/dev/null || not_here "this repo is not set up for Cloudflare yet"

# Each read is an assignment, so a config the parser refuses stops here. The
# source config decides, so drop any redirect an earlier build left behind.
rm -f "$APP_DIR/.wrangler/deploy/config.json"
PROD_NAME=$(wong_config worker-name)
STAGING_NAME=$(wong_config worker-name staging)
case "$PROD_NAME $STAGING_NAME" in
  *'<'*|*'>'*) not_here "the wrangler config still holds <placeholders>; run /wong-sync to plan provisioning" ;;
esac

if [ "$STAGING_NAME" = "$PROD_NAME" ]; then
  echo "cf-preview: ERROR — the staging environment resolves to the production Worker '$PROD_NAME'." >&2
  echo "cf-preview: Uploading would overwrite production. Give env.staging its own \"name\"" >&2
  echo "cf-preview: (e.g. \"$PROD_NAME-staging\") in $WRANGLER_CONFIG." >&2
  exit 1
fi

HAS_D1=$(wong_config has-d1 staging)
PROD_HAS_D1=$(wong_config has-d1)
if [ "$HAS_D1" = false ] && [ "$PROD_HAS_D1" = true ]; then
  fail "env.staging in $WRANGLER_CONFIG needs its own d1_databases entry"
fi
if [ "$HAS_D1" = true ]; then
  STAGING_DB=$(wong_config database-name staging)
  if [ "$PROD_HAS_D1" = true ] && [ "$STAGING_DB" = "$(wong_config database-name)" ]; then
    fail "the staging environment binds the production database '$STAGING_DB' — a preview would write real data"
  fi
fi

[ -n "${CLOUDFLARE_API_TOKEN:-}" ] \
  || not_here "no CLOUDFLARE_API_TOKEN; source the primary worktree's .env, or push and let CI make the preview"

# ── Install, migrate, build ──────────────────────────────────────────────────
if [ ! -d "$BUILD_DIR/node_modules" ]; then
  say "installing the app's dependencies (once per checkout)"
  (cd "$BUILD_DIR" && npm ci --no-audit --no-fund)
fi

if [ "$HAS_D1" = true ]; then
  say "applying pending migrations to the staging database ($STAGING_DB)"
  (cd "$APP_DIR" && npx wrangler d1 migrations apply "$STAGING_DB" --remote --env staging)
fi

# CLOUDFLARE_ENV selects staging at build time for @cloudflare/vite-plugin, as
# in cf-build.sh; a plain wrangler build needs `--env staging` instead.
say "building the app for staging"
CLOUDFLARE_ENV=staging bash "$SCRIPT_DIR/cf-build.sh"

STAGING_ENV=(--env staging)
if [ -f "$APP_DIR/.wrangler/deploy/config.json" ]; then
  STAGING_ENV=()
fi
BUILT_NAME=$(wong_config worker-name staging)
[ "$BUILT_NAME" != "$PROD_NAME" ] \
  || fail "the build produced the production Worker's config ('$PROD_NAME'); nothing uploaded"

# ── Upload ────────────────────────────────────────────────────────────────────
UPLOAD_LOG=$(mktemp)
trap 'rm -f "$UPLOAD_LOG"' EXIT

# Call only in a condition (`if`, `||`), so a failed upload returns its status.
upload() {
  say "uploading a staging version (alias: $ALIAS)"
  (cd "$APP_DIR" && npx wrangler versions upload ${STAGING_ENV[@]+"${STAGING_ENV[@]}"} --preview-alias "$ALIAS") 2>&1 | tee "$UPLOAD_LOG"
  return "${PIPESTATUS[0]}"
}

# Upload first: the staging Worker exists on every preview but the first, so
# the common case is one wrangler call.
if ! upload; then
  grep -qiE 'does not (yet )?exist|code: 10007' "$UPLOAD_LOG" || fail "the preview upload failed"
  say "the staging Worker ($STAGING_NAME) does not exist yet — creating it"
  (cd "$APP_DIR" && npx wrangler deploy ${STAGING_ENV[@]+"${STAGING_ENV[@]}"})
  upload || fail "the preview upload failed"
fi

# ── The preview URL: harvested, never constructed (wong_preview_url) ─────────
PREVIEW_URL=$(wong_preview_url "$UPLOAD_LOG" "$ALIAS")

if [ -n "$PREVIEW_URL" ]; then
  say "preview URL $PREVIEW_URL"
else
  echo "cf-preview: WARNING — wrangler printed no preview URL" >&2
fi
