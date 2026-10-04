#!/usr/bin/env bash
# One look at the live app after a merge: did the release land, and does the
# app open? `/ship` runs it once, after `merge.sh`.
#
#   live-look.sh <merged-commit-sha>
#
# It only looks. The one request it sends to the live app is a GET, so it never
# saves, sends, or buys anything there. It prints, and always exits 0:
#
#   LIVE_LOOK=ok       the release landed and the live app answered
#   LIVE_LOOK=failed   the release failed, or the live app answered with an error
#   LIVE_LOOK=unknown  the look could not run; one line in the report, never a
#                      failed ship
#   REASON=<plain words>
#   URL=<the live address>     when one was found
#
# ── Where the release and its address come from ───────────────────────────────
# 1. The `production` GitHub Deployment `deploy.yml` records on the merged
#    commit: its outcome, and the address wrangler printed. Polled for up to
#    ten minutes, because the release starts only after the merge.
# 2. Else the deploy run for the commit. A failed run is a failed release. A run
#    whose Deploy step was skipped released nothing (a docs-only merge). A run
#    that deployed but recorded no address falls back to the production site
#    the memory store records.
#
# The address is never built from a naming pattern: a constructed address can
# answer for an app this merge never released.
#
# A redirect to a login, or a refusal with no access token on this machine, is
# `unknown`: the app may be fine behind its login. The Access token, when the
# primary checkout's .env holds one, goes only to the recorded address, and the
# request follows no redirect, so it goes nowhere else.
#
# Depends on: git, gh (GitHub installs only), curl; node to tell the route and to
# read .env and the memory store.
set -uo pipefail

SHA="${1:-}"
case "$SHA" in
  ''|*[!0-9a-f]*) echo "usage: live-look.sh <merged-commit-sha>" >&2; exit 1 ;;
esac
WAIT="${LIVE_LOOK_WAIT_SECONDS:-600}"
POLL="${LIVE_LOOK_POLL_SECONDS:-15}"
URL=""

say() {
  echo "LIVE_LOOK=$1"
  echo "REASON=$2"
  if [ -n "$URL" ]; then echo "URL=$URL"; fi
  exit 0
}

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || say unknown "not inside a repository"
LIB="$ROOT/.claude/skills/memory/scripts/lib"
SAVE_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../save/scripts"
ROUTE=$(node "$SAVE_SCRIPTS/delivery-route.mjs" "$ROOT" 2>/dev/null) || say unknown "the delivery route could not be told"
if [ "$ROUTE" != artifacts ]; then
  [ -f "$ROOT/.github/workflows/deploy.yml" ] || say unknown "this repo records no release to wait for"
  REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null) || REPO=""
  [ -n "$REPO" ] || say unknown "GitHub could not be asked about the release"
fi

# The Access pair from the primary checkout's .env, unless already exported.
# Read through the memory skill's parser; a value is never printed.
load_access_token() {
  local primary line key
  primary=$(node "$LIB/primary-root.mjs" "$ROOT" 2>/dev/null) || return 0
  [ -f "$primary/.env" ] || return 0
  while IFS= read -r line; do
    key="${line%%=*}"
    [ -z "${!key:-}" ] && printf -v "$key" '%s' "${line#*=}"
  done < <(node --input-type=module -e '
    const [store, file, ...keys] = process.argv.slice(1);
    const { parseEnv } = await import((await import("node:url")).pathToFileURL(store));
    const env = parseEnv((await import("node:fs")).readFileSync(file, "utf8"));
    for (const key of keys) if (env[key]) console.log(`${key}=${env[key]}`);
  ' "$LIB/store.mjs" "$primary/.env" CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET 2>/dev/null)
}

# The production site the memory store records, or nothing.
recorded_origin() {
  node --input-type=module -e '
    const [store, root] = process.argv.slice(1);
    const { loadConfig, repoContext } = await import((await import("node:url")).pathToFileURL(store));
    const worker = loadConfig(repoContext(root)).worker;
    if (worker) console.log(new URL(worker).origin);
  ' "$LIB/store.mjs" "$ROOT" 2>/dev/null
}

# Every status of the commit's production deployments: "<state><TAB><address>".
release_statuses() {
  local id
  for id in $(gh api "repos/$REPO/deployments?sha=$SHA&environment=production&per_page=20" --jq '.[].id' 2>/dev/null); do
    gh api "repos/$REPO/deployments/$id/statuses" --jq '.[] | "\(.state)\t\(.environment_url // "")"' 2>/dev/null
  done
}

# Wait for the release. Leaves with URL set, or says why there is no look.
# An Artifacts install: main's check run for the merged commit is the release,
# and carries the address its deploy reported (wiki/stack/artifacts-route.md).
if [ "$ROUTE" = artifacts ]; then
  LIVE=$(cd "$ROOT" && node "$SAVE_SCRIPTS/artifacts-run.mjs" live "$SHA" 2>/dev/null) || LIVE=unknown
  case "$LIVE" in
    https://*) URL=$LIVE ;;
    failed) say failed "the release did not finish: its checks or deploy failed" ;;
    none) say unknown "nothing was released" ;;
    *) say unknown "the release could not be read" ;;
  esac
