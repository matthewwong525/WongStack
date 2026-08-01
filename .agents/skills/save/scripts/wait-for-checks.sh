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
#   RESULT: UNKNOWN   — gh could not be asked (no PR, auth, network); the gate is
#                       UNVERIFIED, which is not the same as "no checks exist"
#
# ── Why UNKNOWN exists ────────────────────────────────────────────────────────
# An earlier version ran `gh pr checks --json …` with stderr sent to /dev/null
# and treated empty output as "no checks". `--json` is only available on newer
# `gh` (absent in 2.46, for one), so on an older CLI the command errored, the
# error was swallowed, and this script reported NONE — telling /save and /ship
# that the repo had no CI while checks were sitting right there on the PR. A
# red branch could have been merged on the strength of it. Silence now means
# UNKNOWN, and only gh explicitly saying "no checks" means NONE.
#
# Depends only on `gh` and shell built-ins — no standalone `jq`. Each poll
# normalizes to one tab-delimited line per check: <state>\t<name>\t<link>.
#
# Usage: wait-for-checks.sh [max-minutes]   (default 20)
set -uo pipefail
MAX_MIN="${1:-20}"
DEADLINE=$(( $(date +%s) + MAX_MIN * 60 ))

ERR_FILE=$(mktemp)
trap 'rm -f "$ERR_FILE"' EXIT

# Probe once: does this gh support `gh pr checks --json`? Ask --help rather than
# running the command, so the probe can't be confused by a pending/failing exit
# code (see the note in the poll loop).
if gh pr checks --help 2>&1 | grep -q -- '--json'; then
  USE_JSON=1
else
  USE_JSON=0
fi

# Emit <state>\t<name>\t<link> per check, whichever gh we're on. Both paths use
# the same state vocabulary (pass / fail / pending / skipping / cancel).
poll_checks() {
  if [ "$USE_JSON" = "1" ]; then
    gh pr checks --json name,bucket,link \
      --jq '.[] | "\(.bucket)\t\(.name)\t\(.link)"' 2>"$ERR_FILE"
  else
    # Plain output is <name>\t<state>\t<elapsed>\t<link>; reorder it.
    gh pr checks 2>"$ERR_FILE" \
      | while IFS=$'\t' read -r name state _elapsed link _rest; do
          [ -n "${state:-}" ] || continue
          printf '%s\t%s\t%s\n' "$state" "$name" "$link"
        done
  fi
}

while :; do
  # Note: gh pr checks exits non-zero when checks are merely pending (8) or
  # failing (1), so the exit code says nothing about whether checks *exist*.
  # Emptiness plus what gh said on stderr is what distinguishes the cases.
  LINES=$(poll_checks)

  if [ -z "$LINES" ]; then
    STDERR=$(tr -d '\r' < "$ERR_FILE")
    # gh says this explicitly when a PR genuinely has no checks configured.
    if printf '%s' "$STDERR" | grep -qi 'no checks'; then
      echo "RESULT: NONE"; exit 0
    fi
    # Anything else — no PR for this branch, auth failure, network, an
    # unsupported flag — is a question we failed to ask, not an answer.
    echo "RESULT: UNKNOWN"
    if [ -n "$STDERR" ]; then
      printf '%s\n' "$STDERR" | sed 's/^/  /'
    else
      echo "  gh returned no checks and no error; the gate is unverified."
    fi
    exit 0
  fi

  PENDING=$(printf '%s\n' "$LINES" | grep -c '^pending	')
  if [ "${PENDING:-0}" -eq 0 ]; then
    FAILS=$(printf '%s\n' "$LINES" | grep -E '^(fail|cancel)')
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
