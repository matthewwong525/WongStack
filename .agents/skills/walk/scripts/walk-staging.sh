#!/usr/bin/env bash
# The staging walkthrough's plumbing: everything about a walk that must be the
# same every time, so the only thing the agent authors per run is the journeys
# themselves.
#
# `/walk` calls this, in three phases:
#
#   walk-staging.sh preflight            → can we walk, and what do we walk?
#   walk-staging.sh run <run-dir>        → drive the journeys, capture evidence
#   walk-staging.sh cleanup <run-dir>    → leave no trace
#
# ── What this script does NOT do ──────────────────────────────────────────────
# It never decides whether a journey passed. It captures evidence; `/walk` reads
# that evidence against the scenario's written THEN. So this script prints
# NONE / UNKNOWN / TIMEOUT / READY / WALKED and deliberately never prints
# SUCCESS or FAILURE — those two words belong to the grader, and printing them
# here would let a run *look* graded when nothing had judged it.
#
#   RESULT: NONE     — this repo never opted in, or there is nothing to walk.
#                      Reported in one line; nothing else is affected.
#   RESULT: READY    — preflight passed; the facts below say where to walk.
#   RESULT: WALKED   — every journey ran and its evidence is on disk.
#   RESULT: UNKNOWN  — the walk could not run or could not be trusted (no
#                      browser, no URL, unreachable staging, an Access
#                      challenge). UNVERIFIED, which is not the same as "no
#                      walkthrough exists" — /walk must report it as such.
#   RESULT: TIMEOUT  — the walk did not finish inside its budget.
#
# After RESULT come indented human lines, then KEY=VALUE facts for the caller.
#
# ── Why absence is silent but a broken walk is loud ───────────────────────────
# Adoption is a fact about the repo, not a setting: `playwright` in the app's
# devDependencies IS the opt-in, exactly as adopting Cloudflare Access is the
# policy plus the code change rather than a flag somewhere. Before consent,
# silence is normal. After consent, silence is suspicious — so the same missing
# browser is NONE in one repo and UNKNOWN in the other.
#
# This script NEVER installs anything. A missing dependency is a statement about
# what the repo chose, or a condition to report — never a condition to fix.
#
# Depends on: git, node (only when adopted), and the repo's own playwright.
set -uo pipefail

CMD="${1:-preflight}"

emit() { echo "RESULT: $1"; }
note() { echo "  $*"; }

