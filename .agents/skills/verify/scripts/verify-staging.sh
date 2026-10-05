#!/usr/bin/env bash
# The staging walkthrough's plumbing: everything about a walk that must be the
# same every time, so the only thing the agent authors per run is the journeys
# themselves.
#
# `/verify` calls this, in five phases:
#
#   verify-staging.sh scout-check          → can a walk start at all? (no network)
#   verify-staging.sh preflight [--no-browser] [--no-preview]
#                                          → can we walk, and what do we walk?
#   verify-staging.sh run <run-dir> <url>  → drive the journeys, capture evidence
#   verify-staging.sh publish <run-dir>    → keep the screenshots, or say why not
#   verify-staging.sh cleanup <run-dir>    → leave no trace, give the turn back
#
# and, for a walk that already ran:
#
#   verify-staging.sh pictures <pr>        → fetch that walk's kept screenshots
#
# and, for the staging turn on its own (preflight and cleanup already do both):
#
#   verify-staging.sh turn take            → wait for the turn, then hold it
#   verify-staging.sh turn give <commit>   → give back the turn `take` printed
#
# `scout-check` exists so that "there is nothing to walk" costs nothing. It
# answers the one question the scout needs before spending anything — are we in
# a repository whose change we can read — while touching no credential, no API,
# and no network. The skill runs it first, scouts the change's scenarios into
# probes (browser journeys, request probes, state probes), and only spends
# /save and preflight once it knows at least one journey exists. A change with
# no probe-reachable scenario therefore reaches NONE without a push, a CI wait,
# or a browser.
#
# `--no-browser` on preflight: an all-probe walk (requests and state reads
# only) needs no browser, so the flag skips the agent-browser install and
# check rather than failing the walk over a tool it will not use.
# `--no-preview --no-browser` prepares the same owned run folder for CI
# evidence only, without looking up a URL or obtaining browser tools.
#
# ── One walk at a time, from the same data ────────────────────────────────────
# Every branch shares one staging database. In a repo that has one, a preflight
# with a preview takes the repository's staging turn, rebuilds staging from the
# checked-in seed, and prints three more facts:
#
#   TURN=held | timeout | unavailable <why>
#   SEEDED=yes | no <why>      was staging rebuilt from the seed for this walk?
#   PLAYGROUND=yes | no        is every stateful staging binding its own twin,
#                              and the staging database not production's?
#
# The turn is the ref `refs/wong/staging-turn` on `origin`: the one store every
# machine already shares. Taking it is a create-only push, which the remote
# applies atomically, so two walks can not both hold it. `cleanup` gives it
# back; a turn its holder never gave back (a crashed walk) is taken over once
# it is older than the walk's budget plus five minutes. A `timeout` leaves
# staging alone, so its checks are unverified. `unavailable` (no remote, or a
# host that refuses the ref) still rebuilds and walks, without a turn.
# `--no-preview` touches no staging: no turn, no rebuild, none of these facts.
#
# ── What this script does NOT do ──────────────────────────────────────────────
# It never decides whether a journey passed. It captures evidence; `/verify`
# reads that evidence against the scenario's written THEN. So this script
# prints NONE / UNKNOWN / TIMEOUT / READY / WALKED and deliberately never
# prints SUCCESS or FAILURE — those two words belong to the grader, and
# printing them here would let a run *look* graded when nothing had judged it.
#
#   RESULT: NONE     — there is nothing to walk.
#   RESULT: READY    — preflight passed; the facts below say where to walk.
#   RESULT: WALKED   — every journey ran and its evidence is on disk.
#   RESULT: UNKNOWN  — the walk could not run or could not be trusted (no
#                      browser, no URL, unreachable staging, an Access
#                      challenge). UNVERIFIED, which is not the same as "there
#                      was nothing to walk" — /verify must report it as such.
#   RESULT: TIMEOUT  — the walk did not finish inside its budget.
#
# After RESULT come indented human lines, then KEY=VALUE facts for the caller.
# `run` and `publish` end with REDACTED=<n>: the number of files under the run
# folder that had a credential replaced, or `unknown` when the scrub could not
# run and the evidence must be read before it is posted.
#
# ── There is no adoption to detect ────────────────────────────────────────────
# The walk used to read `playwright-core` in the app's devDependencies as the
# repo's consent, because nothing would install it. The browser is now
# `agent-browser`, a standalone CLI installed on the machine and never added to
# the repository, so there is no repo state left to read — and no need for one.
# NONE now means exactly one thing: this change has no scenario any probe can
# reach. It never means "this repo did not opt in".
#
# This script DOES install its own tool, and says so. It never installs a
# language runtime: that still asks first, per the toolchain convention.
#
# ── Where the screenshots go ──────────────────────────────────────────────────
# `publish` prints a `<local-path><TAB><url>` line per kept screenshot, then
# says how they were kept:
#
#   MEDIA=private  — kept by the production site at /_walk/, behind its login.
#                    The default: it needs no setting, only the memory store's
#                    bucket and the app's login.
#   MEDIA=public   — WALK_MEDIA_BUCKET is set: uploaded to that public bucket,
#                    so the comment can show them inline.
#   MEDIA=none     — nothing was kept. A REASON= line says why, in the words
#                    the comment repeats; with no REASON there was no
#                    screenshot to keep.
#
# `pictures <pr>` reads the kept links back out of a pull request's comments
# and downloads them into a fresh run directory, for `cleanup` to remove. The
# Access token goes only to the recorded production site, and is never printed.
#
# Depends on: git, curl, node; agent-browser only when a browser journey exists.
# (`pictures` additionally uses gh. The public-bucket path of `publish` uses
# wrangler and is stack-pack-only. Its WALK_MEDIA_* variables keep their
# historical names: renaming a variable users already set breaks them silently.)
set -uo pipefail

