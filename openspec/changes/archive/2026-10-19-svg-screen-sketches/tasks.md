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
