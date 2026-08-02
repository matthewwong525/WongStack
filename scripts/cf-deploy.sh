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
# A non-production branch must never land on the production Worker. There are
# two ways the environment gets selected, and using the wrong one fails SILENTLY
# — the deploy succeeds, prints a preview URL, and has overwritten production:
#
#   plain wrangler build  → `--env staging` here, at deploy time.
#   @cloudflare/vite-plugin → `CLOUDFLARE_ENV=staging` at BUILD time (cf-build.sh
#     sets it). The plugin flattens that environment into a generated config and
#     redirects wrangler at it; Cloudflare's docs state that `--env` on
#     `wrangler deploy` "will have no effect" once that redirect exists.
#
# So the flag is conditional, decided by whether the build left a redirect, and
# it is built once and reused so the two commands below cannot drift apart.
# Whichever path ran, the guard after them re-reads the name wrangler actually
# deployed and aborts if it is production's. That check is the real safety net:
# it catches this whole class of mistake rather than any one instance of it.
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

# The branch in CI. `CF_BRANCH` is the CI-neutral name the pack's GitHub Actions
# workflow sets; `WORKERS_CI_BRANCH` is what Cloudflare Workers Builds sets on
# its own. Either backend works, and a repo can run both while it migrates.
CI_BRANCH="${CF_BRANCH:-${WORKERS_CI_BRANCH:-}}"

# Local (non-CI) runs: deploy nothing.
if [ -z "$CI_BRANCH" ]; then
  echo "cf-deploy: not in CI — nothing deployed"
  exit 0
fi

wong_resolve_wrangler_config "$ROOT"

BRANCH="$CI_BRANCH"
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

# ...unless the build already chose the environment for us.
#
# @cloudflare/vite-plugin flattens the selected environment into a generated
# `dist/**/wrangler.json` and writes `.wrangler/deploy/config.json` to redirect
# wrangler at it. From that point the environment is BAKED IN, and Cloudflare's
# docs state plainly that `--env` on `wrangler deploy` "will have no effect".
#
# Passing `--env staging` anyway is not merely redundant — it reads as though
# isolation is happening when it isn't. `cf-build.sh` sets `CLOUDFLARE_ENV` so
# the generated config *is* staging; here we must not re-specify it.
#
# The redirect file is the signal, so this works for both layouts: a plain
# wrangler build has no redirect and still needs the flag.
if [ -f "$APP_DIR/.wrangler/deploy/config.json" ]; then
  STAGING_ENV=()
  echo "cf-deploy: build redirected wrangler to its generated config — environment already selected"
fi

# Fail closed: confirm the config wrangler will actually use names a Worker
# other than production's, BEFORE anything is deployed.
#
# `wong_read_worker_name` reads the name wrangler resolves — the generated
# config when the build redirected, the source config otherwise. If that equals
# the production name on a non-production branch, the staging environment did
# not take effect and deploying would overwrite production. Refuse.
PROD_NAME=$(wong_read_worker_name)
STAGING_NAME=$(wong_read_worker_name staging)
if [ -n "$PROD_NAME" ] && [ "$STAGING_NAME" = "$PROD_NAME" ]; then
  echo "cf-deploy: ERROR — on branch '$BRANCH' the staging environment resolves to the" >&2
  echo "cf-deploy: production Worker '$PROD_NAME'. Deploying would overwrite production." >&2
  echo "cf-deploy:" >&2
  echo "cf-deploy: Fix one of these in $WRANGLER_CONFIG:" >&2
  echo "cf-deploy:   • env.staging needs its own \"name\" (e.g. \"$PROD_NAME-staging\")" >&2
  echo "cf-deploy:   • the build must select it — cf-build.sh exports CLOUDFLARE_ENV=staging" >&2
  echo "cf-deploy:     for @cloudflare/vite-plugin builds" >&2
  exit 1
fi

echo "cf-deploy: preview branch — deploying the staging Worker ($STAGING_NAME)"
(cd "$APP_DIR" && npx wrangler deploy "${STAGING_ENV[@]}")

# Must come *after* the deploy — see the header. A version can only be uploaded
# against a Worker that already exists.
echo "cf-deploy: uploading a staging version (alias: $ALIAS)"
UPLOAD_LOG=$(mktemp)
(cd "$APP_DIR" && npx wrangler versions upload "${STAGING_ENV[@]}" --preview-alias "$ALIAS") \
  | tee "$UPLOAD_LOG"

# ── Publish the alias URL so something downstream can find it ─────────────────
# Under Cloudflare Workers Builds, Cloudflare's own GitHub integration posts the
# preview URL onto the commit, which is where `/save` and `/ship` look for it.
# The Actions workflow has no such integration — wrangler prints the URL into a
# job log and it dies there. So we lift it out and hand it to the workflow,
# which publishes it as a GitHub Deployment.
#
# **Harvested, never constructed.** The URL shape is documented, so building
# `<alias>-<worker>-staging.<subdomain>.workers.dev` by hand is tempting — and
# wrong. A constructed URL is a guess that answers 200 even when it points at a
# different commit or a Worker the deploy never touched, which is precisely the
# failure a preview URL exists to rule out. If wrangler didn't print one, we
# publish nothing and the caller reports "no preview URL" honestly.
#
# Every extraction below is `|| true`-guarded: this script runs under `set -e`,
# and a grep that matches nothing exits 1. Failing to find a URL must degrade to
# "no preview URL", never abort a deploy that already succeeded.
ALL_URLS=$(grep -oE 'https://[a-z0-9._-]+\.workers\.dev[^[:space:]]*' "$UPLOAD_LOG" || true)
PREVIEW_URL=$(printf '%s\n' "$ALL_URLS" | grep -F "$ALIAS" | head -1 || true)
if [ -z "$PREVIEW_URL" ]; then
  PREVIEW_URL=$(printf '%s\n' "$ALL_URLS" | head -1 || true)
fi
rm -f "$UPLOAD_LOG"

if [ -n "$PREVIEW_URL" ]; then
  echo "cf-deploy: preview URL $PREVIEW_URL"
  # GITHUB_OUTPUT is set only inside GitHub Actions; on Workers Builds this is
  # a no-op and Cloudflare publishes the URL itself.
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "preview-url=$PREVIEW_URL" >> "$GITHUB_OUTPUT"
  fi
else
  echo "cf-deploy: WARNING — wrangler printed no preview URL; nothing to publish" >&2
fi
