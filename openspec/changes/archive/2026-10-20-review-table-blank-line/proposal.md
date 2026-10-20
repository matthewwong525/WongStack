# Proposal

**Status:** ready-to-ship
**Branch:** fix-bug
**Open questions:** none

## Why

A table written with a blank line above it, as Markdown usually allows, fell out of its step on the review page: it showed under the step as one run of pipes and dashes, not a table. A plan reviewed on a phone ("How the numbers are worked out", step 4 of a daily profit plan) became hard to read, and nothing warned the assistant that wrote it.

## What Changes

- **A table cut off from its step now stops the page build**, the same way a cut-off drawing already does. The build names the line and says a blank line ends a step, so the assistant joins the table to its step and the page shows a real table.
  ```mermaid
  flowchart LR
    table --> joined{under its step?}
    joined -->|yes| page[a real table]
    joined -->|no| stop[build stops, names the line]
  ```

- **The drawing guide says it up front:** put a table right under its step.

Non-goals: accepting a blank line inside a step; changing how tables look.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ux-wireframes`: a table outside any What Changes bullet stops the build.

## Impact

`.agents/skills/plan/scripts/build-review.mjs`, `scripts/tests/review.test.mjs`, `.agents/skills/plan/references/drawings.md`.

## Decision log

- **2026-10-20** — Asked: Matthew sent a phone screenshot of a review page whose step 4 table showed as plain text and asked to fix it and ship. The source plan had a blank line between the step and its indented table.
- **2026-10-20** — Assumed: stop the build rather than accept the blank line, matching the existing rule for drawings (a blank line ends a bullet; a fence after one stops the build).
- **2026-10-20** — Archive checkpoint: archived by /ship; the build now stops on the reported plan at line 79, and the drawing guide was trimmed to fit the instruction budget.