fi
DEADLINE=$(( $(date +%s) + WAIT ))
while [ -z "$URL" ]; do
  STATUSES=$(release_statuses)
  URL=$(printf '%s\n' "$STATUSES" | awk -F'\t' '$1 == "success" && $2 != "" { print $2; exit }')
  [ -n "$URL" ] && break
  if printf '%s\n' "$STATUSES" | grep -qE '^(failure|error)'; then
    say failed "the release did not finish: its deploy failed"
  fi
  RUN=$(gh run list --commit "$SHA" --workflow deploy.yml --limit 1 --json databaseId,status,conclusion \
    --jq '.[0] | select(. != null) | "\(.databaseId)\t\(.status)\t\(.conclusion)"' 2>/dev/null) || RUN=""
  IFS=$'\t' read -r RUN_ID RUN_STATUS RUN_CONCLUSION <<< "$RUN"
  if [ "${RUN_STATUS:-}" = completed ]; then
    case "$RUN_CONCLUSION" in
      success) ;;
      failure|timed_out|startup_failure) say failed "the release did not finish: its deploy run failed" ;;
      *) say unknown "the release's deploy run ended as '$RUN_CONCLUSION'" ;;
    esac
    DEPLOYED=$(gh run view "$RUN_ID" --json jobs --jq '.jobs[].steps[] | select(.name == "Deploy") | .conclusion' 2>/dev/null | head -1)
    [ "$DEPLOYED" = success ] || say unknown "nothing was released"
    URL=$(recorded_origin)
    [ -n "$URL" ] && break
    say unknown "the release landed, but no live address was recorded"
  fi
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    say unknown "the release had not landed after $(( WAIT / 60 )) minutes"
  fi
  sleep "$POLL"
done

# One GET, no redirect followed.
load_access_token
HEADERS=()
TOKEN=no
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
  TOKEN=yes
  HEADERS=(-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
fi
ANSWER=$(curl -sS -o /dev/null --max-time 30 ${HEADERS[@]+"${HEADERS[@]}"} -w '%{http_code}\t%{redirect_url}' "$URL" 2>/dev/null) || ANSWER=$'000\t'
CODE="${ANSWER%%$'\t'*}"
TARGET="${ANSWER#*$'\t'}"

case "$CODE" in
  2??) say ok "the release landed and the live app opens" ;;
  3??)
    case "$TARGET" in
      *cloudflareaccess.com*|*/cdn-cgi/access/*|*[Ll]ogin*|*[Ss]ign[-_]in*|*[Ss]ignin*)
        if [ "$TOKEN" = yes ]; then say unknown "the release landed, but the live app's login refused this machine's access token"; fi
        say unknown "the release landed, but the live app is behind a login and this machine has no access token" ;;
      *) say ok "the release landed and the live app answers" ;;
    esac ;;
  401|403)
    if [ "$TOKEN" = yes ]; then say failed "the live app refused the request (HTTP $CODE)"; fi
    say unknown "the release landed, but the live app is behind a login and this machine has no access token" ;;
  000) say failed "the live app did not answer" ;;
  *) say failed "the live app answered with an error (HTTP $CODE)" ;;
esac
