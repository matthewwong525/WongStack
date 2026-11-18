<!-- openspec-archive v1 2026-10-19-svg-screen-sketches -->
<!-- file proposal.md utf8 6552 -->
# Proposal

**Status:** ready-to-ship
**Branch:** review-svg-conversion
**Open questions:** none

## Why

Screen sketches on the review page are typed out of line characters, so they are hard to draw well: a box drawn one character off comes out crooked, and nothing can be placed freely, shaded, or overlapped. Flows already show as pictures. Drawing screens as pictures too puts every drawing on the page in one format and lets the assistant draw what a screen really looks like.

## What Changes

- **The assistant sketches a screen from the app's own parts.** A sketch uses the app's buttons, text boxes, cards, and tags, laid out in rows and columns, so it looks like the screen you'll get and switches with light and dark mode. Text wraps and boxes fit their words on their own, so nothing overlaps. Gray bars stand in for real text, which keeps the review on the flow, not the paint. It opens full screen, zooms, and takes a note on the whole sketch.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Notes</h3><span class="tag">3</span></div>
    <div class="bar"></div>
    <input type="text" placeholder="A question or a change">
    <div class="row gap"><span class="grow"></span>
      <button class="btn-ghost">Cancel</button><button class="btn-primary">Save</button></div>
  </div>
  ```

- **Anything that isn't a screen can be a free drawing.** Arrows pointing at parts, layers, or a custom diagram are drawn as SVG pictures in the page's own colors. They also open full screen, zoom, and take a note on the whole picture.
  ```svg
  <svg viewBox="0 0 280 64">
    <rect x="168" y="8" width="104" height="48" rx="8" fill="card" stroke="line"/>
    <text x="220" y="37" text-anchor="middle">Save</text>
    <path d="M16 32h136m-10-7 10 7-10 7" fill="none" stroke="fg" stroke-width="2"/>
    <text x="16" y="22" fill="subtle">the new button</text>
  </svg>
  ```

- **A table shows as a real table**, in the page's look, and you can leave a note on one row.
  | Drawing | Before | After |
  |-|-|-|
  | A screen | typed lines | the app's own parts |
  | A free drawing | none | a picture |
  | A table | typed lines | a real table, a note per row |
  | A flow | a picture | a picture, unchanged |
  | A file list | typed lines | typed lines, unchanged |

- **A picture that could do harm never reaches the page.** A sketch or drawing holding a script, a link, an outside image, or anything else outside a short list of allowed parts stops the page build. The build names the item and line, and the last good page stays. A sketch that is too wide, or uses colors that would vanish in dark mode, still builds with a warning.
  ```mermaid
  flowchart LR
    sketch --> check{only shapes?}
    check -->|yes| page[on the page]
    check -->|no| stop[build stops, names the line]
  ```

- **Flows stay as they are**, drawn in Mermaid, which already makes pictures. Small text listings, such as a list of files, keep their plain text drawing. While you and the assistant are thinking an idea through in chat, drawings stay plain text, because chat shows no pictures. Pages of plans made before this change still build.

Non-goals: changing how flow pictures are drawn; making sketches into finished designs; showing pictures in chat.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ux-wireframes`: a screen becomes a `screen` fence of allowlisted HTML in the shared look's shadcn parts; a free drawing is an `svg` fence drawn inline after an allowlist check; a table becomes a Markdown table rendered as an HTML table with per-row notes; `text` fences remain for listings and chat.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: `screen` and `svg` fence sanitizers and inline pictures; Markdown table parsing inside a bullet.
- `.agents/skills/plan/references/review-kit.html`: row note targets, table and sketch color classes, screen layout helpers.
- `.agents/skills/plan/references/drawings.md`, `.agents/skills/plan/SKILL.md`, `openspec/config.yaml` proposal rule, `wiki/ux-principles.md`: drawing guidance.
- `scripts/tests/review-pictures.test.mjs`, `scripts/tests/review.test.mjs`, `scripts/tests/review-browser.test.mjs`.
- `CHANGELOG.md`: a `minor` entry.

## Decision log

