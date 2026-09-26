#!/usr/bin/env bash
# Shared shell helpers for the pack's bash pipeline scripts.
#
# `cf-build.sh` and `cf-deploy.sh` both need to answer the same two questions —
# where is the wrangler config, and which directory should wrangler run from —
# and they must answer them identically or a build and its deploy would target
# different apps. One copy of the rule, sourced by both.
#
# The .mjs scripts get the same rule from `lib-wrangler-config.mjs`; keep the
# two in step if the resolution order ever changes. Reading the config itself
# goes through that module's parser (wong_config below).
#
# Sourced, never executed:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib-wrangler-config.sh"
#
# Sets: WRANGLER_CONFIG, APP_DIR, BUILD_DIR (see wong_resolve_wrangler_config).

_WONG_LIB_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Find the wrangler config: repo root first, then each immediate subdirectory.
# Keeps every repo's copy identical whether the Worker sits at the repo root or
# in an `app/` subdirectory.
#
# Usage: wong_resolve_wrangler_config <repo-root>
wong_resolve_wrangler_config() {
  local root="$1"
  local dir base name

  WRANGLER_CONFIG=""
  for name in wrangler.jsonc wrangler.json wrangler.toml; do
    if [ -f "$root/$name" ]; then WRANGLER_CONFIG="$root/$name"; break; fi
  done
  if [ -z "$WRANGLER_CONFIG" ]; then
    for dir in "$root"/*/; do
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
# Usage: wong_config <worker-name|database-name|has-d1> [environment]
#   worker-name    the Worker wrangler will deploy. Production always comes from
#                  the source config; an environment reads the build's generated
#                  config when a plugin build redirected wrangler at one.
#   database-name  the first D1 `database_name` of production or the environment
#   has-d1         `true` or `false`
#
# Prints the answer. On a config error (TOML, bad JSONC, a missing key) it prints
# the reason and returns 1, so call it in an assignment under `set -e`.
wong_config() {
  WRANGLER_CONFIG="$WRANGLER_CONFIG" node "$_WONG_LIB_DIR/lib-wrangler-config.mjs" "$@"
}
