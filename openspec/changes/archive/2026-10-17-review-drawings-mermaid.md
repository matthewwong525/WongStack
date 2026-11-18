<!-- openspec-archive v1 2026-10-17-review-drawings-mermaid -->
<!-- file proposal.md utf8 5433 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 5602 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 2660 -->
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

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 4988 -->
## MODIFIED Requirements

### Requirement: Every change carries a standalone review page

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`, committed and archived with the change. The page SHALL fetch no script, style, font, or picture from the network, SHALL run no diagram renderer when opened, and SHALL work opened from disk; it SHALL use the network only to send notes when opened through a reply link. A change that adds or restructures a screen SHALL also keep a `## UX` section in `design.md` that links the page rather than repeating its sketches.

#### Scenario: Opened from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** every section, drawing, picture, zoom, and note control works

#### Scenario: A change with no screen

- **WHEN** `/plan` drafts a worker, CLI, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: A failed build keeps the last page

The builder SHALL name the item and line of a missing `## Why` or `## What Changes`, an unclosed fence, a fenced block outside any bullet, or a `mermaid` fence it can not draw, and SHALL keep the previous page. A Mermaid error SHALL be reported on one line, naming the item, the picture, and the proposal line. A clean build SHALL NOT be reported as proof that a drawing explains its bullet.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item and keeps the previous page

#### Scenario: A broken Mermaid fence

- **WHEN** a `mermaid` fence holds a syntax error
- **THEN** the build exits with one line naming the item, the picture, and the proposal line, and the previous page stays byte-identical

### Requirement: Proposal text never runs as code

The page SHALL escape all proposal text, drawings and picture labels included, so script-closing text or HTML examples show as written and never execute. The builder SHALL refuse a drawn picture whose markup holds a script, a style, a foreign object, a link, an image source, or a `url(` reference, and SHALL judge only the markup, so a label that merely names one of these still draws.

#### Scenario: Markup in a proposal

- **WHEN** a proposal quotes a literal `</script>` tag
- **THEN** the page shows the text intact

#### Scenario: A label names a link word

- **WHEN** a Mermaid label reads `src=x` or `url(x)`
- **THEN** the picture draws with that label as text, and no link or image is added

### Requirement: A visual is a narrow text drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows, shown on the page as an inline picture made at build time, and a `text` fence for screens, before-and-after layouts, and tables. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A text drawing SHALL aim for 40 columns and MAY reach 56 for options side by side, a table, or a before-and-after. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

#### Scenario: A flow drawn in Mermaid

- **WHEN** a What Changes bullet holds a valid `mermaid` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen and opens full screen, with no script or network load added to the page

#### Scenario: A wide picture

- **WHEN** a `mermaid` fence draws wider than 640 pixels
- **THEN** the builder warns with the item and picture and still writes the page

### Requirement: A reviewer notes any item

Each Why paragraph, item, decision, drawing line, and picture SHALL take a note, through a visible Note control or a still click, and a drag, pinch, or tap on a link or control SHALL keep its normal action. A note on a picture SHALL anchor to the whole picture and be named `Change #<n>, picture <k>`. Saved notes SHALL show as numbered pins, persist per change in the browser, and never be written to a repository file. A pin whose text changed SHALL show as possibly moved.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps item 2's Note control on a touch screen
- **THEN** the editor opens for item 2

#### Scenario: A note on a picture

