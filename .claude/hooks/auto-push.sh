#!/bin/bash
# Stop hook: keep an open PR up to date automatically.
# Once the current branch has an OPEN PR, this commits any pending work and
# pushes it on every turn — so you don't have to re-run /save or /preview.
# It never blocks the turn: any hiccup just exits 0. It no-ops on the repo's
# default branch (a push there could deploy), on a detached HEAD, and until the
# branch actually has an open PR — so it only ever touches live, in-review work.

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ "$branch" = "HEAD" ] && exit 0   # detached HEAD — no branch to push

# Resolve the repo's default branch (main/master/…) and never auto-push it.
# WongStack is stack-agnostic, so don't assume `main`; fall back to it only if
# origin/HEAD isn't set locally (git remote set-head origin -a fixes that).
default=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
[ -z "$default" ] && default=main
[ "$branch" = "$default" ] && exit 0

# Only act once the branch has an OPEN PR — that's the opt-in signal that this
# is live work worth keeping synced (and that /save has already run once).
[ "$(gh pr view --json state -q .state 2>/dev/null)" = "OPEN" ] || exit 0

committed=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A

  # Build a descriptive message from the staged diff instead of a flat
  # "auto-checkpoint": subject lists the changed files, body is a diffstat.
  n=$(git diff --cached --name-only | wc -l | tr -d ' ')
  files=$(git diff --cached --name-only | sed 's#.*/##' | head -5 | paste -sd, - | sed 's/,/, /g')
  [ "$n" -gt 5 ] && files="$files, +$((n - 5)) more"
  subject="checkpoint($branch): update $files"
  body=$(git diff --cached --stat)

  git commit -q -m "$subject" -m "$body" && committed=1
fi

# Push if we just committed, or if there are local commits not yet on the remote.
if [ "$committed" = 1 ] || [ -n "$(git rev-list @{u}..HEAD 2>/dev/null)" ]; then
  git push -q 2>/dev/null \
    && echo '{"systemMessage":"🔄 Auto-committed & pushed — PR updated (no need to run /save)."}'
fi