- **2026-10-19** — Asked how screen sketches should be drawn → chose hand-drawn SVG written by the assistant, for the most freedom.
- **2026-10-19** — Asked what happens to Mermaid flows → chose to keep Mermaid for flows; hand-drawn SVG only where Mermaid can't draw the thing.
- **2026-10-19** — Asked how tables should show → chose a real page table, notable per row.
- **2026-10-19** — Assumed: a hand-drawn picture passes an allowlist of drawing shapes and attributes, stricter than the Mermaid check, because hand-written markup can carry event handlers the current check misses.
- **2026-10-19** — Assumed: a note on a sketch covers the whole picture, matching flow pictures.
- **2026-10-19** — Assumed: the same 640 px width warning applies to sketches.
- **2026-10-19** — Assumed: small listings such as a file tree keep a plain text fence, because a picture adds nothing there.
- **2026-10-19** — Assumed: drawings in chat stay plain text, because chat shows no pictures.
- **2026-10-19** — Assumed: pages of older plans with text screen sketches still build, with no warning, because archives are never rewritten.
- **2026-10-19** — Check: built and checked locally: an `svg` sketch and a table drew in light and dark on this page, a sketch holding `onclick=` stopped the build and kept the last page, and all local checks passed.
- **2026-10-19** — Asked whether wireframes should use SVG or the shadcn components → chose shadcn-style HTML for screens, with hand-drawn SVG kept for arrows and freeform drawings, because laid-out HTML wraps text and matches the real app while hand-placed SVG overlaps.
- **2026-10-19** — Assumed: a screen sketch uses only the look's existing parts (button, text box, card, tag, gray placeholder) plus a few layout helpers, and its controls do nothing when tapped, because the page runs no app code and a tap there must place a note.
- **2026-10-19** — Check: built and checked locally: the app-parts screen sketch and the SVG arrow drew in light and dark on this page; a screen with `style=` or `<a>` stopped the build and kept the last page; all local checks passed.
- **2026-10-19** — Archived for publishing; trimmed two phrases from the drawing guide to stay under the instruction-size budget after main came in.

<!-- end proposal.md -->
<!-- file design.md utf8 8720 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 3808 -->
# Tasks

## 1. Builder

- [x] 1.1 Add the SVG tokenizer, allowlist, and re-serializer to `.agents/skills/plan/scripts/build-review.mjs`, refusing unknown elements, attributes, handlers, entities, `url(`, and a root without `viewBox`, with one-line errors naming item, picture, proposal line, and the refused name; verify with new cases in `scripts/tests/review-pictures.test.mjs` (handler, `<a>`, `<image>`, `style`, DOCTYPE, missing `viewBox`, unbalanced tags) that each stops the build and leaves the previous page byte-identical
- [x] 1.2 Map named `fill`/`stroke` colors to kit classes and warn on any other color; render `svg` fences through the picture wrapper with a shared per-item picture counter, em width, and the 640 px warning; verify with tests for a valid sketch, a fixed `#ffffff` fill warning, a 700 px warning, and mixed Mermaid and SVG numbering
- [x] 1.3 Parse Markdown tables inside a bullet into `<table class="tbl">` with escaped, inline-formatted cells and a `data-note="item-N-row-K"` per body row, leaving lines without a separator row as text; verify with tests in `scripts/tests/review.test.mjs` for a table, a cell holding `</script>`, and pipes without a separator

## 2. Review kit

- [x] 2.1 Add `.art.sketch` color classes mapped to the look's variables, default text fill and font, and `.tbl` styles to `.agents/skills/plan/references/review-kit.html`; extend `where()` and `labelOf()` for `row` notes; verify in `scripts/tests/review-browser.test.mjs` that a sketch fits 320 px, opens full screen, repaints on the dark switch, and that a row note copies as *Change #N, row K*

## 3. Guidance

- [x] 3.1 Rewrite `.agents/skills/plan/references/drawings.md` with one `svg` wireframe pattern, one Markdown table, and one short text pattern for chat and file lists; update the drawing line in `.agents/skills/plan/SKILL.md` and the proposal and design rules in `openspec/config.yaml`; verify `node scripts/check-openspec-config.mjs` passes and `node scripts/measure-context.mjs --check` stays under baseline
- [x] 3.2 Update `wiki/ux-principles.md` (the review file section) for SVG sketches, page tables, and text for listings and chat; verify `node scripts/check-payload-links.mjs` passes
- [x] 3.3 Add a `## Next (minor) — Screens drawn as pictures` entry to `CHANGELOG.md` in plain words, no hand step; verify it sits at the top of the entries

