#!/usr/bin/env bash
# Publish on an Artifacts install: squash the gated branch onto main and push it,
# without force. `merge.sh` hands over to this script; /ship runs it once, after
# /save returned SUCCESS or NONE (wiki/stack/artifacts-route.md).
#
#   bash publish-artifacts.sh [subject]
#
# There is no pull request, so publishing is main moving forward by one commit:
# the branch's files, on top of the main just fetched. The check runner then
# checks main and deploys production only when it passes.
#
# Prints key=value lines for the ship report:
#   merged=yes|no  commit=<the new main commit>
#   moved=yes   with merged=no: main moved since this branch was checked; bring
#               main in, save again, and rerun. A push that failed while main
#               stood still prints merged=no alone.
#   main=SUCCESS|FAILURE|UNKNOWN  how main's own check run ended
#   live=<address>   the address main's deploy reported, when it deployed
#   branch=deleted|kept  synced=<path>|ref|skipped (<reason>)
#
# Exit codes:
#   0  published, and main's run passed
#   1  not published; nothing changed on the remote
#   2  published, but the branch delete failed; the branch is kept
#   3  published, but main's run failed or could not be read: production keeps
#      the last passing commit. Stop; never push again to make it pass.
#
# Only a commit whose own run passed is published: the script reads the run for
# the exact HEAD again, and refuses on anything but SUCCESS or NONE.

set -uo pipefail

say() { printf '%s\n' "$*"; }
fail() { say "error=$*" >&2; }
no() { say "merged=no"; fail "$*"; exit 1; }

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RUN="$HERE/../../save/scripts/artifacts-run.mjs"

BRANCH=$(git rev-parse --abbrev-ref HEAD) || no "cannot read the current branch"
SHA=$(git rev-parse HEAD) || no "cannot read HEAD"
[ "$BRANCH" != main ] || no "on main; nothing to publish"
[ "$BRANCH" != HEAD ] || no "not on a branch; nothing to publish"

# ── Only the saved, checked commit ─────────────────────────────────────────────
git fetch origin main "$BRANCH" >/dev/null 2>&1 || no "git fetch failed; cannot compare with main"
SAVED=$(git rev-parse "origin/$BRANCH" 2>/dev/null) || no "this branch was never saved"
[ "$SAVED" = "$SHA" ] || no "HEAD is not the commit that was saved; save first"
GATE=$(node "$RUN" result "$SHA" "refs/heads/$BRANCH") || GATE=UNKNOWN
case "$GATE" in
  SUCCESS|NONE) ;;
  *) no "this commit's checks are ${GATE:-UNKNOWN}; only a checked commit is published" ;;
esac

# ── Main must not have moved past this branch ──────────────────────────────────
if ! git merge-base --is-ancestor origin/main HEAD; then
  say "merged=no"; say "moved=yes"
  fail "main moved since this branch was checked; bring main in and save again"; exit 1
fi

# ── One commit on main: this branch's files ────────────────────────────────────
SUBJECT=${1:-$(git log -1 --format=%s HEAD)}
TREE=$(git rev-parse 'HEAD^{tree}') || no "cannot read HEAD's files"
COMMIT=$(git commit-tree "$TREE" -p origin/main -m "$SUBJECT") || no "could not write the publish commit"
if ! git push origin "$COMMIT:refs/heads/main" >/dev/null 2>&1; then
  # A refused push means main moved only when main is no longer where this commit was built.
  BASE=$(git rev-parse origin/main 2>/dev/null) || BASE=
  git fetch origin main >/dev/null 2>&1 || no "the push to main failed and main could not be read; check access and rerun"
  [ "$(git rev-parse origin/main 2>/dev/null)" != "$BASE" ] || no "the push to main failed and main did not move; check access and rerun"
  say "merged=no"; say "moved=yes"
  fail "the push to main was refused; main moved, so bring it in and save again"; exit 1
fi
say "merged=yes"
say "commit=$COMMIT"

# ── Main's own run decides what goes live ──────────────────────────────────────
LIVE=$(LIVE_LOOK_WAIT_SECONDS="${PUBLISH_WAIT_SECONDS:-2400}" node "$RUN" live "$COMMIT") || LIVE=unknown
RC=0
case "$LIVE" in
  https://*) say "main=SUCCESS"; say "live=$LIVE" ;;
  none) say "main=SUCCESS" ;;
  failed) say "main=FAILURE"; fail "main's checks or deploy failed; production keeps the last passing commit"; RC=3 ;;
  *) say "main=UNKNOWN"; fail "main's check run could not be read; what is live is unverified"; RC=3 ;;
esac

# ── The branch is published: delete it on the remote ───────────────────────────
if git push origin --delete "$BRANCH" >/dev/null 2>&1; then
  say "branch=deleted"
else
  say "branch=kept"; fail "git push --delete failed"
  [ "$RC" -ne 0 ] || RC=2
fi

# ── Sync the checkout that has main out; nothing here can fail the publish ─────
if ! git fetch origin --prune >/dev/null 2>&1; then
  say "synced=skipped (git fetch failed)"; exit "$RC"
fi
MAIN_WT=$(git worktree list --porcelain \
  | awk '/^worktree /{p=substr($0, 10)} $0 == "branch refs/heads/main" {print p}')
if [ -n "$MAIN_WT" ]; then
  if [ -n "$(git -C "$MAIN_WT" status --porcelain)" ]; then
    say "synced=skipped ($MAIN_WT has uncommitted changes)"
  elif git -C "$MAIN_WT" merge --ff-only origin/main >/dev/null 2>&1; then
    say "synced=$MAIN_WT"
  else
    say "synced=skipped ($MAIN_WT could not fast-forward)"
  fi
elif git fetch origin main:main >/dev/null 2>&1; then
  say "synced=ref"
else
  say "synced=skipped (local main could not fast-forward)"
fi
exit "$RC"