CMD="${1:-preflight}"

emit() { echo "RESULT: $1"; }
note() { echo "  $*"; }

# Resolve the durable credential root from Git, never from a worktree host's
# directory convention, through the memory skill's shared lookup.
resolve_primary_root() {
  node "$1/.claude/skills/memory/scripts/lib/primary-root.mjs" "$1" 2>/dev/null
}

# Exported values win. Missing values come from the primary worktree's ignored
# .env — the same durable store setup's provisioning writes. Load only the
# allowlisted credentials the walk understands; never source arbitrary shell
# from a dotenv file and never print a value. All are optional: the Access pair
# matters only when the preview sits behind Cloudflare Access, and the account
# id only to the staging rebuild. The memory
# skill's parser reads the file, so quotes, `export`, and CRLF mean the same
# thing here as there.
load_credentials() {
  local active_root="$1" primary_root env_file line key
  primary_root=$(resolve_primary_root "$active_root") || return 1
  env_file="$primary_root/.env"
  if [ -f "$env_file" ]; then
    while IFS= read -r line; do
      key="${line%%=*}"
      [ -z "${!key:-}" ] && printf -v "$key" '%s' "${line#*=}"
    done < <(node --input-type=module -e '
      const [store, file, ...keys] = process.argv.slice(1);
      const { parseEnv } = await import((await import("node:url")).pathToFileURL(store));
      const env = parseEnv((await import("node:fs")).readFileSync(file, "utf8"));
      for (const key of keys) if (env[key]) console.log(`${key}=${env[key]}`);
    ' "$active_root/.claude/skills/memory/scripts/lib/store.mjs" "$env_file" \
      CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET)
  fi
  export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET
}

has_access_token() { [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; }

# The production site's address: the Worker the memory store records, read
# through the memory skill so a linked worktree gets the primary checkout's.
# Prints nothing when no store is recorded.
production_origin() {
  node --input-type=module -e '
    const [store, root] = process.argv.slice(1);
    const { loadConfig, repoContext } = await import((await import("node:url")).pathToFileURL(store));
    const worker = loadConfig(repoContext(root)).worker;
    if (worker) console.log(new URL(worker).origin);
  ' "$1/.claude/skills/memory/scripts/lib/store.mjs" "$1" 2>/dev/null
}

# The names the picture route keeps (.claude/skills/verify/worker/walk-pictures.mjs).
# Checked here too, so a path the route would not keep is never sent.
WALK_NAME='[a-z0-9][a-z0-9._-]*'
WALK_FILE="^$WALK_NAME/$WALK_NAME\\.png\$"
WALK_KEPT="^[0-9a-f]{7,40}/[0-9]{8}T[0-9]{6}Z/$WALK_NAME/$WALK_NAME\\.png\$"

# Why the site turned the first upload away, from its status and body.
refusal_reason() {
  case "$1:$2" in
    404:*no_bucket*) echo "the Cloudflare account has no storage (it needs a payment method)" ;;
    404:*no_login*)  echo "the site has no login yet, so pictures would be open to anyone" ;;
    401:*|403:*|30?:*) echo "the live site refused the access token" ;;
    000:*|5??:*)     echo "the live site did not answer" ;;
    # An older site hands /_walk/ to its page shell, which answers no JSON.
    *)               echo "the live site does not serve pictures yet (it does after the next publish)" ;;
  esac
}

