# Every review card has the same width

**Status:** ready-to-ship
**Branch:** review-page-sizing
**Open questions:** none

## Why

On a computer, a review page uses two widths. A card with pictures is wide, about 1160 px. The title, *Why*, a card with only words, *What the build needs*, and *Decisions* are narrow, about 700 px, and centered. So the left edge jumps in and out as you scroll, and the page looks broken.

## What Changes

- **On a computer, every part of the review page has the same width.** The title, *Why*, every card, *What the build needs*, *Decisions*, and *Notes* use the wide width that picture cards use now. They all start at one left edge and stop at one right edge. A card with only words is as wide as a card with pictures. The bar at the bottom lines up with the same edges.
  ```picture
  Before, computer: pictures/before-computer.png
  After, computer: pictures/after-computer.png
  ```
- **A page with no pictures is wide too**, so every review page looks the same.
- **On a phone, and on a screen narrower than 900 px, nothing changes.**

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `review-pages`: a new requirement that every part of a review page shares one width on a wide screen.

## Impact

- `.agents/skills/plan/references/review-kit.html`: at 900 px and wider, drop the 700 px limit on the header, sections, and words-only cards; align the bottom bar and its pop-ups to the 1160 px column.
- `scripts/tests/review-browser.test.mjs`: a test that the parts share one left and right edge at 1280 px.
- `wiki/review-pages.md`: the frame and the card view say every part has one width.
- `CHANGELOG.md`: a patch entry.

## Decision log

- **2026-11-09** — Asked which width every card should use on a computer → chose all wide: the width picture cards use now, about 1160 px.
- **2026-11-09** — Assumed: a page with no picture cards is wide too, because every review page should look the same, and the person reads a half-empty frame as inconsistent.
- **2026-11-09** — Assumed: the bottom bar lines up with the wide column, because a narrow bar under wide cards is the same mismatch.
- **2026-11-09** — Assumed: nothing changes below 900 px, because there every part is already one width.
- **2026-11-09** — Archive checkpoint: built, reviewed once (1 finding fixed: the bottom bar now lines up with the cards when a scrollbar shows), archived, and saved from `review-page-sizing` for /ship as 51.7.2.
