## Context

`.panel code` in [the review kit](../../../.claude/skills/plan/references/review-kit.html) styles inline code in the change list with a background and horizontal padding, and nothing else. A path has no space to break at, so it overflows its `li`. The panel is `overflow:auto`, but the overflow is horizontal inside a column sized `flex:0 0 340px`, and the text simply runs past the edge. Measured on the shipped v16.5.0 review page at 1440×1000: `ol.changes` reports `scrollWidth` 355 against `clientWidth` 302, and one `li` accounts for all of it. See [proposal.md — Why](proposal.md#why).

## Goals / Non-Goals

**Goals:** a long path in a bullet is readable at any width, with no horizontal scrolling and no clipping.

**Non-Goals:** no other kit styling, no panel-width change, no rebuild of archived pages.

## Decisions

**`overflow-wrap:anywhere` on `.panel code`.** It breaks a token only when it cannot fit, so ordinary prose and short identifiers are untouched. *Alternative:* `word-break:break-all` — rejected because it breaks eagerly, splitting short tokens that would have fit. *Alternative:* `overflow-x:auto` on the `li` — rejected because a per-item scrollbar in a 302px column is worse than a wrapped path.

**One declaration, on the element that overflows.** The measurement attributes the whole 53px to a single `code` element; the surrounding `li`, the `.kind` anchor line, and the notes list all fit. Widening the fix beyond `.panel code` would change layout that has no defect.

**Verified by measurement, not by eye.** The same browser measurement that found the defect confirms the fix: injecting the declaration takes `scrollWidth` from 355 to 302 on the same page. The task repeats it on a page built from the fixed kit.

## Risks / Trade-offs

- **A wrapped path is harder to copy in one piece** → It is still selectable and complete; the alternative is text the reviewer cannot read at all.
- **The kit changes for every future page** → That is the intent, and the kit rule already scopes new behavior to pages generated from the current kit, leaving archives alone.