# Keep the run's screenshots on the production site, behind its login. The
# first upload decides: when the site turns it away, nothing is kept and
# REASON says why. A later failure costs that picture only.
publish_private() {
  local run_dir="$1" origin="" sha stamp f rel target out status kept=0 failed=0 reason=""
  if [ -z "$(find "$run_dir/evidence" -type f -name '*.png' 2>/dev/null | head -1)" ]; then
    emit NONE; note "no screenshot to keep"; echo "MEDIA=none"; return
  fi
  [ -n "$ROOT" ] && origin=$(production_origin "$ROOT")
  [ -n "$ROOT" ] && load_credentials "$ROOT"
  if [ -z "$origin" ]; then
    reason="no memory store is set up for this repo"
  elif ! has_access_token; then
    reason="this machine has no access token for the site"
  fi
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
  # One stamp per publish, so a repeat walk of this commit gets its own folder.
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  while [ -z "$reason" ] && IFS= read -r f; do
    rel="${f#"$run_dir"/evidence/}"
    if ! [[ "$rel" =~ $WALK_FILE ]]; then failed=$((failed + 1)); continue; fi
    target="$origin/_walk/$sha/$stamp/$rel"
    out=$(curl -sS --max-time 60 -X PUT --data-binary "@$f" -H 'Content-Type: image/png' \
      -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
      -w '\n%{http_code}' "$target" 2>/dev/null) || out=$'\n000'
    status="${out##*$'\n'}"
    case "$status" in
      201) printf '%s\t%s\n' "$f" "$target"; kept=$((kept + 1)) ;;
      # This picture only: already kept, too large, or not a PNG.
      409|413|415) failed=$((failed + 1)) ;;
      *) if [ "$kept" -eq 0 ]; then reason=$(refusal_reason "$status" "${out%$'\n'*}"); else failed=$((failed + 1)); fi ;;
    esac
  done < <(find "$run_dir/evidence" -type f -name '*.png' 2>/dev/null | sort)
  if [ "$kept" -eq 0 ]; then
    emit NONE
    echo "MEDIA=none"
    echo "REASON=${reason:-the live site took none of them (wrong name, too large, or not a picture)}"
    return
  fi
  # A picture that was not kept costs the picture, never the verdict.
  [ "$failed" -gt 0 ] && note "$failed picture(s) were not kept — leave them out of the comment"
  emit WALKED
  echo "MEDIA=private"
}

