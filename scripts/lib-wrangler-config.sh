#!/usr/bin/env bash
# Shared shell helpers for the pack's bash pipeline scripts.
#
# `cf-build.sh` and `cf-deploy.sh` both need to answer the same two questions —
# where is the wrangler config, and which directory should wrangler run from —
# and they must answer them identically or a build and its deploy would target
# different apps. One copy of the rule, sourced by both.
#
# The .mjs scripts get the same rule from `lib-wrangler-config.mjs`; keep the
# two in step if the resolution order ever changes.
#
# Sourced, never executed:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib-wrangler-config.sh"
#
# Sets: WRANGLER_CONFIG, APP_DIR, BUILD_DIR (see wong_resolve_wrangler_config).

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
    echo "wong: ERROR — no wrangler config found under $root" >&2
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
