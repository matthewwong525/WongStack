## Context

The review kit (`.agents/skills/plan/references/review-kit.html`) sets `main` to 1160 px at 900 px and wider, then holds `main > header`, `main > section`, and `#changes.wide .item:not(.has-view)` and `.aside` to 700 px, centered. `build-review.mjs` adds `class="wide"` to `#changes` only when a card has a view. The result is two widths on one page. [screens-first-review](../archive/2026-11-09-screens-first-review/design.md) chose the 700 px limit for line length; the person now reads the mixed widths as broken.

## Goals / Non-Goals

**Goals:** one column width for every part at 900 px and wider, on every page.

**Non-Goals:** no change below 900 px; no change to the card's two-column layout, picture heights, or full screen.

## Decisions

- **Drop the 700 px rules in the 900 px media query**; `main` stays `max-width:1160px; padding:0 24px`. Every child then fills `main`. Alternative: a 960 px middle width; the person chose the wide one.
- **The `wide` class on `#changes` stops mattering for width.** Leave the class: tests and other rules may read it; remove it only if nothing reads it after the CSS change.
- **Align `.bar`, `#ready-confirm`, and `#ready-says`** to the 1160 px column at 900 px and wider (`max(24px, calc((100vw - 1160px) / 2 + 24px))`), overriding the 701 px rule's 700 px math.

## Risks / Trade-offs

- Long text lines in *Why* and words-only cards at 1280 px (about 110 characters) → accepted by the person's choice; the cards with pictures already use a 380 px words column.
- The bottom bar's buttons get wider → they still fill the bar as one row, as they do on a phone.
