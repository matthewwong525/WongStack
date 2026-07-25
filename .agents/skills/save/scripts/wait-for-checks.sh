#!/usr/bin/env bash
# Wait for ALL GitHub checks on the current branch's PR to finish, then report
# the aggregate result. CI is WongStack's gate *when a repo has checks* — we
# never build or test locally. Where the repo's own GitHub Actions exist, this
# waits for them to settle and tells you the verdict; where none are configured
# it returns NONE and the PR review is the gate (see the RESULT lines below).
#
# Prints exactly one RESULT line at the end:
#   RESULT: SUCCESS   — every check passed (or skipped)
#   RESULT: FAILURE   — at least one check failed/cancelled (failing names follow)
#   RESULT: NONE      — the repo reports no checks on this branch (nothing to wait for)
#   RESULT: TIMEOUT   — still pending after the time budget (pending names follow)
#
# Usage: wait-for-checks.sh [max-minutes]   (default 20)
set -uo pipefail
MAX_MIN="${1:-20}"
DEADLINE=$(( $(date +%s) + MAX_MIN * 60 ))

while :; do
  JSON=$(gh pr checks --json name,state,bucket,link 2>/dev/null)
  RC=$?
  # gh exits non-zero (and prints nothing parseable) when there are no checks.
  if [ $RC -ne 0 ] || [ -z "$JSON" ] || [ "$JSON" = "[]" ]; then
    echo "RESULT: NONE"; exit 0
  fi

  PENDING=$(echo "$JSON" | jq '[.[] | select(.bucket=="pending")] | length')
  if [ "${PENDING:-0}" -eq 0 ]; then
    FAILS=$(echo "$JSON" | jq -c '[.[] | select(.bucket=="fail" or .bucket=="cancel")]')
    if [ "$(echo "$FAILS" | jq 'length')" -gt 0 ]; then
      echo "RESULT: FAILURE"
      echo "$FAILS" | jq -r '.[] | "  - \(.name)  \(.link)"'
      exit 0
    fi
    echo "RESULT: SUCCESS"; exit 0
  fi

  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    echo "RESULT: TIMEOUT"
    echo "$JSON" | jq -r '.[] | select(.bucket=="pending") | "  - \(.name) (still running)"'
    exit 0
  fi
  sleep 10
done
