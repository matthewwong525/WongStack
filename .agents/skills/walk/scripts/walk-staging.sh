#!/usr/bin/env bash
# The staging walkthrough's plumbing: everything about a walk that must be the
# same every time, so the only thing the agent authors per run is the journeys
# themselves.
#
# `/walk` calls this, in four phases:
#
#   walk-staging.sh scout-check          → can a walk start at all? (no network)
#   walk-staging.sh preflight            → can we walk, and what do we walk?
#   walk-staging.sh run <run-dir> <url>  → drive the journeys, capture evidence
#   walk-staging.sh cleanup <run-dir>    → leave no trace
#
# `scout-check` exists so that "there is nothing to walk" costs nothing. It
# answers the one question the scout needs before spending anything — are we in
# a repository whose change we can read — while touching no credential, no API,
# and no network. The skill runs it first, scouts the change's scenarios, and
# only spends /save and preflight once it knows at least one journey exists. A
# pure-backend change therefore reaches NONE without a push, a CI wait, or a
# browser.
#
# ── What this script does NOT do ──────────────────────────────────────────────
# It never decides whether a journey passed. It captures evidence; `/walk` reads
# that evidence against the scenario's written THEN. So this script prints
# NONE / UNKNOWN / TIMEOUT / READY / WALKED and deliberately never prints
# SUCCESS or FAILURE — those two words belong to the grader, and printing them
# here would let a run *look* graded when nothing had judged it.
#
#   RESULT: NONE     — there is nothing to walk.
#   RESULT: READY    — preflight passed; the facts below say where to walk.
#   RESULT: WALKED   — every journey ran and its evidence is on disk.
#   RESULT: UNKNOWN  — the walk could not run or could not be trusted (no
#                      browser, no URL, unreachable staging, an Access
#                      challenge). UNVERIFIED, which is not the same as "there
#                      was nothing to walk" — /walk must report it as such.
#   RESULT: TIMEOUT  — the walk did not finish inside its budget.
#
# After RESULT come indented human lines, then KEY=VALUE facts for the caller.
#
# ── There is no adoption to detect ────────────────────────────────────────────
# The walk used to read `playwright-core` in the app's devDependencies as the
# repo's consent, because nothing would install it. The browser is now
# `agent-browser`, a standalone CLI installed on the machine and never added to
# the repository, so there is no repo state left to read — and no need for one.
# NONE now means exactly one thing: this change has no browser-observable
# scenarios. It never means "this repo did not opt in".
#
# This script DOES install its own tool, and says so. It never installs a
# language runtime: that still asks first, per the toolchain convention.
#
# Depends on: git, agent-browser. (`publish` additionally uses wrangler, and is
# optional and stack-pack-only — nothing else here needs it.)
set -uo pipefail

CMD="${1:-preflight}"

emit() { echo "RESULT: $1"; }
note() { echo "  $*"; }

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
# allowlisted credentials the walk understands; never source arbitrary shell
# from a dotenv file and never print a value. All three are optional: they
# matter only when the preview sits behind Cloudflare Access.
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

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

case "$CMD" in
# ──────────────────────────────────────────────────────────────────────────────
# The cheap half of preflight. Deliberately does NOT check the browser, install
# anything, or look for a URL — those all describe whether a walk can *run*, and
# there is no point asking that before knowing whether there is anything to
# walk. Splitting them is what lets a backend-only change exit NONE for free.
scout-check)
  if [ -z "$ROOT" ]; then
    emit UNKNOWN; note "not inside a git repository"; exit 0
  fi
  emit READY
  echo "ROOT=$ROOT"
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

  # The browser is a tool on this machine, so install it when it is missing
  # rather than reporting its absence. Nothing about this touches the
  # repository: no manifest, no dependency entry, no lockfile.
  INSTALLED=""
  if ! command -v agent-browser >/dev/null 2>&1; then
    if ! command -v npm >/dev/null 2>&1; then
      emit UNKNOWN
      note "agent-browser is not installed and no installer is available on this machine."
      note "Install it with one of: npm i -g agent-browser · brew install agent-browser ·"
      note "cargo install agent-browser — then run /walk again."
      exit 0
    fi
    npm install -g agent-browser >/dev/null 2>&1
    INSTALLED="agent-browser"
    if ! command -v agent-browser >/dev/null 2>&1; then
      emit UNKNOWN
      note "installing agent-browser failed; nothing was walked."
      exit 0
    fi
  fi

  # `doctor` is a real check, not a version string: it launches a browser
  # headlessly. That is why preflight can promise the walk will have a browser
  # instead of discovering otherwise three journeys in.
  if ! agent-browser doctor --json >/dev/null 2>&1; then
    agent-browser install --with-deps >/dev/null 2>&1
    INSTALLED="${INSTALLED:+$INSTALLED and }Chrome"
    if ! agent-browser doctor --json >/dev/null 2>&1; then
      emit UNKNOWN
      note "no browser could be obtained — agent-browser's own environment check failed."
      note "Run 'agent-browser doctor' to see which check failed. Nothing was walked."
      exit 0
    fi
  fi

  # The URL is discovered, never configured or guessed. preview-url.sh reads the
  # deployment/status/check/comment that the deploy actually published for THIS
  # commit, so a green CI run is what makes this line succeed. Constructing a URL
  # by hand from a naming convention would silently walk the wrong commit — or a
  # URL that was never deployed at all.
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
  echo "URL=$URL"
  echo "RUN_DIR=$RUN_DIR"
  echo "SHA=$(git rev-parse HEAD)"
  echo "BROWSER=local ($(agent-browser --version 2>/dev/null | head -1))"
  [ -n "$INSTALLED" ] && echo "INSTALLED=$INSTALLED"
  ;;

