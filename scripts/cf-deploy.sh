#!/usr/bin/env bash
# CI deploy wrapper: deploy each branch to the Worker that belongs to it.
#
# Wire it up as the **deploy command** in the Cloudflare Workers Builds
# dashboard (Settings → Build → Deploy command):
#
#     bash scripts/cf-deploy.sh
#
# That one dashboard setting is the whole reason this file exists. Workers
# Builds offers a single deploy command for every branch, so the branch logic
# has to live in a script — the same way `cf-build.sh` carries the branch logic
# for the build.
#
# Behavior:
#   - production branch (default `main`, override with CF_PRODUCTION_BRANCH)
#       → `wrangler deploy`  — the production Worker.
#   - any other branch
#       → `wrangler deploy --env staging`
#         (the deployed staging Worker — the thing that receives queue
#          messages, cron triggers, and every other non-request handler)
#       → `wrangler versions upload --env staging --preview-alias <branch>`
#         (the per-commit preview URL, HTTP only)
#
#     Deploy first, then upload. `versions upload` fails outright against a
#     Worker that doesn't exist yet — "You cannot upload a new version of a
#     Worker that does not yet exist" — which is the state on the very first
#     branch push in a repo. Uploading first would kill this script before the
#     deploy that would have created the Worker.
#   - anywhere else (a developer's terminal) → no-op. Nothing is ever deployed
#     from a laptop.
#
# ── The one thing not to get wrong ────────────────────────────────────────────
# `--env staging` belongs on BOTH non-production commands. Drop it from the
# version upload and that upload becomes a version of the *production* Worker,
# bound to the production database — which is exactly the bug the staging
# environment exists to remove, and it fails silently. The flag is built once
# below and reused, so the two commands cannot drift apart.
#
# Why two commands rather than one: they produce two URLs with different
# capabilities. The version alias serves HTTP for that specific commit; only
# the deployed staging Worker runs queue consumers and crons. See
# wiki/stack/d1-pipeline.md.
#
# Zero-config: no Worker name, environment id, or database id is baked in here.
# The environment is always `staging`; everything else comes from the branch and
# the wrangler config. Every repo ships this file byte-for-byte identical.

set -euo pipefail

# Anchor every path on this script's own location, not the caller's CWD — the
# Workers Builds root directory may be the repo root or the app subdirectory.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(dirname "$SCRIPT_DIR")

# shellcheck source=lib-wrangler-config.sh
source "$SCRIPT_DIR/lib-wrangler-config.sh"

# Local (non-CI) runs: deploy nothing.
if [ -z "${WORKERS_CI_BRANCH:-}" ]; then
  echo "cf-deploy: not in CI — nothing deployed"
  exit 0
fi

wong_resolve_wrangler_config "$ROOT"

BRANCH="$WORKERS_CI_BRANCH"
PRODUCTION_BRANCH="${CF_PRODUCTION_BRANCH:-main}"
echo "cf-deploy: branch=$BRANCH (production branch: $PRODUCTION_BRANCH)"

if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  echo "cf-deploy: production branch — deploying the production Worker"
  # Recent wrangler warns here that environments are defined but none was
  # named. Expected and harmless: with no `--env` it binds the top-level
  # (production) config, which is what we want — verified by comparing the
  # printed bindings. `--env=""` silences it but is a newer wrangler
  # semantic, and the pack pins no wrangler version, so we don't rely on it.
  (cd "$APP_DIR" && npx wrangler deploy)
  exit 0
fi

# A preview alias must be lowercase alphanumeric-and-hyphen and at most 63
# characters, so a branch like `feat/Add_Thing` can't be passed through as-is.
ALIAS=$(printf '%s' "$BRANCH" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
  | cut -c1-63 \
  | sed -E 's/-+$//')
if [ -z "$ALIAS" ]; then
  echo "cf-deploy: ERROR — branch '$BRANCH' has no usable preview alias" >&2
  exit 1
fi

# Built once, used by both commands below. See the warning in the header.
STAGING_ENV=(--env staging)

echo "cf-deploy: preview branch — deploying the staging Worker"
(cd "$APP_DIR" && npx wrangler deploy "${STAGING_ENV[@]}")

# Must come *after* the deploy — see the header. A version can only be uploaded
# against a Worker that already exists.
echo "cf-deploy: uploading a staging version (alias: $ALIAS)"
(cd "$APP_DIR" && npx wrangler versions upload "${STAGING_ENV[@]}" --preview-alias "$ALIAS")
