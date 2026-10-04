#!/usr/bin/env bash
# Does this change leave the main app untouched? One answer for every workflow.
#
# `test.yml` (core) and the pack's `deploy.yml` both call this first, so a
# branch that changes only docs installs, tests, and deploys none of the main
# app. A mini app is main-app code, so changing one runs the whole suite and
# deploys. The skip happens INSIDE each job: a workflow-level `paths-ignore`
# would leave a required check pending forever and block the merge. See
# wiki/development/the-change-loop.md.
#
# Prints four lines for `>> "$GITHUB_OUTPUT"` on stdout; everything else goes
# to stderr:
#
#   untouched=true|false   true only when EVERY changed path is under wiki/
#                          or openspec/, or ends in .md.
#   base=<sha>             the commit the change is compared with, or empty
#                          when the comparison can not be made.
#                          `loosened-checks.mjs` diffs from it.
#   docs_only=true|false   true only when EVERY changed path is under wiki/
#                          or openspec/. `payload.yml` skips its script tests
#                          on it. Markdown anywhere else is false.
#   wiki_affected=true|false  false only when NO changed path is under wiki/
#                          or ends in .md, and the change removes or moves no
#                          file (a move could break a wiki link to it).
#                          `test.yml` skips its wiki check on false.
#
# The comparison covers the WHOLE change, never only the last commit, so a docs
# commit on top of a code commit still runs the suite. The base is:
#
#   pull_request                 the merge base with origin/$GITHUB_BASE_REF
#   push to another branch       the merge base with origin/$DEFAULT_BRANCH
#   push to the default branch   $BEFORE_SHA, the commit the push replaced
#
# When the comparison can not be made — an all-zero BEFORE_SHA (a new branch or
# a first push), a ref that no fetch can find, no merge base, an unknown event —
# every answer assumes a change: untouched=false, docs_only=false, and
# wiki_affected=true. An empty diff answers the same. A skipped check must be a
# proven skip; a guess runs it.
#
# Input (environment):
#   GITHUB_EVENT_NAME, GITHUB_BASE_REF, GITHUB_REF_NAME  set by GitHub Actions
#   DEFAULT_BRANCH  ${{ github.event.repository.default_branch }}; when empty,
#                   origin/HEAD is tried
#   BEFORE_SHA      ${{ github.event.before }}; read only on a push to the
#                   default branch
#
# With `--worktree`, it answers for the uncommitted work instead: the working
# tree, staged and untracked paths included, against the merge base of HEAD and
# origin/$DEFAULT_BRANCH. `/apply` uses it to skip a host preview when the
# change leaves the main app untouched. It reads no GITHUB_* variable.
#
# With `--base <sha> --head <sha>`, compare those exact local commits without
# reading GitHub context or fetching. Portable runners supply the whole-change
# base explicitly. An unavailable base still answers conservatively.
#
# Needs a full-history checkout (`fetch-depth: 0`); it fetches a missing base
# ref itself. Always exits 0: the answer is the output, never the status.
#
# Usage: bash .github/scripts/app-untouched.sh >> "$GITHUB_OUTPUT"
#        DEFAULT_BRANCH=main bash .github/scripts/app-untouched.sh --worktree

set -uo pipefail

WORKTREE=false
EXPLICIT=false
BASE_ARG=""
HEAD_ARG="HEAD"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --worktree) WORKTREE=true; shift ;;
    --base|--head)
      [ "$#" -ge 2 ] || { echo "missing value for $1" >&2; exit 2; }
      EXPLICIT=true
      if [ "$1" = --base ]; then BASE_ARG="$2"; else HEAD_ARG="$2"; fi
      shift 2 ;;
    *) echo "usage: bash .github/scripts/app-untouched.sh [--worktree | --base <sha> --head <sha>]" >&2; exit 2 ;;
  esac
done
if $WORKTREE && $EXPLICIT; then echo "--worktree cannot use explicit commits" >&2; exit 2; fi

note() { echo "app-untouched: $*" >&2; }

have_commit() { git rev-parse --verify --quiet "$1^{commit}" >/dev/null 2>&1; }

# Make origin/<branch> present, fetching it when the checkout lacks it.
remote_branch() {
  local branch="$1" ref="refs/remotes/origin/$1"
  have_commit "$ref" && { echo "$ref"; return 0; }
  git fetch --no-tags --quiet origin "+refs/heads/$branch:$ref" >/dev/null 2>&1 || return 1
  have_commit "$ref" && echo "$ref"
}

answer() { # answer <untouched> <base> <docs_only> <wiki_affected>
  echo "untouched=$1"
  echo "base=$2"
  echo "docs_only=$3"
  echo "wiki_affected=$4"
  exit 0
}

# No base: assume everything changed.
unknown() {
  note "$* — comparison not possible; assuming the main app changed"
  answer false "" false true
}

git rev-parse --verify --quiet HEAD >/dev/null 2>&1 || unknown "no commit checked out"

DEFAULT="${DEFAULT_BRANCH:-}"
if [ -z "$DEFAULT" ]; then
  DEFAULT=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
  DEFAULT="${DEFAULT#origin/}"
fi

