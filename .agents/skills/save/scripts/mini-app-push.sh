#!/usr/bin/env bash
# Push a mini-app save straight to the default branch, with one retry when the
# branch moved. The mini-app save reference runs this after it commits.
#
#   bash mini-app-push.sh <name> [default-branch]
#
# Prints key=value lines: pushed=<sha>|no, rebased=yes|no, reason=<why>.
#
# Exit codes:
#   0  pushed, maybe after one rebase
#   1  the app's tests failed before any push; nothing was pushed
#   2  usage
#   3  fall back to a pull request; reason= says why:
#        outside             a commit ahead of the default branch leaves the app's folder
#        refused             the push was refused for a reason other than a moved branch
#        rebase-conflict     the branch moved and the rebase did not apply (it was aborted)
#        tests-after-rebase  the app's tests failed on top of the moved branch
#        second-push         the push after the rebase was rejected too
#
# Never forces a push. A folder with no test file is reported and goes on.

set -uo pipefail

NAME="${1:-}"
DEFAULT="${2:-main}"
if [ -z "$NAME" ] || [ $# -gt 2 ] || ! [[ "$NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "usage: mini-app-push.sh <name> [default-branch]" >&2
  exit 2
fi
ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
DIR="mini-apps/apps/$NAME"
REBASED=no

say() { printf '%s\n' "$*"; }
fallback() { say "pushed=no"; say "rebased=$REBASED"; say "reason=$1"; exit 3; }

# Every commit ahead of the default branch must stay inside the app's folder.
outside_paths() {
  git diff --name-only "origin/$DEFAULT...HEAD" | grep -v "^$DIR/" || true
}

run_tests() {
  if [ -z "$(find "$DIR" -type f -name '*.test.*' -print -quit 2>/dev/null)" ]; then
    say "tests=none ($DIR has no test file)"
    return 0
  fi
  # Clear NODE_TEST_CONTEXT: when this script itself runs under a test runner,
  # an inherited value makes node --test report to it and exit 0 on a failure.
  (cd "$DIR" && env -u NODE_TEST_CONTEXT node --test) >&2
}

push() {
  PUSH_LOG=$(git push origin "HEAD:$DEFAULT" 2>&1)
}

git fetch -q origin "$DEFAULT" || fallback refused
[ -z "$(outside_paths)" ] || fallback outside

if ! run_tests; then
  say "pushed=no"; say "rebased=no"; say "reason=tests"
  exit 1
fi

if push; then
  say "pushed=$(git rev-parse HEAD)"; say "rebased=no"
  exit 0
fi

# Only a branch that moved is retried; a rule or hook refusal is not.
case "$PUSH_LOG" in
  *"(fetch first)"*|*"(non-fast-forward)"*) ;;
  *) printf '%s\n' "$PUSH_LOG" >&2; fallback refused ;;
esac

git fetch -q origin "$DEFAULT" || fallback refused
if ! git rebase -q "origin/$DEFAULT" >&2; then
  git rebase --abort >/dev/null 2>&1 || true
  fallback rebase-conflict
fi
REBASED=yes
[ -z "$(outside_paths)" ] || fallback outside
run_tests || fallback tests-after-rebase

if push; then
  say "pushed=$(git rev-parse HEAD)"; say "rebased=yes"
  exit 0
fi
printf '%s\n' "$PUSH_LOG" >&2
fallback second-push