# ── Locate the app ────────────────────────────────────────────────────────────
# Same shape as the pack's config discovery: repo root first, then each
# immediate subdirectory. Deliberately keyed on package.json rather than on a
# wrangler config — a repo can adopt the walkthrough without taking the whole
# Cloudflare pack, and the URL comes from the preview helper either way.
find_app_dir() {
  local root="$1" dir base
  if [ -f "$root/package.json" ] && grep -q '"playwright"' "$root/package.json"; then
    printf '%s' "$root"; return 0
  fi
  for dir in "$root"/*/; do
    base=$(basename "$dir")
    case "$base" in node_modules|.*) continue ;; esac
    if [ -f "$dir/package.json" ] && grep -q '"playwright"' "$dir/package.json"; then
      printf '%s' "${dir%/}"; return 0
    fi
  done
  return 1
}

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

case "$CMD" in
# ──────────────────────────────────────────────────────────────────────────────
preflight)
  # Only preflight needs the repo — it is the phase that asks what changed and
  # where the deploy for this commit went. `run`, `publish` and `cleanup` work
  # on a run directory that is already fully described by its arguments, so
  # requiring a repo for them would strand a walk that had legitimately started.
  if [ -z "$ROOT" ]; then
    emit UNKNOWN; note "not inside a git repository"; exit 0
  fi
  APP_DIR=$(find_app_dir "$ROOT")
  if [ -z "${APP_DIR:-}" ]; then
    # Not adopted. Say nothing beyond the verdict — the promise the opt-in makes
    # is that a repo which never asked for this pays nothing, not even a nudge.
    emit NONE
    exit 0
  fi

  # From here on the repo HAS consented, so every remaining failure is UNKNOWN.

  # The browser must already be there. `playwright install` is the user's call,
  # made once, deliberately — not something a merge gate does on their behalf.
  BROWSER=$(cd "$APP_DIR" && node -e '
    try {
      const { chromium } = require("playwright");
      const p = chromium.executablePath();
      process.stdout.write(require("fs").existsSync(p) ? p : "");
    } catch { process.stdout.write(""); }
  ' 2>/dev/null)
  if [ -z "$BROWSER" ]; then
    emit UNKNOWN
    note "playwright is declared in $APP_DIR/package.json but its browser is not installed."
    note "Install it yourself — this gate will not modify your machine:"
    note "    (cd $APP_DIR && npx playwright install chromium)"
    exit 0
  fi

  # The URL is discovered, never configured or guessed. preview-url.sh reads the
  # deployment/status/check/comment that the deploy actually published for THIS
  # commit, so a green CI run is what makes this line succeed. Constructing
  # `<branch>-<worker>-staging.workers.dev` by hand would silently walk the
  # wrong commit — or a URL that was never deployed at all.
  URL=$(bash "$ROOT/.claude/skills/save/scripts/preview-url.sh" 2>/dev/null | tail -1)
  case "$URL" in http*) ;; *) URL="" ;; esac   # anything that isn't a URL is no URL
  if [ -z "$URL" ]; then
    SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "this commit")
    emit UNKNOWN
    note "no preview URL for $SHORT — nothing to walk against."
    note "The deploy may not have published one yet, or this repo has no preview deploys."
    exit 0
  fi

  RUN_DIR=$(mktemp -d "${TMPDIR:-/tmp}/wong-walk-XXXXXX")
  emit READY
  echo "APP_DIR=$APP_DIR"
  echo "URL=$URL"
  echo "RUN_DIR=$RUN_DIR"
  echo "SHA=$(git rev-parse HEAD)"
  ;;

# ──────────────────────────────────────────────────────────────────────────────
run)
  RUN_DIR="${2:-}"
  APP_DIR="${3:-}"
  URL="${4:-}"
  BUDGET="${5:-10}"   # minutes
  if [ -z "$RUN_DIR" ] || [ -z "$APP_DIR" ] || [ -z "$URL" ]; then
    emit UNKNOWN; note "usage: walk-staging.sh run <run-dir> <app-dir> <url> [budget-minutes]"; exit 0
  fi
  if ! ls "$RUN_DIR"/journeys/*.mjs >/dev/null 2>&1; then
    # Preflight succeeded but the scout found nothing browser-observable. That's
    # a real answer, not a failure: a change whose scenarios all live off the
    # request path (a queue consumer, a cron) has nothing a browser can see.
    emit NONE
    note "no journeys were written — nothing browser-observable in this change"
    exit 0
  fi

  WALK_URL="$URL" \
  timeout "${BUDGET}m" node "$(dirname "${BASH_SOURCE[0]}")/walk-runner.mjs" "$RUN_DIR" "$APP_DIR"
  STATUS=$?

  case "$STATUS" in
    0)   emit WALKED; echo "EVIDENCE=$RUN_DIR/evidence.json" ;;
    124) emit TIMEOUT; note "the walk exceeded its ${BUDGET}-minute budget" ;;
    # The runner exits 3 when it recognised a Cloudflare Access challenge. That
    # case is worth its own exit code because it is the one failure that would
    # otherwise look like success: without the check, the walk screenshots a
    # login form and a grader could read "a page rendered" as a pass.
    3)   emit UNKNOWN
         note "the preview answered with a Cloudflare Access login challenge."
         note "Set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET (see"
         note ".env.example and wiki/stack/cloudflare-access.md) so the walk can"
         note "authenticate. Reporting UNVERIFIED rather than grading a login page." ;;
    *)   emit UNKNOWN; note "the runner exited $STATUS before finishing" ;;
  esac
  ;;

# ──────────────────────────────────────────────────────────────────────────────
# Optional. Uploads the run's screenshots and video to a public bucket so the PR
# comment can show them instead of naming local paths, and prints a
# `<local-path><TAB><public-url>` line per file for the caller to substitute.
#
# Nothing depends on this. With no bucket configured the comment cites local
# paths, which is a rung down, not a failure — the prose carries the record and
# the media only corroborates it.
publish)
  RUN_DIR="${2:-}"
  if [ -z "${WALK_MEDIA_BUCKET:-}" ]; then
    emit NONE; note "no WALK_MEDIA_BUCKET — the comment will cite local paths"; exit 0
  fi
  BASE="${WALK_MEDIA_BASE_URL:-}"
  if [ -z "$BASE" ]; then
    emit UNKNOWN
    note "WALK_MEDIA_BUCKET is set but WALK_MEDIA_BASE_URL is not — an uploaded"
    note "object with no public base URL cannot be linked. See .env.example."
    exit 0
  fi
  PREFIX="walkthrough/$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  FAILED=0
  while IFS= read -r f; do
    KEY="$PREFIX/${f#"$RUN_DIR"/}"
    if npx wrangler r2 object put "$WALK_MEDIA_BUCKET/$KEY" --file="$f" --remote >/dev/null 2>&1; then
      printf '%s\t%s/%s\n' "$f" "${BASE%/}" "$KEY"
    else
      FAILED=$((FAILED + 1))
    fi
  done < <(find "$RUN_DIR/evidence" "$RUN_DIR/video" -type f 2>/dev/null)
  # A failed upload costs the pictures, never the gate: the verdict was already
  # decided from evidence on disk, and the written comment stands on its own.
  if [ "$FAILED" -gt 0 ]; then
    note "$FAILED file(s) failed to upload — those cite local paths instead"
  fi
  emit WALKED
  ;;

# ──────────────────────────────────────────────────────────────────────────────
cleanup)
  RUN_DIR="${2:-}"
  # Only ever remove a directory this script made, under the system temp dir.
  # Nothing the walkthrough writes has ever been inside the repo, so there is
  # nothing here that could touch the working tree even if this were wrong.
  case "$RUN_DIR" in
    */wong-walk-*) rm -rf "$RUN_DIR"; echo "cleaned $RUN_DIR" ;;
    *) echo "refusing to remove '$RUN_DIR' — not a walkthrough run directory" >&2; exit 1 ;;
  esac
  ;;

*)
  echo "usage: walk-staging.sh {preflight|run <run-dir> <app-dir> <url> [minutes]|publish <run-dir>|cleanup <run-dir>}" >&2
  exit 1
  ;;
esac
