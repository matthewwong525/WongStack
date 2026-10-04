#!/usr/bin/env bash
# Merge the gated pull request, clean up its branch, and sync the checkout that
# has the default branch out. /ship runs this once, after /save returned SUCCESS
# or NONE (and the walk did not stop the ship).
#
#   bash merge.sh
#
# Prints key=value lines for the ship report:
#   merged=yes|no  pr=<number> url=<url>  retargeted=<numbers>
#   branch=deleted|deleted-at-merge|kept  synced=<path>|ref|skipped (<reason>)
#   stale_version=<version>  with merged=no: another release took this one's
#     number; /ship numbers it again from <version>, saves, and reruns this
#
# The squash commit's subject is the PR title, less any trailing " (vX.Y.Z)",
# then " (v<VERSION>)" when the branch changes VERSION, then " (#<number>)".
#
# Exit codes:
#   0  merged; the sync may still have been skipped (never a failure)
#   1  not merged, nothing deleted
#   2  merged, but a retarget or the branch delete failed; the branch is kept
#
# Never `gh pr merge --delete-branch`: it switches the local checkout to delete
# the local branch, which fails in a worktree whose default branch is checked
# out elsewhere. The remote branch is deleted explicitly, after every open pull
# request based on it is retargeted: deleting a base branch closes those pull
# requests, and GitHub will not reopen them.

set -uo pipefail

say() { printf '%s\n' "$*"; }
fail() { say "error=$*" >&2; }

# An Artifacts install has no pull request to merge: publish-artifacts.sh moves
# main forward itself and prints the same lines (wiki/stack/artifacts-route.md).
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROUTE=$(node "$HERE/../../save/scripts/delivery-route.mjs" 2>/dev/null) || { say "merged=no"; fail "the delivery route could not be told"; exit 1; }
if [ "$ROUTE" = artifacts ]; then exec bash "$HERE/publish-artifacts.sh" "$@"; fi

BRANCH=$(git rev-parse --abbrev-ref HEAD) || { say "merged=no"; fail "cannot read the current branch"; exit 1; }
SHA=$(git rev-parse HEAD) || { say "merged=no"; fail "cannot read HEAD"; exit 1; }
DEFAULT=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
if [ -z "$DEFAULT" ]; then say "merged=no"; fail "no default branch name from gh"; exit 1; fi
if [ "$BRANCH" = "$DEFAULT" ]; then say "merged=no"; fail "on the default branch; nothing to merge"; exit 1; fi

# ── Refuse a release whose number another release took ──────────────────────────
# A release changes VERSION against its merge base. When the default branch's
# VERSION has also moved from that base, two releases would ship one number.
if ! git fetch origin "$DEFAULT" >/dev/null 2>&1; then
  say "merged=no"; fail "git fetch origin $DEFAULT failed; cannot check the version"; exit 1
fi
HEAD_V=$(git show HEAD:VERSION 2>/dev/null)
BASE_V=""
if MB=$(git merge-base HEAD "origin/$DEFAULT" 2>/dev/null); then BASE_V=$(git show "$MB:VERSION" 2>/dev/null); fi
MAIN_V=$(git show "origin/$DEFAULT:VERSION" 2>/dev/null)
RELEASE=""
if [ -n "$HEAD_V" ] && [ "$HEAD_V" != "$BASE_V" ]; then RELEASE=$HEAD_V; fi
if [ -n "$RELEASE" ] && [ "$MAIN_V" != "$BASE_V" ]; then
  say "merged=no"; say "stale_version=$MAIN_V"
  fail "$DEFAULT reached $MAIN_V while this branch carried $RELEASE; number it again"; exit 1
fi

# ── The subject names the version that ships ───────────────────────────────────
if ! PR_NUMBER=$(gh pr view --json number --jq .number) || ! TITLE=$(gh pr view --json title --jq .title); then
  say "merged=no"; fail "cannot read the PR's title and number"; exit 1
fi
if [[ $TITLE =~ ^(.*)\ \(v[0-9]+\.[0-9]+\.[0-9]+\)$ ]]; then TITLE=${BASH_REMATCH[1]}; fi
SUBJECT="$TITLE${RELEASE:+ (v$RELEASE)} (#$PR_NUMBER)"

# ── Merge exactly the gated commit ──────────────────────────────────────────────
if ! gh pr merge --squash --match-head-commit "$SHA" --subject "$SUBJECT"; then
  say "merged=no"; fail "gh pr merge refused; the branch and PR are unchanged"; exit 1
fi
STATE=$(gh pr view --json state --jq .state)
if [ "$STATE" != MERGED ]; then
  say "merged=no"; fail "PR state is '${STATE:-unknown}', not MERGED"; exit 1
fi
say "merged=yes"
gh pr view --json number,url --jq '"pr=\(.number) url=\(.url)"' || true

# ── Retarget before delete, always ─────────────────────────────────────────────
RETARGETED=()
# A failed list must not read as "no stacked PRs": deleting the branch would close them.
if ! STACKED=$(gh pr list --state open --base "$BRANCH" --json number --jq '.[].number'); then
  say "retargeted="; say "branch=kept"
  fail "could not list the PRs based on $BRANCH; the branch is kept so none of them closes"; exit 2
fi
for n in $STACKED; do
  if ! gh api -X PATCH "repos/:owner/:repo/pulls/$n" -f base="$DEFAULT" --jq '.number' >/dev/null; then
    say "retargeted=${RETARGETED[*]:-}"; say "branch=kept"
    fail "could not retarget PR #$n; the branch is kept so that PR stays open"; exit 2
  fi
  RETARGETED+=("$n")
done
say "retargeted=${RETARGETED[*]:-}"

# ── Delete the remote branch, unless GitHub already did at merge ───────────────
git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; rc=$?
case $rc in
  # GitHub's own delete at merge can land between the check and the push, so
  # a failed delete asks again before it counts as a failure.
  0) if git push origin --delete "$BRANCH"; then say "branch=deleted"
     elif git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; [ $? -eq 2 ]; then say "branch=deleted-at-merge"
     else say "branch=kept"; fail "git push --delete failed"; exit 2; fi ;;
  2) say "branch=deleted-at-merge" ;;
  *) say "branch=kept"; fail "git ls-remote failed (exit $rc); cannot tell whether the branch exists"; exit 2 ;;
esac

# ── Sync the checkout that has the default branch out ──────────────────────────
# Nothing here can fail the ship: the PR is merged. Any obstacle is one line.
if ! git fetch origin --prune >/dev/null 2>&1; then
  say "synced=skipped (git fetch failed)"; exit 0
fi
MAIN_WT=$(git worktree list --porcelain \
  | awk -v ref="refs/heads/$DEFAULT" '/^worktree /{p=substr($0, 10)} $0 == "branch " ref {print p}')
if [ -n "$MAIN_WT" ]; then
  if [ -n "$(git -C "$MAIN_WT" status --porcelain)" ]; then
    say "synced=skipped ($MAIN_WT has uncommitted changes)"
  elif git -C "$MAIN_WT" merge --ff-only "origin/$DEFAULT" >/dev/null 2>&1; then
    say "synced=$MAIN_WT"
  else
    say "synced=skipped ($MAIN_WT could not fast-forward)"
  fi
elif git fetch origin "$DEFAULT:$DEFAULT" >/dev/null 2>&1; then
  say "synced=ref"
else
  say "synced=skipped (local $DEFAULT could not fast-forward)"
fi
exit 0
