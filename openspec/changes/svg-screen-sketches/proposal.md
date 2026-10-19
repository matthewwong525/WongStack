# Proposal

**Status:** built, saved for review
**Branch:** review-svg-conversion
**Open questions:** none

## Why

Screen sketches on the review page are typed out of line characters, so they are hard to draw well: a box drawn one character off comes out crooked, and nothing can be placed freely, shaded, or overlapped. Flows already show as pictures. Drawing screens as pictures too puts every drawing on the page in one format and lets the assistant draw what a screen really looks like.

## What Changes

- **The assistant draws a screen as a picture.** The page shows real boxes, buttons, and shading, in the page's own colors, so a sketch looks right in light and dark mode. It still opens full screen, zooms, and takes a note on the whole picture, as flow pictures do. Sketches stay rough wireframes: gray boxes and labels, not finished designs.
  ```svg
  <svg viewBox="0 0 512 176">
    <text x="16" y="20" fill="subtle">Before: typed lines</text>
    <rect x="16" y="32" width="224" height="112" fill="none" stroke="subtle" stroke-dasharray="4 4"/>
    <text x="32" y="64" fill="subtle">| Notes 3  |</text>
    <text x="32" y="96" fill="subtle">| [Save]   |</text>
    <text x="272" y="20" fill="subtle">After: a drawn picture</text>
    <rect x="272" y="32" width="224" height="112" rx="8" fill="card" stroke="line"/>
    <text x="288" y="60" font-weight="600">Notes</text>
    <circle cx="350" cy="55" r="10" fill="muted"/>
    <text x="350" y="60" text-anchor="middle" font-size="12">3</text>
    <rect x="288" y="72" width="192" height="24" rx="4" fill="muted"/>
    <rect x="288" y="108" width="72" height="28" rx="14" fill="fg"/>
    <text x="324" y="126" text-anchor="middle" fill="bg">Save</text>
    <text x="256" y="168" text-anchor="middle" fill="subtle">same page colors in light and dark</text>
  </svg>
  ```

- **A table shows as a real table**, in the page's look, and you can leave a note on one row.
  | Drawing | Before | After |
  |-|-|-|
  | A screen | typed lines | a picture |
  | A table | typed lines | a real table, a note per row |
  | A flow | a picture | a picture, unchanged |
  | A file list | typed lines | typed lines, unchanged |

- **A picture that could do harm never reaches the page.** A sketch holding a script, a link, an outside image, or anything else outside a short list of drawing shapes stops the page build. The build names the item and line, and the last good page stays. A sketch that is too wide, or uses colors that would vanish in dark mode, still builds with a warning.
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

- `ux-wireframes`: a screen becomes an `svg` fence drawn inline after an allowlist check; a table becomes a Markdown table rendered as an HTML table with per-row notes; `text` fences remain for listings and chat.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: `svg` fence sanitizer and inline picture; Markdown table parsing inside a bullet.
- `.agents/skills/plan/references/review-kit.html`: row note targets, table and sketch color classes.
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