## 4. Screens from app parts

- [x] 4.1 Add the `screen` fence to `build-review.mjs`: its element, attribute, and class allowlists on the shared tokenizer, re-serialization, the inert picture wrapper, and the shared picture counter; verify with tests for a valid card-and-buttons sketch, and refusals of `style`, `onclick`, `<a>`, `<img>`, an unknown class, and a nested `<svg>`, each leaving the previous page byte-identical
- [x] 4.2 Add the layout helpers (`row`, `col`, `grow`, `gap`, `phone`, `muted`, `danger`, `bar`, `sep`) and a still `.skeleton` under `.art.screen` to `review-kit.html`; verify in `review-browser.test.mjs` that a `phone` sketch fits 320 px, a tap on its button places a note instead of focusing it, and the dark switch repaints it
- [x] 4.3 Update `drawings.md` (a `screen` example, a short `svg` free-drawing example), the plan skill's drawing line, `openspec/config.yaml`, and `wiki/ux-principles.md`; redraw this proposal's item 1 sketch as a `screen` fence; verify `measure-context.mjs --check`, `check-openspec-config.mjs`, and `check-payload-links.mjs` pass and the page builds with no warning

## 5. Verification

- [x] 5.1 Rebuild this change's own review page with a `screen` sketch, an `svg` drawing, and a table in a scratch proposal copy, open it in a browser light and dark, and confirm the pictures and row notes work; then run `node .github/scripts/checks.mjs --worktree` and `/save`

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 6711 -->
# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: A visual is a narrow text drawing`
- TO: `### Requirement: A visual is a narrow drawing`

## MODIFIED Requirements

### Requirement: A visual is a narrow drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows; a `screen` fence for screens and before-and-after layouts, built from the shared look's app parts; an `svg` fence for a free drawing such as arrows or layers; a Markdown table for a table; and a `text` fence for a small listing such as a file tree. Mermaid, screen, and SVG fences SHALL show on the page as inline pictures made at build time. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A text drawing SHALL aim for 40 columns and MAY reach 56. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

#### Scenario: A flow drawn in Mermaid

- **WHEN** a What Changes bullet holds a valid `mermaid` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen and opens full screen, with no script or network load added to the page

#### Scenario: A screen sketched from app parts

- **WHEN** a What Changes bullet holds a valid `screen` fence with a card, a text box, and two buttons
- **THEN** the page shows them in the app's look, wrapping text to fit, fitting a 320px-wide screen, opening full screen, taking a note on the whole sketch, following light or dark mode, and doing nothing when a control is tapped

#### Scenario: A free drawing in SVG

- **WHEN** a What Changes bullet holds a valid `svg` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen, opens full screen, takes a note on the whole picture, and follows the page's light or dark colors

#### Scenario: A wide picture

- **WHEN** a `mermaid` or `svg` fence draws wider than 640 pixels
- **THEN** the builder warns with the item and picture and still writes the page

### Requirement: Proposal text never runs as code

The page SHALL escape all proposal text, drawings and picture labels included, so script-closing text or HTML examples show as written and never execute. The builder SHALL refuse a drawn picture whose markup holds a script, a style, a foreign object, a link, an image source, or a `url(` reference, and SHALL judge only the markup, so a label that merely names one of these still draws. An `svg` fence SHALL pass an allowlist: only drawing shapes, text, and grouping elements, and only geometry, paint, text, and the kit's color class attributes; any other element or attribute, an event handler included, SHALL refuse the picture. A `screen` fence SHALL pass its own allowlist: only layout, text, list, table, and form elements, and only the look's part and layout classes and inert form attributes; any other element, attribute, or class, an inline style or event handler included, SHALL refuse the sketch.

#### Scenario: Markup in a proposal

- **WHEN** a proposal quotes a literal `</script>` tag
- **THEN** the page shows the text intact

#### Scenario: A label names a link word

- **WHEN** a Mermaid label reads `src=x` or `url(x)`
- **THEN** the picture draws with that label as text, and no link or image is added

#### Scenario: A sketch carries an event handler

- **WHEN** an `svg` fence holds `<rect onclick="…"/>`, or a `screen` fence holds an `<a>` element or a `style` attribute
- **THEN** the build stops, naming the item, picture, proposal line, and the refused element or attribute, and the previous page stays byte-identical

