# Design

## Context

See proposal.md for why. Today `build-review.mjs` turns a `mermaid` fence into inline SVG through the vendored Pele and checks it with `unsafeSvg`, a denylist that judges markup only. Every other fence becomes a `<pre class="art">` with a note target per line. Table-shaped lines inside a bullet are joined into the bullet's text. The kit (`review-kit.html`) styles `.art.pic` from the shared look's CSS variables, so pictures follow the light and dark switch, and its `where()` maps note ids (`item-N-line-K`, `item-N-picture-K`) to labels.

## Goals / Non-Goals

**Goals:**
- Hand-written `svg` fences reach the page only as markup the builder re-serialized itself from an allowlist.
- Sketches follow the page's theme without any style or script inside the SVG.
- Tables are real HTML tables with a note target per body row.

**Non-Goals:**
- No change to Mermaid rendering or Pele.
- No SVG in `/explore` chat output.
- No rebuild of archived pages.

## Decisions

### Parse, allowlist, and re-serialize the SVG

A small tokenizer in the builder reads the fence into start tags, end tags, self-closing tags, and text. Allowed elements: `svg`, `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `tspan`, `title`. Allowed attributes: `xmlns`, `viewBox`, `width`, `height`, `x`, `y`, `x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `rx`, `ry`, `dx`, `dy`, `points`, `d`, `transform`, `fill`, `stroke`, `stroke-width`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`, `opacity`, `fill-opacity`, `font-size`, `font-weight`, `text-anchor`, `dominant-baseline`. Anything else (an `on*` handler, `style`, `href`, `<a>`, `<image>`, `<foreignObject>`, a `<!DOCTYPE>` or CDATA, an entity other than the five XML ones and numeric ones, a `url(` in any value) refuses the picture with the item, picture, proposal line, and the offending name. Unbalanced tags or a root that is not one `<svg>` with a `viewBox` refuse it too.

The builder then writes the tree back out itself, attribute values escaped, so nothing the author typed reaches the page verbatim. The existing `unsafeSvg` runs on the result as a second net.

*Alternative:* reuse `unsafeSvg` alone. Rejected: a denylist built for Pele's known output misses `onload=` and friends, which hand-written markup can carry, and the page can be opened through a reply link.

*Alternative:* a DOM sanitizer dependency. Rejected: the builder ships to every install with no dependencies beyond the vendored Pele; the allowlist is short.

### Named colors become classes

`fill` and `stroke` accept `none`, `currentColor`, or a kit color name: `bg`, `fg`, `muted`, `subtle` (muted foreground), `line` (border), `card`, `danger`. The builder rewrites a name to a class (`fill="muted"` → `class="f-muted"`), and the kit maps each class to the look's CSS variables under `.art.sketch`, so the theme switch repaints sketches live. `text` defaults to `fill: var(--foreground)` and the page font. Any other color value passes through with a warning that it will not follow dark mode.

*Alternative:* `var(--muted)` in a presentation attribute. Rejected: presentation attributes don't take `var()`, and `style` is refused.

### Sketches reuse the picture frame

An `svg` fence renders through the same wrapper as a Mermaid picture: folded `<details class="drawing">`, `.art.pic.sketch` with `data-note="item-N-picture-K"`, width in em from the `viewBox` width over 13 px, and the 640 px warning. Mermaid and SVG pictures share one counter per item, so labels read *Change #2, picture 1* either way. Full screen, zoom, and whole-picture notes come with no kit change beyond the color classes. No `id` attribute is allowed, so two sketches never collide.

### Tables parse inside the bullet

In `blocks()`, a run of lines inside a bullet that trimmed start and end with `|` and whose second line is a separator (`|---|:--:|`) becomes a `table` drawing on the item instead of text. Cells go through `inline()`. It renders unfolded, as `<div class="frame"><table class="tbl">`, header in `<thead>`, each body row `<tr data-note="item-N-row-K" tabindex="0">`. The kit's `where()` regex gains `row`, labeled *row K*; `labelOf` joins a row's cells with ` · `. Without a separator row the lines stay text, so older proposals with stray pipes build as before.

*Alternative:* a table as an SVG picture. Rejected by the person: a page table reads better and takes per-row notes.

### Text fences stay

A `text` (or untagged) fence keeps its current rendering, line notes, width warning, and crooked-box check, for file trees and for proposals written before this change. Archived pages are never rebuilt.

### Guidance

`drawings.md` swaps its screen and table text patterns for one compact `svg` wireframe example (8 px grid, named colors, labels in `text`) and one Markdown table, and keeps one short text pattern marked *for chat and file lists*. `/explore` keeps drawing `text` in chat. The plan skill's drawing line, the proposal rule in `openspec/config.yaml`, and `wiki/ux-principles.md#the-review-file` name the new kinds. Added words are offset by cuts so `measure-context.mjs --check` stays under its baseline.

## Risks / Trade-offs

- [Hand-placed coordinates come out misaligned or labels overflow their boxes] → the guide's example uses a fixed grid and font size; the width warning still runs; a reviewer can note the picture.
- [SVG sketches cost more tokens than text] → the guide keeps sketches to gray boxes and labels, and one sketch per screen by default.
- [The tokenizer misreads odd but valid SVG] → anything it can't read refuses the picture with its line; never passes it through.
- [A new kit class or `where()` change breaks notes saved on older pages] → note ids for lines and pictures are unchanged; `row` is only added.

## Migration Plan

Ships as a `minor` release. Installs get it through `/wong-sync`. Plans in flight keep their text sketches and build as before; a rebuilt page gains nothing until its proposal adds `svg` fences or tables. Rollback is reverting the release.
