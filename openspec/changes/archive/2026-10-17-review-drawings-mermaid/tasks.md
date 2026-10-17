# Tasks

## 1. Builder

- [x] 1.1 Vendor Pele 1.6.0's `dist/pele.js` as `.agents/skills/plan/vendor/pele.mjs` below a one-line header naming version and source, plus `.agents/skills/plan/vendor/LICENSE-pele` (MIT); confirm the file below the header matches the registry tarball byte for byte
- [x] 1.2 In `.agents/skills/plan/scripts/build-review.mjs`, render ` ```mermaid ` fences in What Changes bullets to `<div class="art pic" data-note="item-N-picture-K" tabindex="0" style="width:<w/13>em">` plus Pele's SVG (design Decisions 1–3, 7): lazy load only for a Mermaid fence, `autoDirection:false`, unique `idPrefix`, `links:false, images:false, now:0`, warn past 640 px; text fences keep their line numbering
- [x] 1.3 Refuse unsafe markup with text nodes stripped, exported as `unsafeSvg` (design Decision 4)
- [x] 1.4 Map a `PeleError` to `proposal.md line <n>: item N, picture K: <first line>` (design Decision 8)

## 2. Review kit

- [x] 2.1 In `.agents/skills/plan/references/review-kit.html`, style `.art.pic`, map `--pele-*` to the kit's colours, teach `where()` and `labelOf()` pictures, and say "tap a line or picture to note it" (design Decisions 2, 5, 6)

## 3. Tests

- [x] 3.1 Add `scripts/tests/review-pictures.test.mjs`: inline SVG with its note id and one script; a second build changes no bytes; a text-only proposal builds as before; a syntax error exits on one line naming item and line and keeps the page; a wide picture warns; mixed fences count separately; em width matches px; labels stay escaped, a click line draws no link, and `src=`/`url(`/`href=` labels draw; `unsafeSvg` refuses real markup only; a jsdom note on a picture names `Change #1, picture 1`
- [x] 3.2 Add a Chrome test in `scripts/tests/review-browser.test.mjs`: a picture fits a 320px screen, zooms full screen, and takes a whole-picture note

## 4. Docs and rules

- [x] 4.1 Update `.agents/skills/plan/references/drawings.md` (Steps, Back and forth and States become Mermaid; screens and tables stay text) and `.agents/skills/plan/SKILL.md` (*Draw in the proposal*, quoted `"/apply"` example), with trims so `node scripts/measure-context.mjs --check` passes
- [x] 4.2 Update `.agents/skills/explore/SKILL.md` (chat drawings stay text), `wiki/ux-principles.md#the-review-file`, and the proposal and design drawing rules in `openspec/config.yaml`
- [x] 4.3 Add a `## Next (minor)` entry to `CHANGELOG.md`

## 5. Verification

- [x] 5.1 Build a scratch change from the drawing guide's Mermaid examples and confirm it draws with no warnings; build this change's page
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree` and the script tests, and fix what fails
