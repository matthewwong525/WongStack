---
slug: fix-review-panel-wrapping
started: 2026-09-22
updated: 2026-09-22
---

# Wrap long paths in the review page's change list

## Where this came from

The critic pass on [`add-structured-asks`](add-structured-asks.md) found the defect and it was deliberately left out of that change, because editing the review kit is its own payload release. The user picked it as the next step once v16.5.0 merged.

## The measurement is the evidence

The defect and the fix were both measured in a browser rather than judged by eye:

- Before, on the v16.5.0 review page at 1440×1000: `ol.changes` `scrollWidth` 355 against `clientWidth` 302, with one `li` — bullet 1, carrying `.claude/skills/explore/references/asking-the-user.md` — accounting for all 53px. Bullets 2 to 6 measured 300/300.
- Injecting `.panel code{overflow-wrap:anywhere}` took the list to 302/302.
- After the real edit, on this change's own page built from the fixed kit: the list and both Why paragraphs report equal scroll and client width, and nothing overflows at 390×844.

`overflow-wrap:anywhere` beat `word-break:break-all` because it breaks only when the token cannot fit, leaving short identifiers and ordinary prose alone.

## Worth knowing next time

- **A squash-merged branch still reads as "ahead".** After shipping the previous change, `git log origin/main..HEAD` showed its three commits, so `/ship`'s preflight would not have taken the pull-in path. The fix was to branch from `origin/main` before starting, so the new PR carried only this work.
- **The visual author invents plausible detail.** The first draft of `review-visuals.html` drew a bullet ("Structured questions live in…") that exists on no page, and used the kit's `.line del` class — struck-through grey — for the clipped path, which reads as *this path is being deleted* when the change wraps it. The critic caught both. When a visual cites a measurement, check that what it draws is the thing that was measured.
