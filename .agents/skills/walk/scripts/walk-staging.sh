#!/usr/bin/env bash
# The staging walkthrough's plumbing: everything about a walk that must be the
# same every time, so the only thing the agent authors per run is the journeys
# themselves.
#
# `/walk` calls this, in four phases:
#
#   walk-staging.sh scout-check          → is this repo adopted? (no credentials)
#   walk-staging.sh preflight            → can we walk, and what do we walk?
#   walk-staging.sh run <run-dir>        → drive the journeys, capture evidence
#   walk-staging.sh cleanup <run-dir>    → leave no trace
#
# `scout-check` exists so that "there is nothing to walk" costs nothing. It
# answers the one question the scout needs — did this repo opt in — while
# touching no credential, no API, and no network. The skill runs it first,
# scouts the change's scenarios, and only spends /save and preflight once it
# knows at least one journey exists. A pure-backend change therefore reaches
# NONE without a push, a CI wait, or a Browser Run session.
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
# Adoption is a fact about the repo, not a setting: `playwright-core` (or
# `playwright`, for earlier adopters) in the app's devDependencies IS the
# opt-in, exactly as adopting Cloudflare Access is the policy plus the code
# change rather than a flag somewhere. Before consent, silence is normal. After
# consent, silence is suspicious — so the same missing credential is NONE in one
# repo and UNKNOWN in the other.
#
# The browser is not on this machine: the runner attaches to Cloudflare Browser
# Run over CDP with the pack's CLOUDFLARE_API_TOKEN. So preflight verifies the
# credential (token present, account resolvable) where it used to verify a
# binary — there is no binary.
#
# This script NEVER installs anything. A missing dependency is a statement about
# what the repo chose, or a condition to report — never a condition to fix.
#
# Depends on: git, node (only when adopted), curl, and the repo's own
# playwright-core (or playwright).
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
  if [ -f "$root/package.json" ] && grep -Eq '"playwright(-core)?"' "$root/package.json"; then
    printf '%s' "$root"; return 0
  fi
  for dir in "$root"/*/; do
    base=$(basename "$dir")
    case "$base" in node_modules|.*) continue ;; esac
    if [ -f "$dir/package.json" ] && grep -Eq '"playwright(-core)?"' "$dir/package.json"; then
      printf '%s' "${dir%/}"; return 0
    fi
  done
  return 1
}

# Resolve the durable credential root from Git, never from a worktree host's
# directory convention. In a normal checkout git-dir == common-dir and the
# active root is already primary. A linked worktree's common dir is the primary
# checkout's .git directory.
resolve_primary_root() {
  local active_root="$1" git_dir common_dir primary_root resolved
  git_dir=$(git -C "$active_root" rev-parse --path-format=absolute --git-dir 2>/dev/null) || return 1
  common_dir=$(git -C "$active_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
  if [ "$git_dir" = "$common_dir" ]; then
    primary_root="$active_root"
  else
    primary_root=$(dirname "$common_dir")
  fi
  resolved=$(git -C "$primary_root" rev-parse --show-toplevel 2>/dev/null) || return 1
  [ "$resolved" = "$primary_root" ] || return 1
  printf '%s' "$primary_root"
}

# Exported values win. Missing values come from the primary worktree's ignored
# .env — the same durable store /wong-cloudflare provisions. Load only the
# allowlisted credentials the runner understands; never source arbitrary shell
# from a dotenv file and never print a value.
load_credentials() {
  local active_root="$1" primary_root env_file key value
  primary_root=$(resolve_primary_root "$active_root") || return 1
  env_file="$primary_root/.env"
  if [ -f "$env_file" ]; then
    for key in CLOUDFLARE_API_TOKEN CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET; do
      if [ -z "${!key:-}" ]; then
        value=$(grep -E "^${key}=" "$env_file" | head -1 | cut -d= -f2-)
        printf -v "$key" '%s' "$value"
      fi
    done
  fi
  export CLOUDFLARE_API_TOKEN CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET
}

# One API call, same route the pack uses. A token that lists no accounts is the
# lost-resources symptom, distinct from a missing token — both are UNKNOWN, but
# the remedy named differs.
resolve_account() {
  curl -s --max-time 15 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const r=JSON.parse(s);process.stdout.write(r.success&&r.result&&r.result[0]?r.result[0].id:"")}catch{}})' 2>/dev/null
}

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

case "$CMD" in
# ──────────────────────────────────────────────────────────────────────────────
# The cheap half of preflight: adoption only. Deliberately does NOT check the
# installed library, the token, the account, or the URL — those all describe
# whether a walk can *run*, and there is no point asking that before knowing
# whether there is anything to walk. Splitting them is what lets a backend-only
# change exit NONE for free.
scout-check)
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
  emit READY
  echo "APP_DIR=$APP_DIR"
  ;;

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

  # The library must be installed (npm install is the repo's own routine, not a
  # browser download — there is no browser on this machine to check for).
  LIB=$(cd "$APP_DIR" && node -e '
    try { require.resolve("playwright-core"); process.stdout.write("ok") }
    catch { try { require.resolve("playwright"); process.stdout.write("ok") } catch {} }
  ' 2>/dev/null)
  if [ -z "$LIB" ]; then
    emit UNKNOWN
    note "playwright-core is declared in $APP_DIR/package.json but not installed."
    note "Install the repo's own dependencies — this gate will not do it for you:"
    note "    (cd $APP_DIR && npm install)"
    exit 0
  fi

  # The browser is remote: Cloudflare Browser Run, reached with the pack's
  # token. Verify the credential where a binary used to be verified.
  load_credentials "$ROOT" || true
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    emit UNKNOWN
    note "no CLOUDFLARE_API_TOKEN — the walk's browser runs on Cloudflare Browser Run,"
    note "reached with the same token the stack pack provisions. No exported value or"
    note "durable primary-worktree .env value was found; see the secrets convention"
    note "and wiki/stack/cloudflare-credentials.md, then run /walk again."
    exit 0
  fi
  ACCOUNT_ID=$(resolve_account)
  if [ -z "$ACCOUNT_ID" ]; then
    emit UNKNOWN
    note "the token lists no accounts, so no Browser Run endpoint can be addressed."
    note "Re-run /wong-cloudflare to repair the token (a token that verifies but sees"
    note "no accounts is the lost-resources symptom), then run /walk again."
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
  echo "ACCOUNT_ID=$ACCOUNT_ID"
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

  # The runner needs the pack's token and the account id. Re-derive both here
  # rather than trusting the caller to thread them through — `run` may be
  # invoked from a different shell than preflight was.
  load_credentials "$ROOT" || true
  ACCOUNT_ID="${WALK_CF_ACCOUNT_ID:-$(resolve_account)}"

  WALK_URL="$URL" \
  WALK_CF_ACCOUNT_ID="$ACCOUNT_ID" \
  timeout "${BUDGET}m" node "$(dirname "${BASH_SOURCE[0]}")/walk-runner.mjs" "$RUN_DIR" "$APP_DIR"
  STATUS=$?

  case "$STATUS" in
    0)   emit WALKED; echo "EVIDENCE=$RUN_DIR/evidence.json" ;;
    124) emit TIMEOUT; note "the walk exceeded its ${BUDGET}-minute budget" ;;
    # The runner exits 3 when it recognised a Cloudflare Access challenge. That
    # case is worth its own exit code because it is the one failure that would
    # otherwise look like success: without the check, the walk screenshots a
    # login form and a grader could read "a page rendered" as a pass.
    # Exit 3 and exit 4 are the two blocks /walk can resolve itself with the
    # token it already holds, so each is reported here as a *cause*, not as a
    # dead end. The skill mints (3) or widens (4), retries once, and only then
    # reports UNKNOWN. Keeping the diagnosis in the script and the repair in the
    # skill is deliberate: the script stays credential-free and side-effect-free.
    3)   emit UNKNOWN
         note "the preview answered with a Cloudflare Access login challenge."
         note "BLOCK=access-challenge — /walk mints a service token and retries once."
         note "If it has already retried: reporting UNVERIFIED rather than grading a"
         note "login page (see wiki/stack/cloudflare-access.md)." ;;
    4)   emit UNKNOWN
         note "Cloudflare Browser Run refused the token, so no browser session could open."
         note "BLOCK=browser-run-refused — /walk widens the token and retries once."
         note "If it has already retried: the widen did not take, or the plan's browser"
         note "budget is spent (free: ~10 browser-min/day). Nothing was walked." ;;
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
  echo "usage: walk-staging.sh {scout-check|preflight|run <run-dir> <app-dir> <url> [minutes]|publish <run-dir>|cleanup <run-dir>}" >&2
  exit 1
  ;;
esac