# Replace credentials in every text file under the run folder, so nothing that is
# posted or uploaded from it carries one. The runner adds the Access token to
# every request, so a journey that lists the browser's requests copies the token
# into its evidence. The memory skill's scrub does the replacing: every .env
# value, the walk's own credentials, and token-shaped strings. Each value is
# also matched the way JSON writes it, because most evidence is JSON. A file
# with a NUL byte is a picture and is left alone, and so is a link, which could
# point outside the folder.
#
# Sets REDACTED to the number of files changed; it stays empty when the scrub
# could not run, and the caller prints that as `unknown`. Never prints a value:
# node's own errors are dropped too, since one could quote what it was matching.
scrub() {
  REDACTED=$(node --input-type=module -e '
    import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
    import { join } from "node:path";
    import { pathToFileURL } from "node:url";
    const [lib, runDir] = process.argv.slice(1);
    const load = name => import(pathToFileURL(join(lib, name)));
    const { redact, secretValues } = await load("scan.mjs");
    const { loadEnv, repoContext } = await load("store.mjs");
    let env = {};
    try { env = loadEnv(repoContext()); } catch { /* not in a checkout: no .env to read */ }
    const walk = ["CLOUDFLARE_API_TOKEN", "CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET"].map(key => process.env[key]);
    const known = [...Object.values(env), ...walk].filter(value => typeof value === "string");
    const values = secretValues(known.flatMap(value => [value, JSON.stringify(value).slice(1, -1)]));
    let changed = 0;
    for (const name of readdirSync(runDir, { recursive: true })) {
      const file = join(runDir, name);
      if (!lstatSync(file).isFile()) continue;
      const bytes = readFileSync(file);
      if (bytes.includes(0)) continue;
      const text = bytes.toString("utf8");
      const clean = redact(text, values);
      if (clean === text) continue;
      writeFileSync(file, clean);
      changed += 1;
    }
    console.log(changed);
  ' "$(dirname "${BASH_SOURCE[0]}")/../../memory/scripts/lib" "$1" 2>/dev/null) || REDACTED=""
}
scrubbed() { echo "REDACTED=${REDACTED:-unknown}"; }

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

# ── The staging turn (see the header) ─────────────────────────────────────────
TURN_REF=refs/wong/staging-turn
TURN_EXPIRY="${WONG_TURN_EXPIRY_SECONDS:-900}"   # the walk's ten-minute budget, plus five
TURN_WAIT="${WONG_TURN_WAIT_SECONDS:-600}"       # no longer than a walk's budget
TURN_POLL="${WONG_TURN_POLL_SECONDS:-15}"

# Who holds a turn: this machine and this checkout, so a re-walk from the same
# place takes its own stale turn back at once instead of waiting for it.
turn_holder() { echo "holder: $(hostname 2>/dev/null || echo unknown):$ROOT"; }

# Point the remote's turn at <commit> (empty deletes it), only while the remote
# still holds <expected> (empty: only while nobody holds it).
turn_push() {
  git -C "$ROOT" push -q origin "$1:$TURN_REF" --force-with-lease="$TURN_REF:$2" >/dev/null 2>&1
}

# Sets TURN, and TURN_SHA when the turn is held.
turn_take() {
  local commit held deadline refused=0 age
  TURN_SHA=""
  if ! git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
    TURN="unavailable this repo has no remote to keep the turn on"; return
  fi
  # An empty commit that says who took the turn and, by its date, when.
  commit=$(printf 'staging turn\n\n%s\nbranch: %s\n' "$(turn_holder)" "$(git -C "$ROOT" branch --show-current 2>/dev/null)" \
    | GIT_AUTHOR_NAME=wong GIT_AUTHOR_EMAIL=wong@localhost GIT_COMMITTER_NAME=wong GIT_COMMITTER_EMAIL=wong@localhost \
      git -C "$ROOT" commit-tree "$(git -C "$ROOT" mktree </dev/null)" 2>/dev/null) || {
    TURN="unavailable the turn marker could not be made"; return
  }
  deadline=$(( $(date +%s) + TURN_WAIT ))
  while :; do
    if turn_push "$commit" ""; then TURN=held; TURN_SHA=$commit; return; fi
    if ! held=$(git -C "$ROOT" ls-remote origin "$TURN_REF" 2>/dev/null | cut -f1); then
      TURN="unavailable the remote did not answer"; return
    fi
    if [ -z "$held" ]; then
      # Free, yet the push failed: once is a race with a give, twice is a host
      # that will not keep the ref.
      refused=$((refused + 1))
      if [ "$refused" -ge 2 ]; then TURN="unavailable the remote refused the turn marker"; return; fi
      continue
    fi
    refused=0
    if git -C "$ROOT" fetch -q --no-tags origin "$held" 2>/dev/null || git -C "$ROOT" fetch -q --no-tags origin "$TURN_REF" 2>/dev/null; then
      age=$(( $(date +%s) - $(git -C "$ROOT" log -1 --format=%ct "$held" 2>/dev/null || date +%s) ))
      if [ "$age" -gt "$TURN_EXPIRY" ] || git -C "$ROOT" log -1 --format=%B "$held" 2>/dev/null | grep -qxF "$(turn_holder)"; then
        if turn_push "$commit" "$held"; then TURN=held; TURN_SHA=$commit; return; fi
      fi
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then TURN=timeout; return; fi
    sleep "$TURN_POLL"
  done
}

# Gives the turn back, only while the remote still holds <commit>: a turn
# another walk took over is theirs.
turn_give() { [ -n "${1:-}" ] && turn_push "" "$1"; }

# Before a walk with a preview: take the turn and rebuild staging from the
# seed, in a repo with a staging database of its own. Sets TURN, SEEDED and
# PLAYGROUND; keeps the held turn's commit in the run folder for `cleanup`.
prepare_staging() {
  local run_dir="$1" db
  TURN=""; PLAYGROUND=no
  SEEDED="no this repo has no staging database of its own to rebuild"
  [ -f "$ROOT/scripts/reset-staging-d1.mjs" ] || return 0
  # Empty when staging binds no database; fails when it binds production's.
  db=$(cd "$ROOT" && node scripts/lib-wrangler-config.mjs staging-database 2>/dev/null) || db=""
  [ -n "$db" ] || return 0
  # The binding half of the parity check: without a token it compares the
  # config alone, with no network call.
  if (cd "$ROOT" && env -u CLOUDFLARE_API_TOKEN node scripts/cf-secrets.mjs check >/dev/null 2>&1); then PLAYGROUND=yes; fi
  turn_take
  [ -n "$TURN_SHA" ] && printf '%s\n' "$TURN_SHA" > "$run_dir/staging-turn"
  if [ "$TURN" = timeout ]; then
    SEEDED="no another check held staging for the whole wait"; return 0
  fi
  load_credentials "$ROOT" || true
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    SEEDED="no this machine has no Cloudflare credential to rebuild staging with"; return 0
  fi
  # macOS ships no `timeout`; perl is on every Mac, and its alarm outlives the exec.
  local limit=(timeout 300)
  command -v timeout >/dev/null 2>&1 || limit=(perl -e 'alarm shift; exec @ARGV' 300)
  if (cd "$ROOT" && "${limit[@]}" node scripts/reset-staging-d1.mjs) >"$run_dir/staging-reset.log" 2>&1; then
    SEEDED=yes
  else
    SEEDED="no the staging rebuild failed (staging-reset.log in the run folder says why)"
  fi
}

case "$CMD" in
# ──────────────────────────────────────────────────────────────────────────────
# The cheap half of preflight. Deliberately does NOT check the browser, install
# anything, or look for a URL — those all describe whether a walk can *run*, and
# there is no point asking that before knowing whether there is anything to
# walk. Splitting them is what lets an unobservable change exit NONE for free.
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

  NEED_BROWSER=1
  NEED_PREVIEW=1
  for flag in "${@:2}"; do
    case "$flag" in
      --no-browser) NEED_BROWSER=0 ;;
      --no-preview) NEED_PREVIEW=0 ;;
      *) emit UNKNOWN; note "usage: verify-staging.sh preflight [--no-browser] [--no-preview]"; exit 0 ;;
    esac
  done
  if [ "$NEED_PREVIEW" -eq 0 ] && [ "$NEED_BROWSER" -eq 1 ]; then
    emit UNKNOWN; note "--no-preview requires --no-browser; deployed journeys need a preview."; exit 0
  fi
  SHA=$(git rev-parse --verify HEAD 2>/dev/null) || {
    emit UNKNOWN; note "no saved revision to verify"; exit 0
  }

  # The browser is a tool on this machine, so install it when it is missing
  # rather than reporting its absence — but only when a browser journey needs
  # it. Nothing about this touches the repository: no manifest, no dependency
  # entry, no lockfile.
  INSTALLED=""
  if [ "$NEED_BROWSER" -eq 1 ]; then
    if ! command -v agent-browser >/dev/null 2>&1; then
      if ! command -v npm >/dev/null 2>&1; then
        emit UNKNOWN
        note "agent-browser is not installed and no installer is available on this machine."
        note "Install it with one of: npm i -g agent-browser · brew install agent-browser ·"
        note "cargo install agent-browser — then run /verify again."
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
  fi

  # The URL is discovered, never configured or guessed. preview-url.sh reads the
  # deployment/status/check/comment that the deploy actually published for THIS
  # commit, so a green CI run is what makes this line succeed. Constructing a URL
  # by hand from a naming convention would silently walk the wrong commit — or a
  # URL that was never deployed at all.
  URL=""
  if [ "$NEED_PREVIEW" -eq 1 ]; then
    URL=$(bash "$ROOT/.claude/skills/save/scripts/preview-url.sh" 2>/dev/null | tail -1)
    case "$URL" in http*) ;; *) URL="" ;; esac   # anything that isn't a URL is no URL
    if [ -z "$URL" ]; then
      SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "this commit")
      emit UNKNOWN
      note "no preview URL for $SHORT — nothing to walk against."
      note "The deploy may not have published one yet, or this repo has no preview deploys."
      exit 0
    fi
  fi

  RUN_DIR=$(mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX") || {
    emit UNKNOWN; note "could not prepare a walkthrough run directory"; exit 0
  }
  if [ "$NEED_PREVIEW" -eq 1 ]; then prepare_staging "$RUN_DIR"; fi
  emit READY
  echo "URL=$URL"
  echo "RUN_DIR=$RUN_DIR"
  echo "SHA=$SHA"
  if [ "$NEED_BROWSER" -eq 1 ]; then
    echo "BROWSER=local ($(agent-browser --version 2>/dev/null | head -1))"
  else
    echo "BROWSER=none (not needed)"
  fi
  if [ -n "$INSTALLED" ]; then echo "INSTALLED=$INSTALLED"; fi
  if [ "$NEED_PREVIEW" -eq 1 ]; then
    if [ -n "$TURN" ]; then echo "TURN=$TURN"; fi
    echo "SEEDED=$SEEDED"
    echo "PLAYGROUND=$PLAYGROUND"
  fi
  ;;