# ──────────────────────────────────────────────────────────────────────────────
run)
  RUN_DIR="${2:-}"
  URL="${3:-}"
  BUDGET="${4:-10}"   # minutes
  if [ -z "$RUN_DIR" ] || [ -z "$URL" ]; then
    emit UNKNOWN; note "usage: walk-staging.sh run <run-dir> <url> [budget-minutes]"; exit 0
  fi
  if ! ls "$RUN_DIR"/journeys/*.batch.json >/dev/null 2>&1; then
    # Preflight succeeded but the scout found nothing browser-observable. That's
    # a real answer, not a failure: a change whose scenarios all live off the
    # request path (a queue consumer, a cron) has nothing a browser can see.
    emit NONE
    note "no journeys were written — nothing browser-observable in this change"
    exit 0
  fi

  # Access credentials are re-derived here rather than threaded through from
  # preflight — `run` may be invoked from a different shell.
  load_credentials "$ROOT" || true

  WALK_URL="$URL" \
  timeout "${BUDGET}m" bash "$(dirname "${BASH_SOURCE[0]}")/walk-runner.sh" "$RUN_DIR"
  STATUS=$?

  case "$STATUS" in
    0)   emit WALKED
         echo "EVIDENCE=$RUN_DIR/evidence"
         echo "BROWSER=local" ;;
    124) emit TIMEOUT; note "the walk exceeded its ${BUDGET}-minute budget" ;;
    # The driver exits 3 when it recognised a Cloudflare Access challenge. That
    # case is worth its own exit code because it is the one failure that would
    # otherwise look like success: without the check, the walk screenshots a
    # login form and a grader could read "a page rendered" as a pass.
    # It is reported here as a *cause*, not as a dead end: where a Cloudflare
    # API token exists, the skill mints a service token, retries once, and only
    # then reports UNKNOWN. Keeping the diagnosis in the script and the repair
    # in the skill is deliberate — the script stays side-effect-free.
    3)   emit UNKNOWN
         note "the preview answered with a Cloudflare Access login challenge."
         note "BLOCK=access-challenge — with a Cloudflare API token, /walk mints a"
         note "service token and retries once. Without one the heal is unavailable."
         note "Either way this is UNVERIFIED, never a graded login page." ;;
    *)   emit UNKNOWN; note "the driver exited $STATUS before finishing" ;;
  esac
  ;;

# ──────────────────────────────────────────────────────────────────────────────
# Optional, and stack-pack-only. Uploads the run's screenshots to a public
# bucket so the PR comment can show them instead of naming local paths, and
# prints a `<local-path><TAB><public-url>` line per file for the caller to
# substitute.
#
# Nothing depends on this. With no bucket configured the comment cites local
# paths, which is a rung down, not a failure — the prose carries the record and
# the pictures only corroborate it.
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
  done < <(find "$RUN_DIR/evidence" -type f -name '*.png' 2>/dev/null)
  # A failed upload costs the pictures, never the verdict: the judgement was
  # already made from evidence on disk, and the written comment stands alone.
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
  echo "usage: walk-staging.sh {scout-check|preflight|run <run-dir> <url> [minutes]|publish <run-dir>|cleanup <run-dir>}" >&2
  exit 1
  ;;
esac
