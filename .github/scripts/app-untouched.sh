#!/usr/bin/env bash
# Does this change leave the main app untouched? One answer for every workflow.
#
# `test.yml` (core) and the pack's `deploy.yml` both call this first, so a
# branch that changes only docs or mini apps installs, tests, and deploys none
# of the main app. The skip happens INSIDE each job: a workflow-level
# `paths-ignore` would leave a required check pending forever and block the
# merge. See wiki/development/the-change-loop.md.
#
# Prints three lines for `>> "$GITHUB_OUTPUT"` on stdout; everything else goes
# to stderr:
#
#   untouched=true|false   true only when EVERY changed path is under wiki/,
#                          openspec/, or mini-apps/, or ends in .md
#   mini_apps=<names>      the folders under mini-apps/apps/ the change
#                          touches, sorted, space-separated
#   mini_changed=true|false  whether any path under mini-apps/ changed
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
# every answer assumes a change: untouched=false, every mini app listed, and
# mini_changed=true when mini-apps/ exists. An empty diff is untouched=false
# too. A skipped suite must be a proven skip; a guess runs the suite.
#
# Input (environment):
#   GITHUB_EVENT_NAME, GITHUB_BASE_REF, GITHUB_REF_NAME  set by GitHub Actions
#   DEFAULT_BRANCH  ${{ github.event.repository.default_branch }}; when empty,
#                   origin/HEAD is tried
#   BEFORE_SHA      ${{ github.event.before }}; read only on a push to the
#                   default branch
#
# Needs a full-history checkout (`fetch-depth: 0`); it fetches a missing base
# ref itself. Always exits 0: the answer is the output, never the status.
#
# Usage: bash .github/scripts/app-untouched.sh >> "$GITHUB_OUTPUT"

set -uo pipefail

note() { echo "app-untouched: $*" >&2; }

have_commit() { git rev-parse --verify --quiet "$1^{commit}" >/dev/null 2>&1; }

# Make origin/<branch> present, fetching it when the checkout lacks it.
remote_branch() {
  local branch="$1" ref="refs/remotes/origin/$1"
  have_commit "$ref" && { echo "$ref"; return 0; }
  git fetch --no-tags --quiet origin "+refs/heads/$branch:$ref" >/dev/null 2>&1 || return 1
  have_commit "$ref" && echo "$ref"
}

# Every folder under mini-apps/apps/ at HEAD — the fail-safe list.
all_mini_apps() {
  git ls-tree -d --name-only HEAD mini-apps/apps/ 2>/dev/null \
    | sed 's#^mini-apps/apps/##' | grep -E '^[A-Za-z0-9][A-Za-z0-9._-]*$' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

answer() { # answer <untouched> <mini_apps> <mini_changed>
  echo "untouched=$1"
  echo "mini_apps=$2"
  echo "mini_changed=$3"
  exit 0
}

# No base: assume everything changed.
unknown() {
  note "$* — comparison not possible; assuming the main app changed"
  local changed=false
  git cat-file -e HEAD:mini-apps 2>/dev/null && changed=true
  answer false "$(all_mini_apps)" "$changed"
}

git rev-parse --verify --quiet HEAD >/dev/null 2>&1 || unknown "no commit checked out"

DEFAULT="${DEFAULT_BRANCH:-}"
if [ -z "$DEFAULT" ]; then
  DEFAULT=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
  DEFAULT="${DEFAULT#origin/}"
fi

EVENT="${GITHUB_EVENT_NAME:-}"
REF="${GITHUB_REF_NAME:-}"
BASE=""

case "$EVENT" in
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
  *)
    unknown "event '${EVENT:-none}' is not push or pull_request"
    ;;
esac

# `--no-renames` lists both sides of a rename, so moving a file out of app/
# into wiki/ still counts as a change to app/. `-z` keeps odd names intact.
CHANGED=$(mktemp)
trap 'rm -f "$CHANGED"' EXIT
git diff --name-only --no-renames -z "$BASE" HEAD > "$CHANGED" 2>/dev/null || unknown "git diff failed"

UNTOUCHED=true
MINI_CHANGED=false
COUNT=0
NAMES=""
while IFS= read -r -d '' path; do
  COUNT=$((COUNT + 1))
  case "$path" in
    mini-apps/*) MINI_CHANGED=true ;;
    wiki/*|openspec/*|*.md) ;;
    *) UNTOUCHED=false ;;
  esac
  case "$path" in
    mini-apps/apps/*/*)
      name="${path#mini-apps/apps/}"
      name="${name%%/*}"
      if [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
        NAMES="$NAMES$name"$'\n'
      else
        note "ignoring mini-apps/apps/$name: not a usable app folder name"
      fi
      ;;
  esac
done < "$CHANGED"

if [ "$COUNT" -eq 0 ]; then
  note "the diff is empty — nothing to prove untouched"
  answer false "" false
fi

MINI_APPS=$(printf '%s' "$NAMES" | sort -u | tr '\n' ' ' | sed 's/ $//')
note "$COUNT changed path(s); main app untouched: $UNTOUCHED"
answer "$UNTOUCHED" "$MINI_APPS" "$MINI_CHANGED"
