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

wong_ci_branch

# Local (non-CI) runs: deploy nothing.
if [ -z "$BRANCH" ]; then
  echo "cf-deploy: not in CI — nothing deployed"
  exit 0
fi

wong_resolve_wrangler_config "$ROOT"

echo "cf-deploy: branch=$BRANCH (production branch: $PRODUCTION_BRANCH)"

if [ "$BRANCH" = "$PRODUCTION_BRANCH" ]; then
  echo "cf-deploy: production branch — deploying the production Worker"
  # Recent wrangler warns here that environments are defined but none was
  # named. Expected and harmless: with no `--env` it binds the top-level
  # (production) config, which is what we want — verified by comparing the
  # printed bindings. `--env=""` silences it but is a newer wrangler
  # semantic, and the pack pins no wrangler version, so we don't rely on it.
  # The memory route checks GitHub access against this repo when a teammate
  # joins (wiki/development/memory.md), so production learns its own slug here,
  # never from a request. Workers Builds sets no GITHUB_REPOSITORY; read origin.
  REPO_SLUG=${GITHUB_REPOSITORY:-}
  if [ -z "$REPO_SLUG" ]; then
    REPO_SLUG=$(git -C "$ROOT" remote get-url origin 2>/dev/null | sed -nE 's#^.*github\.com[:/]([^/]+/[^/]+)$#\1#p' | sed -E 's#\.git$##' || true)
  fi
  REPO_VAR=()
  if [ -n "$REPO_SLUG" ]; then
    REPO_VAR=(--var "GITHUB_REPOSITORY:$REPO_SLUG")
  fi
  (cd "$APP_DIR" && npx wrangler deploy "${REPO_VAR[@]}")
  exit 0
fi

ALIAS=$(wong_preview_alias "$BRANCH")
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
# `wong_config worker-name` reads the name wrangler resolves — the generated
# config when the build redirected, the source config otherwise. If that equals
# the production name on a non-production branch, the staging environment did
# not take effect and deploying would overwrite production. Refuse. A config
# the parser cannot read stops here too: the assignment fails under `set -e`.
PROD_NAME=$(wong_config worker-name)
STAGING_NAME=$(wong_config worker-name staging)
if [ "$STAGING_NAME" = "$PROD_NAME" ]; then
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
# which publishes it as a GitHub Deployment. The URL is harvested from what
# wrangler printed, never constructed — see wong_preview_url.
PREVIEW_URL=$(wong_preview_url "$UPLOAD_LOG" "$ALIAS")
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