- **WHEN** the reviewer taps item 1's picture full screen and saves a note
- **THEN** the note pins to the picture, and the copied note starts `Change #1, picture 1` with the picture's words

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-17

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 51635 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-17-review-drawings-mermaid</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--ink); --pele-muted:var(--muted); --pele-line:var(--ink); --pele-border:var(--line); --pele-surface:#fff; --pele-surface-alt:var(--fill); --pele-accent:var(--ink); }
  .art.pic svg { display:block; width:100%; height:auto; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
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
</head>
<body data-change="2026-10-17-review-drawings-mermaid">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-17-review-drawings-mermaid</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A plan's review page draws every picture from text characters. Steps, states, and who-asks-whom pictures are the hardest to draw this way: the assistant counts columns by hand, so boxes come out crooked and need redrawing, and on a phone a wide drawing shrinks until it is hard to read.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Flows are drawn as real pictures.</b> The plan writes a flow as a short Mermaid diagram, the kind the wiki already uses, and the page shows it as a clean picture laid out for you. The picture is made when the page is built, so the page still works offline, from a clone, on a laptop or a phone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:46.462em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 604 64" width="604" height="64" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_plan_build_0"><path d="M193.39,32L234.39,32"/><path class="pele-marker" d="M241.39,32L233.39,35.36L233.39,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_build_pic_0"><path d="M389.46,32L430.46,32"/><path class="pele-marker" d="M437.46,32L429.46,35.36L429.46,28.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="plan" transform="translate(100.7,32)"><rect x="-92.7" y="-24" width="185.39" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">the plan writes a flow</text></g><g class="pele-node pele-shape-rect" data-id="build" transform="translate(315.42,32)"><rect x="-74.03" y="-24" width="148.06" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">the page is built</text></g><g class="pele-node pele-shape-rect" data-id="pic" transform="translate(516.38,32)"><rect x="-78.92" y="-24" width="157.84" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">you see a picture</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Screens and tables stay text.</b> Screens, before-and-after layouts, and comparison tables keep today's text drawings: a rough sketch keeps the review on the flow, not the colors. Drawings in chat stay text too, because chat can't show a picture.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">what it shows       │ drawn as</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">────────────────────┼──────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">steps, states, talk │ picture</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">screens, tables     │ text</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">chat in /explore    │ text</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A note on a picture names the picture.</b> A text drawing takes a note on one line; a picture takes a note on the whole picture, tapped full screen like a text drawing, and the copied note says <i>Change #1, picture 1</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">tap picture ─▶ Add note</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                 │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                 ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">&quot;Change #1, picture 1&quot;</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A mistake in a picture says where, in one line.</b> The build stops, names the item, picture, and proposal line, and the last good page stays. A label that only mentions a link word, such as <code>src=x</code>, still draws.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> no change to pages already archived, no picture drawing in chat, and no notes on one box inside a picture.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-17</p>Asked to carry ClaymooApp's review-page Mermaid pictures (ClaymooApp PR #1709, merge commit 79af8458d) upstream into WongStack → chose to port it with its agreed design, generalized, plus two fixes its integration review found.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: the builder and kit behave exactly as ClaymooApp's except for the two fixes, because ClaymooApp's next sync should bring the kit back byte-identical to upstream.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: drop ClaymooApp's sync-adaptation guard test, because it exists only while ClaymooApp carries a local fork of the kit.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: the unsafe-picture check scans markup only, with text nodes stripped, because Pele escapes every label into a text node and a label such as <code>A[src=x]</code> was refused with a misleading message; real <code>href=</code>, <code>src=</code>, <code>url(</code>, script, style and foreignObject markup is still refused.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: a Mermaid error reports only the first line of Pele's message, without its trailing colon, because Pele adds the source and a caret on later lines that break the one-line status output, and the proposal line already says where.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: the drawing-guide and skill trims offset the new text, because skill instruction bytes must stay below the recorded baseline; the plan skill drops its duplicate <i>what a sketch holds</i> link, which the guide keeps.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: a <code>minor</code> release, because plans gain a new kind of drawing.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: wrap ClaymooApp's 131-character Pele comment in the builder onto two lines, because WongStack's comment lint caps a line at 120; ClaymooApp takes the wrapped copy at its next sync.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-17</p>Assumed: commit and push the branch but open no pull request until Matthew approves it, because he asked to stop before the public pull request.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-17</p>Asked to publish after the pull request opened with every check passing → chose <code>/ship</code>; archived as 43.3.0 and saved for shipping.</li>
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
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'picture' ? 'picture ' + m[4] : m[3] ? 'drawing line ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    const parts = el.classList.contains('pic') ? Array.prototype.map.call(c.querySelectorAll('text'), function (n) { return n.textContent; }) : [c.textContent];
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
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
        el.appendChild(pin);
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
      el.appendChild(add);
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
