#!/usr/bin/env bash
# The walkthrough driver.
#
# It owns the few things about driving the probes that must not vary between
# runs — staging Access headers, giving each browser journey its own session,
# storing the tools' structured output, and recognising a login wall. What it
# does NOT own is the journeys: those are written per run by /verify's scout
# into <run-dir>/journeys/, and deleted with the run directory.
#
# Two probe kinds run here, in journey order:
#
#   <id>.batch.json     browser journey — the ordered agent-browser commands,
#                       screenshots included, as a JSON array
#   <id>.requests.txt   request probe — one HTTP step per line, tab-separated:
#                       METHOD <TAB> path-or-url [<TAB> JSON body]
#
# plus <id>.meta.json ({ requirement, scenario, probe, then }) for the GRADER,
# not for this script: `then` is carried verbatim from the OpenSpec scenario so
# the judgement is made against the author's words rather than a paraphrase
# invented at walk time. State-probe reads (existing commands against deployed
# state) are performed by the skill after this driver returns — they are the
# repo's own commands, not plumbing that belongs here.
#
# The browser is `agent-browser` (https://github.com/vercel-labs/agent-browser),
# a standalone CLI that carries its own Chrome. It is installed on the MACHINE,
# never added to the repository — that is what lets a repo in any language walk
# without gaining a toolchain it does not otherwise use, and it is why this
# driver is shell rather than a language runtime's script. Request probes need
# only curl, so a walk with no browser journeys runs with no browser at all.
#
# The batch file is fed to `agent-browser batch` unread — this driver never
# parses it, so there is nothing between what the scout wrote and what runs.
# `--bail` stops the batch at the first failing command, so a journey that
# breaks early leaves the evidence it did produce plus the failure — which is
# exactly what the walk exists to surface. A request probe records every
# response as evidence; a "failing" status code is evidence too, never a bail.
#
# Exit codes: 0 every journey attempted · 2 driver could not start
#             3 Cloudflare Access challenge (UNVERIFIED, not a failing page)
set -uo pipefail

RUN_DIR="${1:-}"
URL_UNDER_TEST="${VERIFY_URL:-}"

if [ -z "$RUN_DIR" ] || [ -z "$URL_UNDER_TEST" ]; then
  echo "verify-runner: need <run-dir> and VERIFY_URL" >&2
  exit 2
fi

