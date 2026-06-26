#!/usr/bin/env bash
# Best-effort, zero-config discovery of the per-commit PREVIEW URL for the current
# branch. Most preview providers (Vercel, Netlify, Cloudflare Pages/Workers, Render,
# GitHub Pages PR previews, etc.) attach the URL to the commit or PR in one of a few
# standard ways — this tries them in order and prints the first URL it finds.
#
# Order of attempts:
#   1. GitHub Deployments for the head SHA  -> latest status .environment_url
#   2. Commit statuses for the head SHA     -> .target_url that looks like a preview
#   3. Check-runs for the head SHA          -> .details_url that looks like a preview
#   4. PR comments (Vercel/Netlify/etc bots)-> first preview-looking URL in the body
#
# Prints the URL on success (and a "via: <method>" line on stderr), nothing on miss.
# Usage: preview-url.sh
set -uo pipefail

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)
[ -z "$REPO" ] && exit 0
SHA=$(git rev-parse HEAD 2>/dev/null)
[ -z "$SHA" ] && exit 0

# Hosts/keywords that signal a deploy preview rather than a generic CI link.
PREVIEW_RE='preview|deploy|vercel\.app|netlify\.app|netlify\.com|pages\.dev|workers\.dev|onrender\.com|render\.com|github\.io|surge\.sh|fly\.dev|herokuapp\.com|ngrok|amplifyapp\.com'

emit() { # emit <url> <method>
  if [ -n "${1:-}" ] && [ "$1" != "null" ]; then
    echo "via: $2" >&2
    echo "$1"
    exit 0
  fi
}

# 1. Deployments -> environment_url
for d in $(gh api "repos/$REPO/deployments?sha=$SHA&per_page=20" --jq '.[].id' 2>/dev/null); do
  URL=$(gh api "repos/$REPO/deployments/$d/statuses" \
    --jq 'map(select(.environment_url != null and .environment_url != ""))[0].environment_url' 2>/dev/null)
  emit "$URL" "deployment $d"
done

# 2. Commit statuses target_url
URL=$(gh api "repos/$REPO/commits/$SHA/statuses?per_page=100" --jq '.[].target_url' 2>/dev/null \
  | grep -Ei "$PREVIEW_RE" | grep -viE 'github\.com' | head -1)
emit "$URL" "commit status"

# 3. Check-run details_url
URL=$(gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" --jq '.check_runs[].details_url' 2>/dev/null \
  | grep -Ei "$PREVIEW_RE" | grep -viE 'github\.com' | head -1)
emit "$URL" "check run"

# 4. PR comment bodies
BODY=$(gh pr view --json comments --jq '.comments[].body' 2>/dev/null)
URL=$(echo "$BODY" | grep -oiE "https?://[a-z0-9._-]*($PREVIEW_RE)[^ )\"'>]*" | head -1)
emit "$URL" "PR comment"

exit 0
