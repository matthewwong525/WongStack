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

# Read the Worker name wrangler will actually use, so a caller can verify a
# non-production branch isn't about to land on the production Worker.
#
# Two config files can be in play. When the build goes through
# @cloudflare/vite-plugin it emits a flattened `dist/**/wrangler.json` and a
# `.wrangler/deploy/config.json` redirecting wrangler at it — and from then on
# that generated file, not the source, decides everything. So prefer it when it
# exists; that is the file wrangler reads.
#
# Usage: wong_read_worker_name [environment]
#   no argument  → the production name, ALWAYS from the source config. Production
#                  is the thing we're protecting, so its identity must not come
#                  from a generated file that may itself be the mistake.
#   "staging"    → the name the deploy will actually use: the generated config's
#                  `name` when the build redirected wrangler at one, otherwise
#                  the source `env.staging.name` (falling back to wrangler's own
#                  `<name>-staging` default, which applies when the environment
#                  declares no name of its own).
#
# The asymmetry is deliberate, and it's what makes the caller's equality check
# meaningful: a staging build that silently produced production's config returns
# production's name here, and the two match.
#
# Prints the name, or nothing when it can't be determined.
wong_read_worker_name() {
  local env_name="${1:-}"
  local redirect="$APP_DIR/.wrangler/deploy/config.json" generated="" text prod

  _wong_first_name() {
    printf '%s' "$1" \
      | grep -oE '"?name"?[[:space:]]*[:=][[:space:]]*"[^"]+"' \
      | head -1 | sed -E 's/.*[:=][[:space:]]*"([^"]+)".*/\1/' || true
  }

  prod=$(_wong_first_name "$(cat "$WRANGLER_CONFIG")")

  if [ -z "$env_name" ]; then
    printf '%s' "$prod"
    return 0
  fi

  # The redirect names the generated config in `configPath` — resolved relative
  # to the redirect FILE's own directory (`.wrangler/deploy/`), not to APP_DIR.
  # It reads like `../../dist/<worker>/wrangler.json`; anchoring it anywhere
  # else silently misses the file and falls back to the source config, which is
  # exactly the wrong answer for this check.
  if [ -f "$redirect" ]; then
    generated=$(grep -oE '"configPath"[[:space:]]*:[[:space:]]*"[^"]+"' "$redirect" \
      | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)".*/\1/' || true)
    if [ -n "$generated" ]; then
      generated=$(cd "$APP_DIR/.wrangler/deploy" 2>/dev/null && cd "$(dirname "$generated")" 2>/dev/null \
        && printf '%s/%s' "$(pwd)" "$(basename "$generated")" || true)
    fi
  fi

  if [ -n "$generated" ] && [ -f "$generated" ]; then
    _wong_first_name "$(cat "$generated")"
    return 0
  fi

  # No redirect: read the environment's own block out of the source config.
  text=$(sed -n "/\"$env_name\"[[:space:]]*:/,\$p" "$WRANGLER_CONFIG" || true)
  local env_name_value
  env_name_value=$(_wong_first_name "$text")

  # An environment that declares no name of its own gets wrangler's default.
  if [ -z "$env_name_value" ] || [ "$env_name_value" = "$prod" ]; then
    printf '%s' "${prod:+$prod-$env_name}"
  else
    printf '%s' "$env_name_value"
  fi
}