### Requirement: A failed build keeps the last page

The builder SHALL name the item and line of a missing `## Why` or `## What Changes`, an unclosed fence, a fenced block outside any bullet, a `mermaid` fence it can not draw, or a `screen` or `svg` fence it refuses or can not read, and SHALL keep the previous page. A picture error SHALL be reported on one line, naming the item, the picture, and the proposal line. A clean build SHALL NOT be reported as proof that a drawing explains its bullet.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item and keeps the previous page

#### Scenario: A broken Mermaid fence

- **WHEN** a `mermaid` fence holds a syntax error
- **THEN** the build exits with one line naming the item, the picture, and the proposal line, and the previous page stays byte-identical

#### Scenario: An SVG fence with no root or size

- **WHEN** an `svg` fence holds no `<svg>` root with a `viewBox`
- **THEN** the build exits with one line naming the item, the picture, and the proposal line, and the previous page stays byte-identical

### Requirement: Screen sketches show each state and the change

A change that restructures a screen SHALL sketch it before and after, side by side where both fit in 640 pixels, else one above the other. A change that adds a screen SHALL sketch each empty, loading, or error state its flow names. A sketch SHALL stay a low-fidelity wireframe in the page's colors; the builder SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows that screen before and after the change

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page

## ADDED Requirements

### Requirement: A table is a page table

A Markdown table indented inside a What Changes bullet SHALL show as an HTML table in the page's look, its cells escaped and inline-formatted like bullet text, and each body row SHALL take its own note, named on copy by change number and row. A malformed table, such as one with no separator row, SHALL show as the bullet's text.

#### Scenario: A note on a row

- **WHEN** a reviewer notes the second row of a table in change 3
- **THEN** copied notes name it as change #3, row 2, with that row's text

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-19

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 69152 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-19-svg-screen-sketches</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-10-19-svg-screen-sketches">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-19-svg-screen-sketches</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Screen sketches on the review page are typed out of line characters, so they are hard to draw well: a box drawn one character off comes out crooked, and nothing can be placed freely, shaded, or overlapped. Flows already show as pictures. Drawing screens as pictures too puts every drawing on the page in one format and lets the assistant draw what a screen really looks like.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The assistant sketches a screen from the app's own parts.</b> A sketch uses the app's buttons, text boxes, cards, and tags, laid out in rows and columns, so it looks like the screen you'll get and switches with light and dark mode. Text wraps and boxes fit their words on their own, so nothing overlaps. Gray bars stand in for real text, which keeps the review on the flow, not the paint. It opens full screen, zooms, and takes a note on the whole sketch.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-1-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><h3>Notes</h3><span class="tag">3</span></div>
  <div class="sk-bar"></div>
  <input type="text" placeholder="A question or a change">
  <div class="row gap"><span class="grow"></span>
    <button class="btn-ghost">Cancel</button><button class="btn-primary">Save</button></div>
</div></div></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Anything that isn't a screen can be a free drawing.</b> Arrows pointing at parts, layers, or a custom diagram are drawn as SVG pictures in the page's own colors. They also open full screen, zoom, and take a note on the whole picture.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic sketch" data-note="item-2-picture-1" tabindex="0" style="width:21.538em"><svg viewBox="0 0 280 64">
  <rect class="f-card s-line" x="168" y="8" width="104" height="48" rx="8"/>
  <text x="220" y="37" text-anchor="middle">Save</text>
  <path class="s-fg" d="M16 32h136m-10-7 10 7-10 7" fill="none" stroke-width="2"/>
  <text class="f-subtle" x="16" y="22">the new button</text>
