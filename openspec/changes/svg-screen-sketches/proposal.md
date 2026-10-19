# Proposal

**Status:** built, saved for review
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
