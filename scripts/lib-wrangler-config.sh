#!/usr/bin/env bash
# shellcheck disable=SC2034  # sourced: the calling scripts read the variables set here
# Shared shell helpers for the pack's bash pipeline scripts.
#
# `cf-build.sh`, `cf-deploy.sh`, and `cf-preview.sh` all need to answer the same
# questions — where is the wrangler config, which directory should wrangler run
# from, which alias a branch previews under — and they must answer them
# identically or a build and its deploy would target different apps. One copy of
# each rule, sourced by all three.
#
# Finding and reading the config both go through `lib-wrangler-config.mjs`, the
# module the .mjs scripts use, so the two can not disagree.
#
# Sourced, never executed:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib-wrangler-config.sh"
#
# Sets: WRANGLER_CONFIG, APP_DIR, BUILD_DIR (see wong_resolve_wrangler_config);
# BRANCH, PRODUCTION_BRANCH (see wong_ci_branch); STAGING_ENV (see
# wong_staging_env_args); PROD_NAME, STAGING_NAME (see
# wong_refuse_production_worker).

_WONG_LIB_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Find the wrangler config: repo root first, then each immediate subdirectory,
# through `lib-wrangler-config.mjs config-path`. Keeps every repo's copy
# identical whether the Worker sits at the repo root or in an `app/` subdirectory.
#
# Usage: wong_resolve_wrangler_config <repo-root>
wong_resolve_wrangler_config() {
  local root="$1"

  if ! WRANGLER_CONFIG=$(node "$_WONG_LIB_DIR/lib-wrangler-config.mjs" config-path); then
    WRANGLER_CONFIG=""
    # An unprovisioned repo is the expected state right after setup: the pack is
    # adopted before it is configured. Name the remedy — the file this is looking
    # for means nothing to whoever reads the CI log. Exit status is unchanged.
    echo "wong: no wrangler config found under $root — this repo isn't set up for Cloudflare yet." >&2
    echo "wong: run /wong-sync to plan Cloudflare provisioning and put the app online." >&2
    return 1
  fi

  # wrangler resolves config-relative paths (migrations_dir, assets) from the
  # config's own directory, so every wrangler invocation runs from APP_DIR.
  APP_DIR=$(dirname "$WRANGLER_CONFIG")

  # npm runs where package.json actually lives, which may be the repo root.
  BUILD_DIR="$root"
  [ -f "$APP_DIR/package.json" ] && BUILD_DIR="$APP_DIR"

  return 0
}

# Answer a question about the config through `lib-wrangler-config.mjs`, the one
# parser every pack script shares. A regex over the text cannot tell `name` from
# `database_name`, or a comment from a key. Call wong_resolve_wrangler_config
# first; the parser reads the same file.
#
# Usage: wong_config <worker-name|database-name|has-d1|assets-dir> [environment]
#   worker-name    the Worker wrangler will deploy. Production always comes from
#                  the source config; an environment reads the build's generated
#                  config when a plugin build redirected wrangler at one.
#   database-name  the first D1 `database_name` of production or the environment
#   has-d1         `true` or `false`
#   assets-dir     the static-assets folder of the last build (after a build only)
#
# Prints the answer. On a config error (TOML, bad JSONC, a missing key) it prints
# the reason and returns 1, so call it in an assignment under `set -e`.
wong_config() {
  WRANGLER_CONFIG="$WRANGLER_CONFIG" node "$_WONG_LIB_DIR/lib-wrangler-config.mjs" "$@"
}

