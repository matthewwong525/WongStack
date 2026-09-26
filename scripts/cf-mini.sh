#!/usr/bin/env bash
# The mini-app Worker's one script: a preview from the agent host, a deploy in CI.
#
#     bash scripts/cf-mini.sh preview [--alias <name>]
#     bash scripts/cf-mini.sh ci
#
# The mini-app Worker (`mini-apps/`) serves every small app the agent builds,
# apart from the main app. This script never builds, migrates for, or deploys
# the main app, and never reads `app/`. See wiki/stack/mini-apps.md.
#
# preview — on the agent host, with CLOUDFLARE_API_TOKEN set (the skill sources
#   the primary worktree's .env first). In seconds, with no CI wait:
#     1. refuse the default branch — unless `--alias` names the alias, because
#        /apply uploads before /save creates the `mini/<name>` branch
#     2. write the dashboard and route table (scripts/mini-dashboard.mjs)
#     3. apply pending migrations to the STAGING database
#     4. upload a version to the staging twin under the preview alias; when the
#        staging twin does not exist yet, deploy it once and upload again
#     5. print the preview URL that wrangler reports
#   It runs no tests: CI tests the app after the push.
#
# ci — from the pack's deploy workflow (CF_BRANCH set), when mini-apps/ changed:
#     default branch → `wrangler deploy`, the production mini Worker
#     any other      → `wrangler deploy --env staging`, then
#                      `wrangler versions upload --env staging --preview-alias <branch>`
#                      and `preview-url=<url>` into $GITHUB_OUTPUT
#   MINI_CHANGED=false (from .github/scripts/app-untouched.sh) deploys nothing.
#   No mini-apps/wrangler.jsonc, or one that still holds `<placeholders>`,
#   deploys nothing and stays green: the repo has no mini-app Worker yet.
#
# Expiry: every non-production upload or deploy passes PREVIEW_EXPIRES (epoch
# ms, seven days on), and worker.ts answers 410 after it. Production gets none.
#
# Fail closed: both modes stop before any wrangler call when the staging Worker
# or the staging database resolves to production's.
#
# Exit: 0 done or nothing to do; 1 error; 2 usage; 3 preview can not run here
# (no mini-app config, not provisioned, or no credential) — the message is the
# one-line reason, and CI makes the preview after the push.
#
# Byte-identical in every repo: every name comes from mini-apps/wrangler.jsonc.

set -euo pipefail

# Anchor every path on this script's own location, not the caller's CWD.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(dirname "$SCRIPT_DIR")
MINI_DIR="$ROOT/mini-apps"

# shellcheck source=lib-wrangler-config.sh
source "$SCRIPT_DIR/lib-wrangler-config.sh"

USAGE="usage: bash scripts/cf-mini.sh <preview [--alias <name>] | ci>
  preview  on the agent host: upload a preview of mini-apps/ and print its URL
  ci       in CI (CF_BRANCH set): staging and a preview alias on a branch,
           production on the default branch"

usage() { echo "$USAGE" >&2; exit 2; }
say() { echo "cf-mini: $*"; }
fail() { echo "cf-mini: ERROR — $*" >&2; exit 1; }

# Nothing to do here: preview says why and exits 3; ci stays green.
not_here() {
  if [ "$MODE" = preview ]; then
    echo "cf-mini: $* — no preview uploaded" >&2
    exit 3
  fi
  say "$* — nothing deployed"
  exit 0
}

# The preview alias rule, the same as cf-deploy.sh's — keep the two in step.
# An alias must be lowercase alphanumeric-and-hyphen and at most 63 characters.
alias_for() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-63 \
    | sed -E 's/-+$//'
}

