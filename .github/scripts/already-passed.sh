#!/usr/bin/env bash
# Did this exact code already pass the test check on its pull request's branch?
#
# `test.yml` calls this on a push to the default branch, before the shared
# checks. A squash merge is a new commit, but when its files are identical to
# the pull request's head and that head's `test` check passed, running the
# suite again proves nothing new: identical files give identical results. The
# job then skips the suite and still reports, so a required `test` check turns
# green. See wiki/development/the-change-loop.md#the-gate.
#
# Prints two lines for `>> "$GITHUB_OUTPUT"` on stdout; notes go to stderr:
#
#   passed=true|false  true only when all three hold:
#                      1. a merged pull request's merge commit is $GITHUB_SHA;
#                      2. its head's tree equals $GITHUB_SHA's tree;
#                      3. the head's newest `test` check run from GitHub
#                         Actions that actually ran (a job-level skip does not
#                         count) succeeded.
#   pr=<number>        the merged pull request, or empty when none was found.
#
# Any doubt answers passed=false, so the suite runs: no pull request (a direct
# push), a head no fetch can find, a different tree (the default branch moved
# first), a failed, missing, or unfinished check, or any `gh` or parse error.
# A skipped suite must be a proven skip; a guess runs it.
#
# Input (environment):
#   GITHUB_REPOSITORY, GITHUB_SHA  set by GitHub Actions
#   GH_TOKEN        a token with `pull-requests: read` and `checks: read`
#
# Needs `gh`, `node`, and a checkout holding $GITHUB_SHA; it fetches a missing
# head by `refs/pull/<n>/head`, which forks have too. Always exits 0: the
# answer is the output, never the status.
#
# Usage: bash .github/scripts/already-passed.sh >> "$GITHUB_OUTPUT"

set -uo pipefail

PR=""

note() { echo "already-passed: $*" >&2; }

answer() { # answer <passed>
  echo "passed=$1"
  echo "pr=$PR"
  exit 0
}

# Any doubt: run the suite.
run_suite() {
  note "$* — running the suite"
  answer false
}

have_commit() { git rev-parse --verify --quiet "$1^{commit}" >/dev/null 2>&1; }

# Reads JSON on stdin and prints what the script given as $1 picks; prints
# nothing on a parse error.
pick() { node -e "
  let text = '';
  process.stdin.on('data', chunk => { text += chunk; }).on('end', () => {
    let data;
    try { data = JSON.parse(text); } catch { return; }
    const out = ($1)(data);
    if (out) console.log(out);
  });" 2>/dev/null; }

SHA_PATTERN='^[0-9a-f]{40}([0-9a-f]{24})?$'
REPO="${GITHUB_REPOSITORY:-}"
SHA="${GITHUB_SHA:-}"
[ -n "$REPO" ] || run_suite "no repository named"
[[ "$SHA" =~ $SHA_PATTERN ]] || run_suite "no usable commit SHA"
command -v gh >/dev/null 2>&1 || run_suite "gh is not installed"
command -v node >/dev/null 2>&1 || run_suite "node is not installed"
have_commit "$SHA" || run_suite "$SHA is not checked out"

# 1. The merged pull request whose merge commit is this push.
PULLS=$(gh api "repos/$REPO/commits/$SHA/pulls" 2>/dev/null) || run_suite "can not list pull requests for $SHA"
FOUND=$(printf '%s' "$PULLS" | SHA="$SHA" pick "pulls => {
  const pull = Array.isArray(pulls) && pulls.find(p => p && p.merged_at && p.merge_commit_sha === process.env.SHA);
  return pull ? pull.number + ' ' + (pull.head && pull.head.sha) : '';
}")
[ -n "$FOUND" ] || run_suite "no merged pull request has $SHA as its merge commit"
NUMBER="${FOUND%% *}"
HEAD="${FOUND#* }"
[[ "$NUMBER" =~ ^[0-9]+$ ]] || run_suite "unreadable pull request number"
PR="$NUMBER"
[[ "$HEAD" =~ $SHA_PATTERN ]] || run_suite "pull request #$PR has no usable head SHA"

# 2. The same files as the head the branch tested.
if ! have_commit "$HEAD"; then
  git fetch --no-tags --quiet origin "refs/pull/$PR/head" >/dev/null 2>&1 || true
fi
have_commit "$HEAD" || run_suite "can not fetch the head $HEAD of pull request #$PR"
HEAD_TREE=$(git rev-parse "$HEAD^{tree}" 2>/dev/null) || run_suite "can not read the tree of $HEAD"
SHA_TREE=$(git rev-parse "$SHA^{tree}" 2>/dev/null) || run_suite "can not read the tree of $SHA"
[ "$HEAD_TREE" = "$SHA_TREE" ] || run_suite "the code differs from pull request #$PR's head (the default branch moved first)"

# 3. The head's newest `test` run that actually ran. A same-repo pull_request
# event records a skipped `test` run beside the push's real one.
CHECKS=$(gh api "repos/$REPO/commits/$HEAD/check-runs?check_name=test&per_page=100" 2>/dev/null) \
  || run_suite "can not read the test check of $HEAD"
NEWEST=$(printf '%s' "$CHECKS" | pick "body => {
  const runs = (Array.isArray(body && body.check_runs) ? body.check_runs : [])
    .filter(run => run && run.app && run.app.slug === 'github-actions')
    .filter(run => run.conclusion !== 'skipped')
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)) || b.id - a.id);
  return runs.length ? runs[0].status + ' ' + runs[0].conclusion : 'none';
}")
case "$NEWEST" in
  'completed success') ;;
  none) run_suite "pull request #$PR's head has no test check that ran" ;;
  '') run_suite "unreadable test check for $HEAD" ;;
  *) run_suite "pull request #$PR's head test check is '$NEWEST'" ;;
esac

note "the code is identical to pull request #$PR's head, whose test check passed — skipping the suite"
answer true