# The production branch, by one rule for every pack script: CF_PRODUCTION_BRANCH
# when set, else the remote's default branch when Git knows it, else `main`.
#
# Usage: wong_production_branch <repo-root>
wong_production_branch() {
  local head
  if [ -n "${CF_PRODUCTION_BRANCH:-}" ]; then
    printf '%s\n' "$CF_PRODUCTION_BRANCH"
    return 0
  fi
  head=$(git -C "$1" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
  head="${head#origin/}"
  printf '%s\n' "${head:-main}"
}

# The branch in CI. `CF_BRANCH` is the CI-neutral name the pack's GitHub Actions
# workflow sets; `WORKERS_CI_BRANCH` is what Cloudflare Workers Builds sets on
# its own. Either backend works, and a repo can run both while it migrates.
# BRANCH is empty outside CI. PRODUCTION_BRANCH follows wong_production_branch.
#
# Usage: wong_ci_branch <repo-root>
wong_ci_branch() {
  BRANCH="${CF_BRANCH:-${WORKERS_CI_BRANCH:-}}"
  PRODUCTION_BRANCH=$(wong_production_branch "$1")
}

# The environment flag for every staging wrangler call, built once so the calls
# can not drift apart: `--env staging`, unless the build already chose it.
#
# @cloudflare/vite-plugin flattens the selected environment into a generated
# `dist/**/wrangler.json` and writes `.wrangler/deploy/config.json` to redirect
# wrangler at it. From that point the environment is BAKED IN, and Cloudflare's
# docs state plainly that `--env` on `wrangler deploy` "will have no effect".
#
# Passing `--env staging` anyway is not merely redundant — it reads as though
# isolation is happening when it isn't. `cf-build.sh` sets `CLOUDFLARE_ENV` so
# the generated config *is* staging; the flag must not re-specify it.
#
# The redirect file is the signal, so this works for both layouts: a plain
# wrangler build has no redirect and still needs the flag. Expand it as
# ${STAGING_ENV[@]+"${STAGING_ENV[@]}"}: an empty array is unset to older bash.
#
# Usage: wong_staging_env_args   (after wong_resolve_wrangler_config)
wong_staging_env_args() {
  STAGING_ENV=(--env staging)
  if [ -f "$APP_DIR/.wrangler/deploy/config.json" ]; then
    STAGING_ENV=()
  fi
}

# Fail closed: refuse when the staging Worker wrangler will use is production's.
#
# `wong_config worker-name staging` reads the name wrangler resolves — the
# generated config when the build redirected, the source config otherwise. If
# it equals production's, the staging environment did not take effect and a
# deploy or upload would overwrite production. Sets PROD_NAME and STAGING_NAME;
# on a match prints why under `<prefix>:` and returns 1. A config the parser can
# not read returns 1 too, after the parser's own message.
#
# Usage: wong_refuse_production_worker <prefix>   (after wong_resolve_wrangler_config)
wong_refuse_production_worker() {
  local p="$1"
  PROD_NAME=$(wong_config worker-name) || return 1
  STAGING_NAME=$(wong_config worker-name staging) || return 1
  [ "$STAGING_NAME" != "$PROD_NAME" ] && return 0
  {
    echo "$p: ERROR — the staging environment resolves to the production Worker '$PROD_NAME'."
    echo "$p: Deploying or uploading would overwrite production. Fix one of these in $WRANGLER_CONFIG:"
    echo "$p:   • env.staging needs its own \"name\" (e.g. \"$PROD_NAME-staging\")"
    echo "$p:   • the build must select it — cf-build.sh exports CLOUDFLARE_ENV=staging"
    echo "$p:     for @cloudflare/vite-plugin builds"
  } >&2
  return 1
}

# The preview alias for a branch or a name. An alias must be lowercase
# alphanumeric-and-hyphen and start with a letter, so a branch like
# `feat/Add_Thing` can't be passed through as-is, and `123-fix` becomes
# `b-123-fix`. Its URL label is `<alias>-<worker>`, which must fit in 63
# characters, so with the Worker's name the alias is cut to fit; without it, to
# 63. Prints nothing when no usable character is left; the caller refuses that.
#
# Usage: wong_preview_alias <branch-or-name> [worker-name]
wong_preview_alias() {
  local max=63 alias
  [ -n "${2:-}" ] && max=$(( 62 - ${#2} ))
  [ "$max" -ge 1 ] || return 0
  alias=$(printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
  case "$alias" in ''|[a-z]*) ;; *) alias="b-$alias" ;; esac
  printf '%s' "$alias" | cut -c1-"$max" | sed -E 's/-+$//'
}

# The preview URL from a `wrangler versions upload` log: the first workers.dev
# URL that contains the alias, else the first workers.dev URL, else nothing.
#
# **Harvested, never constructed.** The URL shape is documented, so building
# `<alias>-<worker>-staging.<subdomain>.workers.dev` by hand is tempting — and
# wrong. A constructed URL is a guess that answers 200 even when it points at a
# different commit or a Worker the deploy never touched, which is precisely the
# failure a preview URL exists to rule out. If wrangler didn't print one, this
# prints nothing and the caller reports "no preview URL" honestly.
#
# Every grep is `|| true`-guarded: the callers run under `set -e`, and a grep
# that matches nothing exits 1. Finding no URL must degrade to "no preview URL",
# never abort an upload that already succeeded.
#
# Usage: wong_preview_url <upload-log> <alias>
wong_preview_url() {
  local all url
  all=$(grep -oE 'https://[a-z0-9._-]+\.workers\.dev[^[:space:]]*' "$1" || true)
  url=$(printf '%s\n' "$all" | grep -F "$2" | head -1 || true)
  if [ -z "$url" ]; then
    url=$(printf '%s\n' "$all" | head -1 || true)
  fi
  printf '%s\n' "$url"
}
