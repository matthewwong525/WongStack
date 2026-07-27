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
# Depends only on `gh` and shell built-ins — the filtering runs through gh's
# embedded jq (`--jq`), so no standalone `jq` is required. Each poll asks gh for
# one tab-delimited line per check: <bucket>\t<name>\t<link>.
#
# Usage: wait-for-checks.sh [max-minutes]   (default 20)
set -uo pipefail
MAX_MIN="${1:-20}"
DEADLINE=$(( $(date +%s) + MAX_MIN * 60 ))

while :; do
  # Note: gh pr checks exits non-zero when checks are merely pending (8) or
  # failing (1), so the exit code says nothing about whether checks *exist*.
  # Emptiness of the output is the only reliable "no checks" signal.
  LINES=$(gh pr checks --json name,bucket,link \
            --jq '.[] | "\(.bucket)\t\(.name)\t\(.link)"' 2>/dev/null)
  if [ -z "$LINES" ]; then
    echo "RESULT: NONE"; exit 0
  fi

  PENDING=$(printf '%s\n' "$LINES" | grep -c '^pending	')
  if [ "${PENDING:-0}" -eq 0 ]; then
    FAILS=$(printf '%s\n' "$LINES" | grep -E '^(fail|cancel)	')
    if [ -n "$FAILS" ]; then
      echo "RESULT: FAILURE"
      printf '%s\n' "$FAILS" | while IFS=$'\t' read -r _ name link; do
        echo "  - $name  $link"
      done
      exit 0
    fi
    echo "RESULT: SUCCESS"; exit 0
  fi

  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    echo "RESULT: TIMEOUT"
    printf '%s\n' "$LINES" | grep '^pending	' | while IFS=$'\t' read -r _ name _; do
      echo "  - $name (still running)"
    done
    exit 0
  fi
  sleep 10
done
