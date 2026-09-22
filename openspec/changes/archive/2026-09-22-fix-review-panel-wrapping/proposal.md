# Wrap long paths in the review page's change list

**Status:** ready-to-ship
**Branch:** fix/review-kit-overflow
**Open questions:** none

## Why

At desktop width the review page's left change list clips any bullet that names a long path: the list measures 355px of content in a 302px column, so `.claude/skills/explore/references/asking-the-user.md` is cut mid-path at the panel edge with no way to read the rest. `.panel code` sets a background and padding but never allows a break inside the token. The page promises a reviewer needs no pan or zoom; here they get neither the text nor a scrollbar.

## What Changes

- **Long tokens in the panel wrap instead of clipping.** `.panel code` gets `overflow-wrap:anywhere` in [the review kit](../../../.claude/skills/plan/references/review-kit.html), so a path or identifier too wide for the column breaks onto the next line. Measured on the v16.5.0 review page: the list goes from 355px of content in a 302px column to 302px in 302px. (review.html#/wrapping)
- **The rule covers every width, not only phones.** The phone requirement already says long tokens fit from 320px upward; the layout requirement now says the same for the selected item's text and the change list at any width.
- **Existing pages are not rewritten.** The kit change reaches pages built from it; archived reviews keep the page that shipped with them.
- **The release ritual runs:** a `VERSION` patch bump, a newest-first `CHANGELOG.md` entry, and the payload checks.

**Non-goals:** no other kit styling, no change to the panel's width or layout, no regeneration of historical archives.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `ux-wireframes`: the layout requirement gains the rule that a long token wraps rather than clipping, at any width.

## Impact

- **Payload:** one CSS declaration in `.claude/skills/plan/references/review-kit.html`, plus `VERSION` and `CHANGELOG.md`.
- **Runtime:** none.

## Decision log

- **2026-09-22** — The user chose this fix over the other next steps after v16.5.0 merged; it was found by the critic pass on that change's review page and deliberately left out of it, because editing the kit is its own release.
- **2026-09-22** — Assumed `overflow-wrap:anywhere` over `word-break:break-all`, because it breaks only when the token cannot fit, leaving ordinary prose unbroken.
- **2026-09-22** — Assumed the fix belongs on `.panel code` alone: the measurement showed the whole 53px overflow came from one `code` element, and every other list item already fit.
- **2026-09-22** — Assumed no archived review is rebuilt; the payload rule forbids rewriting historical archives, and the kit's own rule says new behavior applies to pages generated from the current kit.
- **2026-09-22** — The bounded explore pass asked nothing: the user's selection settled the scope, and the remaining details are the assumptions above.
- **2026-09-22** — Implementation checkpoint: version 16.5.1. `.panel code` now carries `overflow-wrap:anywhere`. Measured on this change's own page, built from the fixed kit: the change list and both Why paragraphs report equal scroll and client width at 1440×1000, and nothing overflows at 390×844. A critic pass on the review page found the visual had drawn an invented bullet and used a strikethrough line that read as a deletion; one revision round fixed both. CI is the remaining task.
- **2026-09-22** — CI green on PR #98 (`SAVE_GATE_RESULT=SUCCESS`); every task is complete and the change is ready to ship.
- **2026-09-22** — Archive checkpoint: archived as `openspec/changes/archive/2026-09-22-fix-review-panel-wrapping/` with `--skip-specs`, the `ux-wireframes` delta having already been reconciled at the implementation checkpoint.
