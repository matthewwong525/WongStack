#!/usr/bin/env bash
# The walkthrough driver.
#
# It owns the few things about driving a browser that must not vary between
# runs — staging Access headers, giving each journey its own browser session,
# storing the tool's structured output, and recognising a login wall. What it
# does NOT own is the journeys: those are written per run by /walk's scout into
# <run-dir>/journeys/, and deleted with the run directory.
#
# The browser is `agent-browser` (https://github.com/vercel-labs/agent-browser),
# a standalone CLI that carries its own Chrome. It is installed on the MACHINE,
# never added to the repository — that is what lets a repo in any language walk
# without gaining a toolchain it does not otherwise use, and it is why this
# driver is shell rather than a language runtime's script.
#
# ── The journey format ────────────────────────────────────────────────────────
# Two files per journey, both written by the scout:
#
#   <run-dir>/journeys/<id>.batch.json   the ordered agent-browser commands,
#                                        screenshots included, as a JSON array
#   <run-dir>/journeys/<id>.meta.json    { requirement, scenario, then }
#
# The batch file is fed to `agent-browser batch` unread — this driver never
# parses it, so there is nothing between what the scout wrote and what runs.
# The meta file is for the GRADER, not for this script: `then` is carried
# verbatim from the OpenSpec scenario so the judgement is made against the
# author's words rather than a paraphrase invented at walk time.
#
# A batch file looks like:
#
#   [
#     ["open", "https://preview.example.com/"],
#     ["screenshot", "/tmp/wong-walk-x/evidence/new-note/01-landing.png", "--full"],
#     ["find", "role", "button", "click", "--name", "New note"],
#     ["screenshot", "/tmp/wong-walk-x/evidence/new-note/02-empty-form.png", "--full"]
#   ]
#
# `--bail` stops the batch at the first failing command, so a journey that
# breaks early leaves the evidence it did produce plus the failure — which is
# exactly what the walk exists to surface.
#
# Exit codes: 0 every journey attempted · 2 driver could not start
#             3 Cloudflare Access challenge (UNVERIFIED, not a failing page)
set -uo pipefail

RUN_DIR="${1:-}"
URL_UNDER_TEST="${WALK_URL:-}"

if [ -z "$RUN_DIR" ] || [ -z "$URL_UNDER_TEST" ]; then
  echo "walk-runner: need <run-dir> and WALK_URL" >&2
  exit 2
fi
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "walk-runner: agent-browser is not installed — preflight installs it" >&2
  exit 2
fi

JOURNEYS="$RUN_DIR/journeys"
if ! ls "$JOURNEYS"/*.batch.json >/dev/null 2>&1; then
  echo "walk-runner: no journeys in $JOURNEYS" >&2
  exit 2
fi

# Access service-token headers, when the preview sits behind a login wall.
# Absent is normal — most previews are open — so this is silent either way.
# Staged before the first navigation, which is why the session is opened with
# no URL first: headers set after a navigation would miss the page they exist
# to get past.
ACCESS_HEADERS=""
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
  ACCESS_HEADERS=$(printf '{"CF-Access-Client-Id":"%s","CF-Access-Client-Secret":"%s"}' \
    "$CF_ACCESS_CLIENT_ID" "$CF_ACCESS_CLIENT_SECRET")
fi

# Access redirects to a `*.cloudflareaccess.com` host, so the landing URL is the
# reliable signal. Finding the wall matters more than finding it early: without
# this check the walk screenshots a login form and a grader could read "a page
# rendered" as a pass. That is the one failure mode that would look like
# success, which is why it gets its own exit code rather than a verdict.
looks_like_access() { grep -qi 'cloudflareaccess\.com' "$1" 2>/dev/null; }

ACCESS_HIT=0
mkdir -p "$RUN_DIR/evidence"

for batch in "$JOURNEYS"/*.batch.json; do
  id=$(basename "$batch" .batch.json)
  session="walk-$(basename "$RUN_DIR")-$id"
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

# Reported after every journey has had its turn: one journey behind a wall does
# not prove the rest were, and the evidence already captured is still worth
# keeping on disk for the report.
[ "$ACCESS_HIT" -eq 1 ] && exit 3

{
  echo "url=$URL_UNDER_TEST"
  echo "browser=$(agent-browser --version 2>/dev/null | head -1)"
  for batch in "$JOURNEYS"/*.batch.json; do
    echo "journey=$(basename "$batch" .batch.json)"
  done
} >"$RUN_DIR/evidence/manifest.txt"
echo "evidence: $RUN_DIR/evidence"