# ──────────────────────────────────────────────────────────────────────────────
turn)
  if [ -z "$ROOT" ]; then
    emit UNKNOWN; note "not inside a git repository"; exit 0
  fi
  case "${2:-}" in
    take)
      turn_take
      echo "TURN=$TURN"
      if [ -n "$TURN_SHA" ]; then echo "TURN_SHA=$TURN_SHA"; fi
      ;;
    give)
      if turn_give "${3:-}"; then echo "TURN=given"; else echo "TURN=gone"; fi
      ;;
    *) echo "usage: verify-staging.sh turn take | turn give <commit>" >&2; exit 1 ;;
  esac
  ;;

# ──────────────────────────────────────────────────────────────────────────────
run)
  RUN_DIR="${2:-}"
  URL="${3:-}"
  BUDGET="${4:-10}"   # minutes
  if [ -z "$RUN_DIR" ] || [ -z "$URL" ]; then
    emit UNKNOWN; note "usage: verify-staging.sh run <run-dir> <url> [budget-minutes]"; exit 0
  fi
  if ! ls "$RUN_DIR"/journeys/*.batch.json >/dev/null 2>&1 \
     && ! ls "$RUN_DIR"/journeys/*.requests.txt >/dev/null 2>&1; then
    # Preflight succeeded but the scout wrote no journeys. That's a real
    # answer, not a failure: a change whose scenarios no probe can reach has
    # nothing to drive.
    emit NONE
    note "no journeys were written — no scenario any probe can reach in this change"
    exit 0
  fi

  # Access credentials are re-derived here rather than threaded through from
  # preflight — `run` may be invoked from a different shell.
  load_credentials "$ROOT" || true

  VERIFY_URL="$URL" \
  timeout "${BUDGET}m" bash "$(dirname "${BASH_SOURCE[0]}")/verify-runner.sh" "$RUN_DIR"
  STATUS=$?
  # Whatever the driver's exit, the evidence it left is on disk and may be read.
  scrub "$RUN_DIR"

  case "$STATUS" in
    0)   emit WALKED
         echo "EVIDENCE=$RUN_DIR/evidence"
         echo "BROWSER=local" ;;
    124) emit TIMEOUT; note "the walk exceeded its ${BUDGET}-minute budget" ;;
    # The driver exits 3 when it recognised a Cloudflare Access challenge. That
    # case is worth its own exit code because it is the one failure that would
    # otherwise look like success: without the check, the walk screenshots (or
    # curls) a login form and a grader could read "a page rendered" as a pass.
    # It is reported here as a *cause*, not as a dead end: where a Cloudflare
    # API token exists, the skill mints a service token, retries once, and only
    # then reports UNKNOWN. Keeping the diagnosis in the script and the repair
    # in the skill is deliberate — the script stays side-effect-free.
    3)   emit UNKNOWN
         note "the preview answered with a Cloudflare Access login challenge."
         note "BLOCK=access-challenge — with a Cloudflare API token, /verify mints a"
         note "service token and retries once. Without one the heal is unavailable."
         note "Either way this is UNVERIFIED, never a graded login page." ;;
    *)   emit UNKNOWN; note "the driver exited $STATUS before finishing" ;;
  esac
  scrubbed
  ;;

# ──────────────────────────────────────────────────────────────────────────────
# Keeps the run's screenshots where the PR comment can link them, and prints a
# `<local-path><TAB><url>` line per kept file for the caller to substitute,
# then MEDIA= (and REASON= when nothing was kept): see the header. Request- and
# state-probe evidence is text, quoted inline in the comment, and never
# uploaded.
#
# Nothing depends on this. Pictures that were not kept cost the pictures, never
# the verdict — the prose carries the record and the pictures only corroborate
# it. The comment then says why, and never names a local path: `cleanup`
# deletes those.
#
# With no WALK_MEDIA_BUCKET the production site keeps them privately. With one,
# the public-bucket path below runs as it always has, and is stack-pack-only.
publish)
  RUN_DIR="${2:-}"
  # Before the bucket check, so a walk with no bucket is scrubbed too: `publish`
  # is the one step every walk runs between writing its comment and posting it,
  # and state-probe evidence is written after `run` has already scrubbed.
  scrub "$RUN_DIR"
  if [ -z "${WALK_MEDIA_BUCKET:-}" ]; then
    publish_private "$RUN_DIR"; scrubbed; exit 0
  fi
  BASE="${WALK_MEDIA_BASE_URL:-}"
  if [ -z "$BASE" ]; then
    emit UNKNOWN
    note "WALK_MEDIA_BUCKET is set but WALK_MEDIA_BASE_URL is not — an uploaded"
    note "object with no public base URL cannot be linked. See .env.example."
    echo "MEDIA=none"
    echo "REASON=the public picture folder has no web address set (WALK_MEDIA_BASE_URL)"
    scrubbed
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
    note "$FAILED file(s) failed to upload — leave them out of the comment"
  fi
  emit WALKED
  echo "MEDIA=public"
  scrubbed
  ;;

# ──────────────────────────────────────────────────────────────────────────────
# A past walk's kept screenshots, found from the links in the pull request's
# comments: the comment already lists them, so there is no separate index.
# Prints a `<local-path><TAB><label>` line per downloaded file, then RUN_DIR=
# for `cleanup`.
#
#   RESULT: WALKED   — at least one picture is on disk.
#   RESULT: NONE     — the comments link no kept picture.
#   RESULT: UNKNOWN  — the links exist but could not be fetched.
pictures)
  PR="${2:-}"
  case "$PR" in
    ''|*[!0-9]*) emit UNKNOWN; note "usage: verify-staging.sh pictures <pr-number>"; exit 0 ;;
  esac
  ORIGIN=""
  [ -n "$ROOT" ] && ORIGIN=$(production_origin "$ROOT")
  if [ -z "$ORIGIN" ]; then
    emit UNKNOWN; note "no memory store is set up for this repo, so no kept picture can be found"; exit 0
  fi
  if ! BODIES=$(gh pr view "$PR" --json comments --jq '.comments[].body' 2>/dev/null); then
    emit UNKNOWN; note "could not read the comments on pull request #$PR"; exit 0
  fi
  # Only a link on the recorded production site is followed, so a crafted
  # comment can not send the Access token to another host.
  WANTED=()
  while IFS= read -r link; do
    URL="${link##*](}"; URL="${URL%)}"
    REL="${URL#"$ORIGIN"/_walk/}"
    LABEL="${link#[}"; LABEL="${LABEL%%](*}"
    [ "$REL" != "$URL" ] && [[ "$REL" =~ $WALK_KEPT ]] && WANTED+=("$REL"$'\t'"$LABEL")
  done < <(printf '%s\n' "$BODIES" | grep -oE '\[[^]]*\]\([^)[:space:]]*/_walk/[^)[:space:]]*\)')
  if [ "${#WANTED[@]}" -eq 0 ]; then
    emit NONE; note "no check on pull request #$PR kept a picture"; exit 0
  fi
  load_credentials "$ROOT"
  if ! has_access_token; then
    emit UNKNOWN; note "this machine has no access token for the site"; exit 0
  fi
  RUN_DIR=$(mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX")
  GOT=0
  ANSWER=""
  for want in "${WANTED[@]}"; do
    REL="${want%%$'\t'*}"
    FILE="$RUN_DIR/evidence/$REL"
    [ -e "$FILE" ] && continue   # the same link, quoted twice
    mkdir -p "$(dirname "$FILE")"
    ANSWER=$(curl -sS --max-time 60 -o "$FILE" -w '%{http_code} %{content_type}' \
      -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
      "$ORIGIN/_walk/$REL" 2>/dev/null) || ANSWER="000"
    if [ "$ANSWER" = "200 image/png" ]; then
      printf '%s\t%s\n' "$FILE" "${want#*$'\t'}"; GOT=$((GOT + 1))
    else
      rm -f "$FILE"
    fi
  done
  if [ "$GOT" -gt 0 ]; then
    emit WALKED
  else
    emit UNKNOWN; note "the live site did not return the pictures (HTTP ${ANSWER%% *})"
  fi
  echo "RUN_DIR=$RUN_DIR"
  ;;

# ──────────────────────────────────────────────────────────────────────────────
cleanup)
  RUN_DIR="${2:-}"
  # Only ever remove a directory this script could have made: an existing
  # directory directly inside the system temp dir, judged after realpath has
  # resolved `..` and symlinks, so `$HOME/wong-verify-x`, a `..` climb, or a
  # wong-verify-* link pointing elsewhere is refused and nothing is removed.
  # Nothing the walkthrough writes has ever been inside the repo, so there is
  # nothing here that could touch the working tree even if this were wrong.
  # The wong-walk-* pattern is accepted alongside wong-verify-* so a run
  # directory left by the previous skill name can still be cleaned.
  REAL=$(realpath -- "$RUN_DIR" 2>/dev/null) || REAL=""
  TMP_ROOT=$(realpath -- "${TMPDIR:-/tmp}" 2>/dev/null) || TMP_ROOT=""
  case "${REAL##*/}" in wong-verify-*|wong-walk-*) OURS=1 ;; *) OURS=0 ;; esac
  if [ "$OURS" = 1 ] && [ -n "$TMP_ROOT" ] && [ -d "$REAL" ] && [ "$(dirname -- "$REAL")" = "$TMP_ROOT" ]; then
    # The walk's staging turn, when preflight took one. A turn that can not be
    # given back here expires on its own.
    if [ -n "$ROOT" ] && [ -s "$REAL/staging-turn" ]; then turn_give "$(head -1 "$REAL/staging-turn")" || true; fi
    rm -rf -- "$REAL"; echo "cleaned $RUN_DIR"
  else
    echo "refusing to remove '$RUN_DIR' — not a walkthrough run directory in ${TMP_ROOT:-the temp dir}" >&2; exit 1
  fi
  ;;

*)
  echo "usage: verify-staging.sh {scout-check|preflight [--no-browser] [--no-preview]|run <run-dir> <url> [minutes]|publish <run-dir>|pictures <pr>|turn take|turn give <commit>|cleanup <run-dir>}" >&2
  exit 1
  ;;
esac
