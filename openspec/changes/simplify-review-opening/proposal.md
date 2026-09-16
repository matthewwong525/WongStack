# Simplify the review opening

**Status:** ready-to-ship
**Open questions:** none

## Why

The first review page repeats the full Why and What Changes list in both columns. This makes the page hard to scan and delays the first useful view.

## What Changes

- Open the first change in the center and select its sidebar item. Keep direct links to other changes working. (review.html#/opening/first)
- Replace the repeated landing summary with a short fallback message. Keep the sidebar as the proposal navigation and stop Previous at the first change. (review.html#/fallback/invalid/guidance)
- Keep the phone toolbar on one compact row. Put state selection and note actions behind a Tools button. (review.html#/phone/collapsed/compact)

**Non-goals:** redesigning the sidebar, changing annotations, or rewriting archived review pages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: open on the first change without a duplicate overview; keep text-only and empty proposals usable.

## Impact

The shared review kit in `.agents/skills/plan/references/review-kit.html` (also reached through the `.claude` symlink), the navigation spec, and the payload release files. No dependencies or network services are added.

## Decision log

- **2026-09-16** — Asked how the page should open → the user chose the first change in the center, with the sidebar used for navigation. Scope is the shared template and this change's review page; archived pages remain the shipped record.
- **2026-09-16** — The user also reported that the phone toolbar takes too much space. Keep change navigation visible and disclose the secondary tools on demand.

- **2026-09-16** — Implemented the opening route, short fallback, and compact phone toolbar. Browser and payload checks passed. Released as 14.1.1; synced the ux-wireframes navigation and phone requirements.
