# A plan's section links jump inside the inbox

**Status:** building
**Branch:** plan-jump-links
**Open questions:** none

## Why

In the inbox, tapping *Why*, *Changes*, *Decisions* or *Notes* at the top of a plan blanks the plan. You have to go back and open it again. The same links work when the plan's page is opened on its own.

## What Changes

- **A section link scrolls to its section.** In the inbox, tapping *Changes* moves the plan down to its *What Changes* list, and the plan stays on the screen. The other section links and the plan's own `#` links do the same. A link to another page still opens in its own tab. A plan sent before this update keeps the old behaviour until its chat rebuilds it.
  ```mermaid
  flowchart LR
    tap["Tap Changes"] --> now["Now: the plan goes blank"]
    tap --> after["After: the plan scrolls to What Changes"]
  ```

- **A check proves it in a real browser.** A test opens a plan inside a sealed frame, as the inbox does, taps a section link, and fails if the plan leaves the frame or doesn't scroll.

Non-goals: how the inbox frames a plan, and links that open other pages.

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: a section link on a plan's page in the inbox scrolls the plan instead of loading another page in its frame.

## Impact

- `.agents/skills/plan/references/review-kit.html`: in a frame, a `#` link scrolls to its target in place.
- `scripts/tests/review-browser.test.mjs` (a framed page in a real browser) and `scripts/tests/review.test.mjs`.
- Installs get it by their next sync: a `CHANGELOG.md` `## Next (patch)` entry.

## Decision log

- **2026-10-25** — Assumed: the fix lives in the plan's page, not the inbox, because the inbox can't reach into the sealed frame to catch a tap.
- **2026-10-25** — Assumed: a plan sent before the fix stays as it is until its chat rebuilds it, because the inbox shows the page exactly as it was sent.
- **2026-10-25** — Assumed: a plan opened on its own keeps today's links, because they already work there and change the address bar a reader can share.
- **2026-10-25** — Built: every task but the preview check; a second look found nothing to fix.