# Every wrangler call runs from mini-apps/, so it reads mini-apps/wrangler.jsonc.
# Prefer the main app's own wrangler, so both Workers deploy with the version
# its lockfile pins. Without one — a mini-only CI run skips the app's install —
# npx fetches wrangler 4, and npm_config_yes keeps it from waiting on a prompt.
WRANGLER_BIN=""
for candidate in "$ROOT"/*/node_modules/.bin/wrangler; do
  if [ -x "$candidate" ]; then WRANGLER_BIN="$candidate"; break; fi
done
mini_wrangler() {
  if [ -n "$WRANGLER_BIN" ]; then (cd "$MINI_DIR" && "$WRANGLER_BIN" "$@")
  else (cd "$MINI_DIR" && npm_config_yes=true npx wrangler@4 "$@"); fi
}

# ── Arguments ─────────────────────────────────────────────────────────────────
MODE="${1:-}"
[ $# -gt 0 ] && shift
HAVE_ALIAS=false
ALIAS_ARG=""
case "$MODE" in
  -h|--help) echo "$USAGE"; exit 0 ;;
  preview)
    while [ $# -gt 0 ]; do
      case "$1" in
        --alias) [ $# -ge 2 ] || usage; HAVE_ALIAS=true; ALIAS_ARG="$2"; shift 2 ;;
        --alias=*) HAVE_ALIAS=true; ALIAS_ARG="${1#--alias=}"; shift ;;
        *) usage ;;
      esac
    done
    ;;
  ci) [ $# -eq 0 ] || usage ;;
  *) usage ;;
esac

# The branch in CI, under the same names cf-deploy.sh reads.
CI_BRANCH="${CF_BRANCH:-${WORKERS_CI_BRANCH:-}}"

# ── Where the upload goes ─────────────────────────────────────────────────────
if [ "$MODE" = ci ]; then
  if [ -z "$CI_BRANCH" ]; then
    echo "cf-mini: ci runs only in CI (CF_BRANCH is empty) — nothing deployed" >&2
    usage
  fi
  if [ "${MINI_CHANGED:-true}" = false ]; then
    say "mini-apps/ did not change — nothing deployed"
    exit 0
  fi
  PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-main}"
  BRANCH="$CI_BRANCH"
  say "branch=$BRANCH (production branch: $PRODUCTION_BRANCH)"
elif $HAVE_ALIAS; then
  BRANCH=""
  PRODUCTION_BRANCH=""
else
  BRANCH=$(git -C "$ROOT" symbolic-ref --quiet --short HEAD 2>/dev/null) \
    || fail "not on a branch — check out a branch, or pass --alias <name>"
  ORIGIN_HEAD=$(git -C "$ROOT" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
  PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-${ORIGIN_HEAD#origin/}}"
  PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"
  if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
    fail "'$BRANCH' is the default branch — preview from a mini/<name> branch, or pass --alias <name>; nothing uploaded"
  fi
fi

if $HAVE_ALIAS; then
  ALIAS=$(alias_for "$ALIAS_ARG")
  [ -n "$ALIAS" ] || { echo "cf-mini: --alias '$ALIAS_ARG' has no usable preview alias" >&2; usage; }
elif [ "$BRANCH" != "$PRODUCTION_BRANCH" ]; then
  ALIAS=$(alias_for "$BRANCH")
  [ -n "$ALIAS" ] || fail "branch '$BRANCH' has no usable preview alias"
fi

# ── The config, and the guards that run before any wrangler call ─────────────
WRANGLER_CONFIG="$MINI_DIR/wrangler.jsonc"
[ -f "$WRANGLER_CONFIG" ] || not_here "this repo has no mini-apps/wrangler.jsonc"

# Each read is an assignment, so a config the parser refuses stops here.
PROD_NAME=$(wong_config worker-name)
STAGING_NAME=$(wong_config worker-name staging)
case "$PROD_NAME $STAGING_NAME" in
  *'<'*|*'>'*) not_here "mini-apps/wrangler.jsonc still holds <placeholders>; run /wong-sync to plan provisioning" ;;
esac

if [ "$STAGING_NAME" = "$PROD_NAME" ]; then
  echo "cf-mini: ERROR — the staging environment resolves to the production mini Worker '$PROD_NAME'." >&2
  echo "cf-mini: Uploading would overwrite production. Give env.staging its own \"name\"" >&2
  echo "cf-mini: (e.g. \"$PROD_NAME-staging\") in mini-apps/wrangler.jsonc." >&2
  exit 1
fi

HAS_D1=$(wong_config has-d1 staging)
PROD_HAS_D1=$(wong_config has-d1)
if [ "$HAS_D1" = false ] && [ "$PROD_HAS_D1" = true ]; then
  fail "env.staging in mini-apps/wrangler.jsonc needs its own d1_databases entry"
fi
if [ "$HAS_D1" = true ] && [ "$PROD_HAS_D1" = true ]; then
  STAGING_DB=$(wong_config database-name staging)
  PROD_DB=$(wong_config database-name)
  if [ "$STAGING_DB" = "$PROD_DB" ]; then
    fail "the staging environment binds the production database '$PROD_DB' — a preview would write real data"
  fi
elif [ "$HAS_D1" = true ]; then
  STAGING_DB=$(wong_config database-name staging)
fi

if [ "$MODE" = preview ] && [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  not_here "no CLOUDFLARE_API_TOKEN; source the primary worktree's .env, or push and let CI make the preview"
fi

# ── Build the dashboard and route table from each app.json ───────────────────
node "$SCRIPT_DIR/mini-dashboard.mjs" --dir "$MINI_DIR"

# ── Production: the default branch in CI, with no expiry ─────────────────────
if [ "$MODE" = ci ] && [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  say "production branch — deploying the production mini Worker ($PROD_NAME), with no expiry"
  mini_wrangler deploy
  exit 0
fi

# ── Staging: every other upload expires in seven days ────────────────────────
EXPIRES=$(( ($(date +%s) + 7 * 24 * 60 * 60) * 1000 ))
EXPIRY=(--var "PREVIEW_EXPIRES:$EXPIRES")

UPLOAD_LOG=$(mktemp)
trap 'rm -f "$UPLOAD_LOG"' EXIT

# Call only in a condition (`if`, `||`), so a failed upload returns its status.
upload() {
  say "uploading a staging version (alias: $ALIAS, expires in 7 days)"
  mini_wrangler versions upload --env staging --preview-alias "$ALIAS" "${EXPIRY[@]}" 2>&1 | tee "$UPLOAD_LOG"
  return "${PIPESTATUS[0]}"
}

if [ "$MODE" = ci ]; then
  # Deploy first, then upload, as cf-deploy.sh does: the deployed staging
  # Worker is what a preview alias hangs on.
  say "deploying the staging mini Worker ($STAGING_NAME), expires in 7 days"
  mini_wrangler deploy --env staging "${EXPIRY[@]}"
  upload || fail "the preview upload failed"
else
  if [ "$HAS_D1" = true ]; then
    say "applying pending migrations to the staging database ($STAGING_DB)"
    mini_wrangler d1 migrations apply "$STAGING_DB" --remote --env staging
  fi
  # Upload first: the staging twin exists on every preview but the first, so
  # the common case is one wrangler call.
  if ! upload; then
    grep -qiE 'does not (yet )?exist|code: 10007' "$UPLOAD_LOG" || fail "the preview upload failed"
    say "the staging mini Worker ($STAGING_NAME) does not exist yet — creating it"
    mini_wrangler deploy --env staging "${EXPIRY[@]}"
    upload || fail "the preview upload failed"
  fi
fi

# ── The preview URL: harvested, never constructed ────────────────────────────
# The same extraction as cf-deploy.sh, for the same reason: a URL built from the
# documented shape answers 200 even when it points at another version. When
# wrangler prints none, publish none. Every grep is `|| true`-guarded: finding
# no URL must not abort an upload that already succeeded.
ALL_URLS=$(grep -oE 'https://[a-z0-9._-]+\.workers\.dev[^[:space:]]*' "$UPLOAD_LOG" || true)
PREVIEW_URL=$(printf '%s\n' "$ALL_URLS" | grep -F "$ALIAS" | head -1 || true)
if [ -z "$PREVIEW_URL" ]; then
  PREVIEW_URL=$(printf '%s\n' "$ALL_URLS" | head -1 || true)
fi

if [ -n "$PREVIEW_URL" ]; then
  say "preview URL $PREVIEW_URL"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "preview-url=$PREVIEW_URL" >> "$GITHUB_OUTPUT"
  fi
else
  echo "cf-mini: WARNING — wrangler printed no preview URL; nothing to publish" >&2
fi