</svg></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A table shows as a real table</b>, in the page's look, and you can leave a note on one row.</div></div><div class="table"><table class="tbl"><thead><tr><th>Drawing</th><th>Before</th><th>After</th></tr></thead><tbody><tr data-note="item-3-row-1" tabindex="0"><td>A screen</td><td>typed lines</td><td>the app's own parts</td></tr><tr data-note="item-3-row-2" tabindex="0"><td>A free drawing</td><td>none</td><td>a picture</td></tr><tr data-note="item-3-row-3" tabindex="0"><td>A table</td><td>typed lines</td><td>a real table, a note per row</td></tr><tr data-note="item-3-row-4" tabindex="0"><td>A flow</td><td>a picture</td><td>a picture, unchanged</td></tr><tr data-note="item-3-row-5" tabindex="0"><td>A file list</td><td>typed lines</td><td>typed lines, unchanged</td></tr></tbody></table></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A picture that could do harm never reaches the page.</b> A sketch or drawing holding a script, a link, an outside image, or anything else outside a short list of allowed parts stops the page build. The build names the item and line, and the last good page stays. A sketch that is too wide, or uses colors that would vanish in dark mode, still builds with a warning.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-4-picture-1" tabindex="0" style="width:47.308em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 615 152" width="615" height="152" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_sketch_check_0"><path d="M90.24,76L131.24,76"/><path class="pele-marker" d="M138.24,76L130.24,79.36L130.24,72.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_check_page_0"><path d="M286.91,68C303.56,68 303.56,32 320.21,32L374.5,32"/><path class="pele-marker" d="M381.5,32L373.5,35.36L373.5,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_check_stop_0"><path d="M286.91,84C303.56,84 303.56,120 320.21,120L374.5,120"/><path class="pele-marker" d="M381.5,120L373.5,123.36L373.5,116.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_check_page_0"><rect x="322.21" y="21.5" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="337.1" y="36.9" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_check_stop_0"><rect x="325.32" y="109.5" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="337.1" y="124.9" text-anchor="middle">no</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="sketch" transform="translate(49.12,76)"><rect x="-41.12" y="-24" width="82.24" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">sketch</text></g><g class="pele-node pele-shape-diam" data-id="check" transform="translate(218.98,76)"><polygon points="0,-50.46 80.74,0 0,50.46 -80.74,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">only shapes?</text></g><g class="pele-node pele-shape-rect" data-id="page" transform="translate(441.75,32)"><rect x="-60.26" y="-24" width="120.51" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">on the page</text></g><g class="pele-node pele-shape-rect" data-id="stop" transform="translate(494.21,120)"><rect x="-112.71" y="-24" width="225.42" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">build stops, names the line</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Flows stay as they are</b>, drawn in Mermaid, which already makes pictures. Small text listings, such as a list of files, keep their plain text drawing. While you and the assistant are thinking an idea through in chat, drawings stay plain text, because chat shows no pictures. Pages of plans made before this change still build.</div></div></li>
</ol>
<p class="aside">Non-goals: changing how flow pictures are drawn; making sketches into finished designs; showing pictures in chat.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-19</p>Asked how screen sketches should be drawn → chose hand-drawn SVG written by the assistant, for the most freedom.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-19</p>Asked what happens to Mermaid flows → chose to keep Mermaid for flows; hand-drawn SVG only where Mermaid can't draw the thing.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-19</p>Asked how tables should show → chose a real page table, notable per row.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: a hand-drawn picture passes an allowlist of drawing shapes and attributes, stricter than the Mermaid check, because hand-written markup can carry event handlers the current check misses.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: a note on a sketch covers the whole picture, matching flow pictures.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: the same 640 px width warning applies to sketches.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: small listings such as a file tree keep a plain text fence, because a picture adds nothing there.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: drawings in chat stay plain text, because chat shows no pictures.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: pages of older plans with text screen sketches still build, with no warning, because archives are never rewritten.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-19</p>Check: built and checked locally: an <code>svg</code> sketch and a table drew in light and dark on this page, a sketch holding <code>onclick=</code> stopped the build and kept the last page, and all local checks passed.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-19</p>Asked whether wireframes should use SVG or the shadcn components → chose shadcn-style HTML for screens, with hand-drawn SVG kept for arrows and freeform drawings, because laid-out HTML wraps text and matches the real app while hand-placed SVG overlaps.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-19</p>Assumed: a screen sketch uses only the look's existing parts (button, text box, card, tag, gray placeholder) plus a few layout helpers, and its controls do nothing when tapped, because the page runs no app code and a tap there must place a note.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-19</p>Check: built and checked locally: the app-parts screen sketch and the SVG arrow drew in light and dark on this page; a screen with <code>style=</code> or <code>&lt;a&gt;</code> stopped the build and kept the last page; all local checks passed.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-19</p>Archived for publishing; trimmed two phrases from the drawing guide to stay under the instruction-size budget after main came in.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    const row = el.tagName === 'TR', cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c)
      : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); }).join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
