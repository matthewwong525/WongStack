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
#   4. PR comments by an installed app      -> the newest bot comment that names
#      (Vercel/Netlify/Cloudflare bots)        the head commit; its first preview URL
#
# Only an https address counts, from any method, and a person's comment never
# does: anyone who can comment on a PR could otherwise name the preview, and
# /verify sends the preview its Access key.
#
# Prints the URL on success (and a "via: <method>" line on stderr), nothing on miss.
# Usage: preview-url.sh
set -uo pipefail

# An Artifacts install has no GitHub to ask: the check run for the exact HEAD
# carries the address its deploy reported (wiki/stack/artifacts-route.md).
SCRIPTS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROUTE=$(node "$SCRIPTS/delivery-route.mjs" 2>/dev/null) || exit 0
if [ "$ROUTE" = artifacts ]; then
  node "$SCRIPTS/artifacts-run.mjs" preview
  exit 0
fi
# A copy installed through Connect your assistant asks the app, which filters
# the address as the methods below do.
if [ "$ROUTE" = app ]; then
  node "$SCRIPTS/app-change.mjs" preview
  exit 0
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)
[ -z "$REPO" ] && exit 0
SHA=$(git rev-parse HEAD 2>/dev/null)
[ -z "$SHA" ] && exit 0

# Apex domains of known preview hosts. A deploy always sits on a SUBDOMAIN of
# one of these; the apex on its own is the provider's marketing site.
PREVIEW_HOSTS='vercel\.app|netlify\.app|netlify\.com|pages\.dev|workers\.dev|onrender\.com|render\.com|github\.io|surge\.sh|fly\.dev|herokuapp\.com|amplifyapp\.com'

# Hosts/keywords that signal a deploy preview rather than a generic CI link.
PREVIEW_RE="preview|deploy|ngrok|$PREVIEW_HOSTS"

# Drop candidates whose host is exactly a provider apex. Methods 2-4 match free
# text, and a deploy bot's logo links the apex (Cloudflare's links
# https://workers.dev) above the table with the real URL. This only rejects:
# a constructed URL can answer 200 for a commit that was never deployed.
drop_bare_apex() {
  grep -viE "^https://($PREVIEW_HOSTS)([/?#]|$)"
}

emit() { # emit <url> <method>; anything but an https address is no URL
  # A backslash is a separator to some readers and text to curl, so they disagree on the host.
  if [[ "${1:-}" == https://* && "$1" != *\\* ]]; then
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
  | grep -iE '^https://' | grep -Ei "$PREVIEW_RE" | grep -viE 'github\.com' | drop_bare_apex | head -1)
emit "$URL" "commit status"

# 3. Check-run details_url
URL=$(gh api "repos/$REPO/commits/$SHA/check-runs?per_page=100" --jq '.check_runs[].details_url' 2>/dev/null \
  | grep -iE '^https://' | grep -Ei "$PREVIEW_RE" | grep -viE 'github\.com' | drop_bare_apex | head -1)
emit "$URL" "check run"

# 4. PR comment bodies, one line each, newest first, from bot accounts only:
# a deploy app posts its preview, a person never names it. Only a comment that
# names the head commit counts: a bot that comments once per deploy leaves
# every older commit's preview on the PR too. awk reverses: macOS has no tac.
PR=$(gh pr view --json number --jq .number 2>/dev/null)
if [ -n "$PR" ]; then
  BODY=$(gh api --paginate "repos/$REPO/issues/$PR/comments?per_page=100" \
    --jq '.[] | "\(.user.type)\t\(.body | gsub("[\r\n]+"; " "))"' 2>/dev/null \
    | awk -F '\t' '$1 == "Bot" { sub(/^[^\t]*\t/, ""); line[n++] = $0 } END { while (n > 0) print line[--n] }')
  URL=$(echo "$BODY" | grep -F "${SHA:0:7}" | grep -oiE "https://[a-z0-9._-]*($PREVIEW_RE)[^ )\"'>|]*" | drop_bare_apex | head -1)
  emit "$URL" "PR comment"
fi

exit 0
