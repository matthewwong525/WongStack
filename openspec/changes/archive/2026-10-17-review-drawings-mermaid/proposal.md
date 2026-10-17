# Plan pages draw flows as real pictures

**Status:** ready-to-ship
**Branch:** review-drawings-mermaid
**Open questions:** none

## Why

A plan's review page draws every picture from text characters. Steps, states, and who-asks-whom pictures are the hardest to draw this way: the assistant counts columns by hand, so boxes come out crooked and need redrawing, and on a phone a wide drawing shrinks until it is hard to read.

## What Changes

- **Flows are drawn as real pictures.** The plan writes a flow as a short Mermaid diagram, the kind the wiki already uses, and the page shows it as a clean picture laid out for you. The picture is made when the page is built, so the page still works offline, from a clone, on a laptop or a phone.
  ```mermaid
  flowchart LR
    plan["the plan writes a flow"] --> build["the page is built"] --> pic["you see a picture"]
  ```
- **Screens and tables stay text.** Screens, before-and-after layouts, and comparison tables keep today's text drawings: a rough sketch keeps the review on the flow, not the colors. Drawings in chat stay text too, because chat can't show a picture.
  ```text
  what it shows       │ drawn as
  ────────────────────┼──────────
  steps, states, talk │ picture
  screens, tables     │ text
  chat in /explore    │ text
  ```
- **A note on a picture names the picture.** A text drawing takes a note on one line; a picture takes a note on the whole picture, tapped full screen like a text drawing, and the copied note says *Change #1, picture 1*.
  ```text
  tap picture ─▶ Add note
                   │
                   ▼
  "Change #1, picture 1"
  ```
- **A mistake in a picture says where, in one line.** The build stops, names the item, picture, and proposal line, and the last good page stays. A label that only mentions a link word, such as `src=x`, still draws.

**Non-goals:** no change to pages already archived, no picture drawing in chat, and no notes on one box inside a picture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: a What Changes visual may be a Mermaid flow pre-drawn to an inline picture, beside text drawings; a note may anchor to a whole picture; a Mermaid fence the builder can not draw keeps the previous page and is reported on one line; label text never trips the picture safety check.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs` renders ` ```mermaid ` fences to inline SVG with a vendored Pele, and exports the `unsafeSvg` check.
- New `.agents/skills/plan/vendor/pele.mjs` (Pele 1.6.0 `dist/pele.js`, MIT, about 680 KB, no imports) and `vendor/LICENSE-pele`. No `package.json` dependency: worktrees have no `node_modules`. The whole plan skill ships, so the vendor folder reaches every install.
- `.agents/skills/plan/references/review-kit.html`: picture styling, theme colours, and a whole-picture note target.
- Docs: `.agents/skills/plan/references/drawings.md`, `.agents/skills/plan/SKILL.md`, `.agents/skills/explore/SKILL.md` (chat drawings stay text), `wiki/ux-principles.md#the-review-file`, and the proposal and design drawing rules in `openspec/config.yaml`.
- Tests: `scripts/tests/review-pictures.test.mjs` (builder and a jsdom note flow) and one Chrome test in `scripts/tests/review-browser.test.mjs`.
- A `minor` entry in `CHANGELOG.md`.

## Decision log

- **2026-10-17** — Asked to carry ClaymooApp's review-page Mermaid pictures (ClaymooApp PR #1709, merge commit 79af8458d) upstream into WongStack → chose to port it with its agreed design, generalized, plus two fixes its integration review found.
- **2026-10-17** — Assumed: the builder and kit behave exactly as ClaymooApp's except for the two fixes, because ClaymooApp's next sync should bring the kit back byte-identical to upstream.
- **2026-10-17** — Assumed: drop ClaymooApp's sync-adaptation guard test, because it exists only while ClaymooApp carries a local fork of the kit.
- **2026-10-17** — Assumed: the unsafe-picture check scans markup only, with text nodes stripped, because Pele escapes every label into a text node and a label such as `A[src=x]` was refused with a misleading message; real `href=`, `src=`, `url(`, script, style and foreignObject markup is still refused.
- **2026-10-17** — Assumed: a Mermaid error reports only the first line of Pele's message, without its trailing colon, because Pele adds the source and a caret on later lines that break the one-line status output, and the proposal line already says where.
- **2026-10-17** — Assumed: the drawing-guide and skill trims offset the new text, because skill instruction bytes must stay below the recorded baseline; the plan skill drops its duplicate *what a sketch holds* link, which the guide keeps.
- **2026-10-17** — Assumed: a `minor` release, because plans gain a new kind of drawing.
- **2026-10-17** — Assumed: wrap ClaymooApp's 131-character Pele comment in the builder onto two lines, because WongStack's comment lint caps a line at 120; ClaymooApp takes the wrapped copy at its next sync.
- **2026-10-17** — Assumed: commit and push the branch but open no pull request until Matthew approves it, because he asked to stop before the public pull request.
- **2026-10-17** — Asked to publish after the pull request opened with every check passing → chose `/ship`; archived as 43.3.0 and saved for shipping.
