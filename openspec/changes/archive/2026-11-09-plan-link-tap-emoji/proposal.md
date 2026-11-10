# The plan's link is one tap, with a pointing hand

**Status:** ready-to-ship
**Branch:** plan-link-tap-emoji
**Open questions:** none

## Why

When a plan or a preview is ready, the chat prints *Click here to see the plan:* and then a small link named *review.html*. Only the file name is a link, so you must find the small word to tap. The words *Click here* are not a link, and that confuses the reader.

## What Changes

- **The whole line is the link, and it starts with 👉.** You tap anywhere on the line to open the plan. It says *Tap here*, not *Click here*, because most people open it on a phone.
  ```text
  Before: Click here to see the plan: review.html
  After:  👉 Tap here to see the plan
  ```
- **The preview and review lines change the same way.** *👉 Tap here to see the preview* and *👉 Tap here to see the review* are one link each.
- **A question that leaves out the link is still caught.** The check that sends back a question without the plan's link reads the new line too.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `asking-the-user`: the check that sends back a question missing its link names the printed plan or preview link, not the old *Click here* wording.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: `planLink()` prints `[👉 Tap here to see <what>](<link>)`.
- `.agents/skills/apply/scripts/preview-review.mjs`: uses `planLink(link, 'the preview')`.
- `.agents/skills/explore/scripts/ask-check.mjs`: the `CLICK` pattern matches the new line.
- `.agents/skills/explore/references/asking-the-user.md`, `wiki/development/reply-links.md`: the new wording.
- `scripts/tests/review.test.mjs`, `ask-check.test.mjs`, `preview-review.test.mjs`: the new line.
- `CHANGELOG.md`: a patch entry.

## Decision log

- **2026-11-09** — Asked to make the whole *see the plan* line one link and start it with 👉, as `[👉 Tap here to see the plan](<link>)` → chose that exact line.
- **2026-11-09** — Assumed: the preview and review lines change the same way, because the person named *when showing the review*, and one shared helper keeps the three lines alike.
- **2026-11-09** — Assumed: the link-check reads only the new line, because no tool prints the old one after this change.
- **2026-11-09** — Archive checkpoint: built, reviewed once (no findings), archived, and saved from `plan-link-tap-emoji` for /ship as 51.7.2.
- **2026-11-09** — Archive checkpoint: renumbered to 51.7.3 after 51.7.2 shipped first, and saved again from `plan-link-tap-emoji` for /ship.