EVENT="${GITHUB_EVENT_NAME:-}"
$WORKTREE && EVENT=worktree
$EXPLICIT && EVENT=explicit
REF="${GITHUB_REF_NAME:-}"
BASE=""

case "$EVENT" in
  explicit)
    [[ "$BASE_ARG" =~ ^[0-9a-f]{40}([0-9a-f]{24})?$ ]] || unknown "no usable explicit base SHA"
    [[ "$HEAD_ARG" =~ ^[0-9a-f]{40}([0-9a-f]{24})?$ ]] || unknown "no usable explicit head SHA"
    have_commit "$BASE_ARG" && have_commit "$HEAD_ARG" || unknown "explicit commits unavailable"
    BASE="$BASE_ARG"
    note "explicit commits: comparing the whole change"
    ;;
  pull_request)
    [ -n "${GITHUB_BASE_REF:-}" ] || unknown "pull_request with no GITHUB_BASE_REF"
    TARGET=$(remote_branch "$GITHUB_BASE_REF") || unknown "can not fetch origin/$GITHUB_BASE_REF"
    BASE=$(git merge-base "$TARGET" HEAD 2>/dev/null) || unknown "no merge base with origin/$GITHUB_BASE_REF"
    note "pull request: comparing with the merge base of origin/$GITHUB_BASE_REF"
    ;;
  push)
    [ -n "$DEFAULT" ] || unknown "no default branch named"
    if [ "$REF" = "$DEFAULT" ]; then
      BEFORE="${BEFORE_SHA:-}"
      [[ "$BEFORE" =~ ^[0-9a-f]{40}([0-9a-f]{24})?$ ]] || unknown "push to $DEFAULT with no usable before SHA"
      [[ "$BEFORE" =~ ^0+$ ]] && unknown "push to $DEFAULT with an all-zero before SHA"
      if ! have_commit "$BEFORE"; then
        git fetch --no-tags --quiet origin "$BEFORE" >/dev/null 2>&1 || true
      fi
      have_commit "$BEFORE" || unknown "can not fetch the before SHA $BEFORE"
      BASE="$BEFORE"
      note "push to $DEFAULT: comparing with the commit the push replaced"
    else
      TARGET=$(remote_branch "$DEFAULT") || unknown "can not fetch origin/$DEFAULT"
      BASE=$(git merge-base "$TARGET" HEAD 2>/dev/null) || unknown "no merge base with origin/$DEFAULT"
      note "push to $REF: comparing the whole branch with origin/$DEFAULT"
    fi
    ;;
  worktree)
    [ -n "$DEFAULT" ] || unknown "no default branch named"
    TARGET=$(remote_branch "$DEFAULT") || unknown "can not fetch origin/$DEFAULT"
    BASE=$(git merge-base "$TARGET" HEAD 2>/dev/null) || unknown "no merge base with origin/$DEFAULT"
    note "working tree: comparing with the merge base of origin/$DEFAULT"
    ;;
  *)
    unknown "event '${EVENT:-none}' is not push or pull_request"
    ;;
esac

# `--no-renames` lists both sides of a rename, so moving a file out of app/
# into wiki/ still counts as a change to app/. `-z` keeps odd names intact.
# `--diff-filter=D` with `--no-renames` lists every removed path, the old side
# of a move included.
CHANGED=$(mktemp)
REMOVED=$(mktemp)
trap 'rm -f "$CHANGED" "$REMOVED"' EXIT
if $WORKTREE; then
  # No second commit: the working tree itself, then every untracked file.
  { git diff --name-only --no-renames -z "$BASE" && git ls-files --others --exclude-standard -z; } \
    > "$CHANGED" 2>/dev/null || unknown "git diff failed"
  git diff --name-only --no-renames --diff-filter=D -z "$BASE" > "$REMOVED" 2>/dev/null || unknown "git diff failed"
else
  git diff --name-only --no-renames -z "$BASE" "$HEAD_ARG" > "$CHANGED" 2>/dev/null || unknown "git diff failed"
  git diff --name-only --no-renames --diff-filter=D -z "$BASE" "$HEAD_ARG" > "$REMOVED" 2>/dev/null || unknown "git diff failed"
fi

UNTOUCHED=true
DOCS_ONLY=true
WIKI_AFFECTED=false
[ -s "$REMOVED" ] && WIKI_AFFECTED=true
COUNT=0
while IFS= read -r -d '' path; do
  COUNT=$((COUNT + 1))
  case "$path" in
    wiki/*|openspec/*) ;;
    *) DOCS_ONLY=false ;;
  esac
  case "$path" in
    wiki/*|openspec/*|*.md) ;;
    *) UNTOUCHED=false ;;
  esac
  case "$path" in
    wiki/*|*.md) WIKI_AFFECTED=true ;;
  esac
done < "$CHANGED"

if [ "$COUNT" -eq 0 ]; then
  note "the diff is empty — nothing to prove untouched"
  answer false "$BASE" false true
fi

note "$COUNT changed path(s); main app untouched: $UNTOUCHED; docs only: $DOCS_ONLY; wiki affected: $WIKI_AFFECTED"
answer "$UNTOUCHED" "$BASE" "$DOCS_ONLY" "$WIKI_AFFECTED"