JOURNEYS="$RUN_DIR/journeys"
HAVE_BATCH=0; HAVE_REQUESTS=0
ls "$JOURNEYS"/*.batch.json >/dev/null 2>&1 && HAVE_BATCH=1
ls "$JOURNEYS"/*.requests.txt >/dev/null 2>&1 && HAVE_REQUESTS=1
if [ "$HAVE_BATCH" -eq 0 ] && [ "$HAVE_REQUESTS" -eq 0 ]; then
  echo "verify-runner: no journeys in $JOURNEYS" >&2
  exit 2
fi
if [ "$HAVE_BATCH" -eq 1 ] && ! command -v agent-browser >/dev/null 2>&1; then
  echo "verify-runner: agent-browser is not installed — preflight installs it" >&2
  exit 2
fi

# Access service-token headers, when the preview sits behind a login wall.
# Absent is normal — most previews are open — so this is silent either way.
# For a browser journey they are staged before the first navigation, which is
# why the session is opened with no URL first: headers set after a navigation
# would miss the page they exist to get past. For a request probe the same
# pair rides as curl headers.
ACCESS_HEADERS=""
CURL_ACCESS=()
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
  ACCESS_HEADERS=$(printf '{"CF-Access-Client-Id":"%s","CF-Access-Client-Secret":"%s"}' \
    "$CF_ACCESS_CLIENT_ID" "$CF_ACCESS_CLIENT_SECRET")
  CURL_ACCESS=(-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
               -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
fi

# Access redirects to a `*.cloudflareaccess.com` host, so the landing URL (or,
# for a request probe, the Location header and challenge body) is the reliable
# signal. Finding the wall matters more than finding it early: without this
# check the walk captures a login form and a grader could read "a page
# rendered" as a pass. That is the one failure mode that would look like
# success, which is why it gets its own exit code rather than a verdict.
looks_like_access() { grep -qi 'cloudflareaccess\.com' "$1" 2>/dev/null; }

ACCESS_HIT=0
mkdir -p "$RUN_DIR/evidence"

# ── Browser journeys ──────────────────────────────────────────────────────────
for batch in "$JOURNEYS"/*.batch.json; do
  [ -e "$batch" ] || continue
  id=$(basename "$batch" .batch.json)
  session="verify-$(basename "$RUN_DIR")-$id"
  out="$RUN_DIR/evidence/$id.result.json"
  mkdir -p "$RUN_DIR/evidence/$id"

  # One session per journey, so a session that dies mid-journey costs that
  # journey alone and the next one starts clean.
  agent-browser --session "$session" open >/dev/null 2>&1
  if [ -n "$ACCESS_HEADERS" ]; then
    agent-browser --session "$session" set headers "$ACCESS_HEADERS" >/dev/null 2>&1
  fi

  agent-browser --session "$session" batch --bail --json <"$batch" >"$out" 2>"$RUN_DIR/evidence/$id.stderr"
  status=$?

  agent-browser --session "$session" get url >"$RUN_DIR/evidence/$id.url" 2>/dev/null
  agent-browser --session "$session" close >/dev/null 2>&1

  if looks_like_access "$RUN_DIR/evidence/$id.url" || looks_like_access "$out"; then
    ACCESS_HIT=1
  fi

  shots=$(find "$RUN_DIR/evidence/$id" -name '*.png' 2>/dev/null | wc -l | tr -d ' ')
  echo "walked $id — $shots screenshot(s)$([ "$status" -eq 0 ] || echo " (batch stopped at a failing step)")"
done

# ── Request probes ────────────────────────────────────────────────────────────
# Each line is curled in order; the full response — status line, headers, body —
# is that step's evidence. No redirect is followed: a redirect is a response,
# and a scenario about the destination writes the follow-up GET as its own step.
for req in "$JOURNEYS"/*.requests.txt; do
  [ -e "$req" ] || continue
  id=$(basename "$req" .requests.txt)
  mkdir -p "$RUN_DIR/evidence/$id"
  n=0
  while IFS=$'\t' read -r method path body || [ -n "${method:-}" ]; do
    [ -z "${method:-}" ] && continue
    case "$method" in \#*) continue ;; esac
    n=$((n + 1))
    step=$(printf '%02d' "$n")
    url="$path"
    case "$url" in http*) ;; *) url="${URL_UNDER_TEST%/}/${path#/}" ;; esac
    out="$RUN_DIR/evidence/$id/$step-response.txt"
    {
      echo "request: $method $url"
      [ -n "${body:-}" ] && echo "body: $body"
      echo "---"
    } >"$out"
    curl -sS -i -X "$method" \
      ${CURL_ACCESS[@]+"${CURL_ACCESS[@]}"} \
      ${body:+-H "Content-Type: application/json" --data "$body"} \
      "$url" >>"$out" 2>>"$RUN_DIR/evidence/$id.stderr"
    if looks_like_access "$out"; then
      ACCESS_HIT=1
    fi
  done <"$req"
  echo "probed $id — $n request(s)"
done

# Reported after every journey has had its turn: one journey behind a wall does
# not prove the rest were, and the evidence already captured is still worth
# keeping on disk for the report.
[ "$ACCESS_HIT" -eq 1 ] && exit 3

{
  echo "url=$URL_UNDER_TEST"
  if [ "$HAVE_BATCH" -eq 1 ]; then
    echo "browser=$(agent-browser --version 2>/dev/null | head -1)"
  else
    echo "browser=none (no browser journeys)"
  fi
  for j in "$JOURNEYS"/*.batch.json "$JOURNEYS"/*.requests.txt; do
    [ -e "$j" ] || continue
    base=$(basename "$j")
    echo "journey=${base%.*.*}"
  done
} >"$RUN_DIR/evidence/manifest.txt"
echo "evidence: $RUN_DIR/evidence"
