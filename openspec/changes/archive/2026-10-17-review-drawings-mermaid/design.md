# Design

## Context

See proposal.md — Why. Today `.agents/skills/plan/scripts/build-review.mjs` turns every fence inside a What Changes bullet into a `<pre class="art">` with one `data-note` span per line. The kit (`.agents/skills/plan/references/review-kit.html`) fits each `.art` to its frame and zooms it full screen by changing its `font-size`, and anchors notes by `data-note` ids parsed in `where()`.

This ports ClaymooApp PR #1709 (merge commit 79af8458d, archive `2026-10-17-review-drawings-mermaid`). ClaymooApp's builder, kit and drawing guide were byte-identical to WongStack's before that change, so its patch applies cleanly here.

Constraints:

- The page fetches nothing from the network and works opened from disk (`openspec/specs/ux-wireframes/spec.md`).
- The builder runs in worktrees, which have no `node_modules`, without installing tools.
- A second build of the same proposal changes no bytes.
- Pele 1.6.0 renders in Node with no DOM, from a built-in text-width table. Its output has no `<style>` element, no `url(`, and no network reference; a small flowchart is about 3 KB.

## Goals / Non-Goals

**Goals:**
- ` ```mermaid ` fences in What Changes bullets become inline SVG at build time.
- The kit's fit, full screen, zoom and note flow work on pictures with no second code path.
- A Mermaid error fails the build on one line naming the proposal line, leaving the previous page.

**Non-Goals:**
- No Pele code in the page; no rendering when it opens.
- No notes on one box inside a picture.
- No HTML tables; no change to archived pages or older page formats.

## Decisions

1. **Vendor Pele's single-file build.** Copy `dist/pele.js` from `https://registry.npmjs.org/pele/-/pele-1.6.0.tgz` (one ESM file, no imports) to `.agents/skills/plan/vendor/pele.mjs` below a one-line header naming the version and source, with its MIT `LICENSE` as `vendor/LICENSE-pele`. Load it lazily, only for a proposal with a Mermaid fence, through `createRequire(import.meta.url)('../vendor/pele.mjs')` (Node's `require(esm)`, on the repo's Node 22.12 or later), because `buildReview` is synchronous and `checkpoint.mjs` and the tests call it that way.
   - *Alternative: dynamic `import()`.* Rejected: `buildReview` would turn async and every caller change.
   - *Alternative: an npm dependency.* Rejected: worktrees have no `node_modules`.
   - *Alternative: mermaid.js in the page.* Rejected: 1.6 MB in every committed page, drawn on every open.
   - *Alternative: `mmdc`.* Rejected: needs headless Chrome.
2. **Size pictures in `em`.** Wrap the SVG in `<div class="art pic" data-note="item-N-picture-K" tabindex="0" style="width:<w/13>em">`, with the SVG at `width:100%; height:auto`. `.art`'s base font is 13px, so `fit()`, `openViewer()` and `scale()` resize a picture by font size exactly as they do text. The wrapper takes `box-sizing:content-box`, so `.art`'s padding does not shrink the width.
3. **Render with fixed options.** `render(source, { idPrefix: 'item-N-picture-K', autoDirection: false, fontFamily, links: false, images: false, now: 0 })`: the author's direction stays, ids stay unique on the page, a `click` or image line emits no `href=` or `src=`, and `now: 0` keeps gantt output stable.
4. **Check markup, not labels.** The builder refuses an SVG whose markup holds `<script`, `<style`, `<foreignObject`, `url(`, `href=` or `src=`. It checks the SVG with every text node stripped (`svg.replace(/>[^<]*</g, '><')`): Pele escapes each label, title and description into a text node, so a label such as `A[src=x]` or `B["url(x)"]` is text, not markup. ClaymooApp scanned the whole string and refused those labels with a misleading message. The check is exported as `unsafeSvg`, because Pele with these options never emits unsafe markup, so only a hand-made SVG can test the refusal.
5. **Theme through Pele's CSS variables.** `.art.pic` maps `--pele-*` to the kit's colours, so pictures match the page with no re-render.
6. **Whole-picture notes.** `where()` reads `item-N-picture-K` as `Change #N, picture K`. `labelOf()` joins a picture's SVG `<text>` words with spaces, dropping `<title>` and `<desc>`. The pin is appended to the wrapper. A picture takes no line numbers. The full-screen hint reads "tap a line or picture to note it".
7. **Width warning.** Warn when a picture's natural width passes 640 px, about the 56-column text limit at 13px, naming the item.
8. **One-line errors.** A `PeleError` becomes `proposal.md line <fence start + error line>: item N, picture K: <first line of the message>`, its trailing colon dropped, and the build exits before writing. Pele's message adds the source line, a caret, and the expected tokens on later lines, which broke the one-line status output in ClaymooApp.
9. **Quote labels that look like Mermaid syntax.** The plan skill's example writes `apply["/apply"]`: a bare `[/apply]` is Mermaid shape syntax, not a label.

## Risks / Trade-offs

- [Node text measurement is an estimate, so a label may sit slightly loose or tight in its box] → render with the kit's font family; the picture argues about the flow, not pixel polish.
- [A 680 KB vendored file in every install] → loaded only on demand; an upgrade replaces one file. Oxlint, coverage and the context measure read only `scripts/`, so the vendored file is not linted or counted as instructions.
- [Pele output changes between versions] → pinned by the vendored copy; archived pages never rebuild.

## Migration Plan

None. Active proposals with only text fences rebuild byte-identical. Rollback is a revert; pages built with pictures stay valid HTML.
