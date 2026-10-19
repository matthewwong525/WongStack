# Design

## Context

See proposal.md for why. Today `build-review.mjs` turns a `mermaid` fence into inline SVG through the vendored Pele and checks it with `unsafeSvg`, a denylist that judges markup only. Every other fence becomes a `<pre class="art">` with a note target per line. Table-shaped lines inside a bullet are joined into the bullet's text. The kit (`review-kit.html`) styles `.art.pic` from the shared look's CSS variables, so pictures follow the light and dark switch, and its `where()` maps note ids (`item-N-line-K`, `item-N-picture-K`) to labels.

## Goals / Non-Goals

**Goals:**
- Screen sketches use the look's existing shadcn parts with automatic layout, inert.
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

### Screens are allowlisted HTML in the look's parts

Asked after the SVG build: hand-placed SVG coordinates overlap and SVG text never wraps, while the review page already carries the app's shadcn parts in plain CSS (`look.css`: `button`, `.btn-primary`, `.btn-ghost`, `input`/`.field`, `.card`, `.tag`, `.tag-outline`, `.skeleton`), generated from the app's own tokens by `look.mjs`. A `screen` fence is HTML the builder parses with the same tokenizer, allowlists, and re-serializes.

- Elements: `div`, `span`, `p`, `h3`, `h4`, `b`, `i`, `small`, `ul`, `ol`, `li`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `label`, `button`, `input`, `textarea`, `select`, `option`.
- Attributes: `class`, `type` (`text`, `checkbox`, `radio`), `placeholder`, `value`, `checked`, `disabled`, `selected`, `colspan`, `rowspan`.
- Classes: the look's parts (`card`, `btn`, `btn-primary`, `primary`, `btn-ghost`, `field`, `tag`, `tag-outline`, `skeleton`) plus kit layout helpers (`row`, `col`, `grow`, `gap`, `phone`, `muted`, `danger`, `bar`, `sep`). `bar` is a gray text placeholder; `phone` caps the frame at 360 px. Any other class refuses the sketch with its name, so a typo never silently loses styling.
- Refused: `style`, every `on*`, `id`, `href`, `src`, `<a>`, `<img>`, `<script>`, `<form>`, `<iframe>`, `<svg>` inside a screen, and anything unlisted.

The sketch sits in an inert box (`<div class="sk" inert>`) inside the `.art.pic.screen` picture wrapper, so controls take no focus or taps, and a tap falls through to the wrapper and places a note. The builder writes `bar` out as `sk-bar`, because the page's own footer is `.bar`. `.skeleton` holds still inside sketches (no pulse). Width: `phone` sketches are 360 px; others take the frame width up to 640 px, so no build-time measuring is needed. The kit fits the frame by its em width like other pictures.

*Alternative:* render the app's React components at build time. Rejected: the builder ships with no app dependencies, and installs may have changed or removed components; the look's CSS is already the agreed shared copy.

*Alternative:* SVG only (what was first built). Kept for free drawings, since arrows and layers don't fit a box layout.

### Sketches reuse the picture frame

An `svg` or `screen` fence renders through the same wrapper as a Mermaid picture: folded `<details class="drawing">`, `.art.pic.sketch` with `data-note="item-N-picture-K"`, width in em from the `viewBox` width over 13 px, and the 640 px warning. Mermaid, screen, and SVG pictures share one counter per item, so labels read *Change #2, picture 1* either way. Full screen, zoom, and whole-picture notes come with no kit change beyond the color classes. No `id` attribute is allowed, so two sketches never collide.

### Tables parse inside the bullet

In `blocks()`, a run of lines inside a bullet that trimmed start and end with `|` and whose second line is a separator (`|---|:--:|`) becomes a `table` drawing on the item instead of text. Cells go through `inline()`. It renders unfolded, as `<div class="frame"><table class="tbl">`, header in `<thead>`, each body row `<tr data-note="item-N-row-K" tabindex="0">`. The kit's `where()` regex gains `row`, labeled *row K*; `labelOf` joins a row's cells with ` · `. Without a separator row the lines stay text, so older proposals with stray pipes build as before.

*Alternative:* a table as an SVG picture. Rejected by the person: a page table reads better and takes per-row notes.

### Text fences stay

A `text` (or untagged) fence keeps its current rendering, line notes, width warning, and crooked-box check, for file trees and for proposals written before this change. Archived pages are never rebuilt.

### Guidance

`drawings.md` swaps its screen and table text patterns for one compact `screen` example (a card with a bar, a field, and two buttons), one short `svg` free-drawing example, and one Markdown table, and keeps one short text pattern marked *for chat and file lists*. `/explore` keeps drawing `text` in chat. The plan skill's drawing line, the proposal rule in `openspec/config.yaml`, and `wiki/ux-principles.md#the-review-file` name the new kinds. Added words are offset by cuts so `measure-context.mjs --check` stays under its baseline.

## Risks / Trade-offs

- [Hand-placed SVG coordinates come out misaligned] → screens use laid-out HTML; SVG is only for free drawings; the width warning still runs.
- [Screen sketches look finished and pull review toward polish] → the guide puts `bar` placeholders where real text isn't the point, and the What Changes text names what's under review.
- [A future look change restyles old sketches] → acceptable: sketches follow the app, which is the point; archived pages are never rebuilt.
- [SVG sketches cost more tokens than text] → the guide keeps sketches to gray boxes and labels, and one sketch per screen by default.
- [The tokenizer misreads odd but valid SVG] → anything it can't read refuses the picture with its line; never passes it through.
- [A new kit class or `where()` change breaks notes saved on older pages] → note ids for lines and pictures are unchanged; `row` is only added.

## Migration Plan

Ships as a `minor` release. Installs get it through `/wong-sync`. Plans in flight keep their text sketches and build as before; a rebuilt page gains nothing until its proposal adds `svg` fences or tables. Rollback is reverting the release.
