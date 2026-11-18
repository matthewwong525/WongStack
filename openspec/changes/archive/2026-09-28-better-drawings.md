<!-- openspec-archive v1 2026-09-28-better-drawings -->
<!-- file proposal.md utf8 6754 -->
# Better drawings in plans and explore

**Status:** ready-to-ship
**Branch:** explore-ascii-drawings
**Open questions:** none

## Why

A plan's drawings are almost always one column of steps joined by arrows, so they rarely show choices, branches, or a before-and-after. OpenSpec's explore mode draws richer pictures with a few simple patterns, and one of our recent plans shipped a box with a crooked edge that nothing caught.

## What Changes

- **A short guide with five drawing patterns.** Plans and explore draw from one guide, copied from OpenSpec's explore mode: a titled frame, options side by side, branches that split and join, labels under boxes, and a comparison table. Each pattern has one small example to copy. It stays short, not the long guide we removed before.
  ```text
  DRAWING PATTERNS
  ════════════════════════════
  titled frame     side by side
  split and join   labels under
  comparison table
  ```
- **Wider when a drawing needs it.** Drawings still aim for 40 columns, the width of a phone. Options side by side, a table, or a before-and-after may go up to 56. The page still warns past 60.
  ```text
       ONE COLUMN            SIDE BY SIDE
       ──────────            ────────────
        step one         ┌────────┐  ┌────────┐
           │             │ option │  │ option │
           ▼             │   A    │  │   B    │
        step two         └────────┘  └────────┘
                           simple      faster
       ◀─── 40 ───▶      ◀────────── 56 ──────────▶
  ```
- **Crooked boxes get caught.** When a box's right edge doesn't line up with its top corner, building the plan's page names the drawing and line, like the too-wide warning. It still builds the page.
  ```text
  ┌──────────────┐
  │ lined up     │
  │ one too far   │  ◀── warning: line 3
  └──────────────┘
  ```
- **Screen sketches show every state and the change.** A plan that changes a screen draws it before and after, side by side. A plan that adds a screen draws each state its steps name, such as empty, loading, or error.
  ```text
     BEFORE               AFTER
  ┌──────────────┐    ┌──────────────┐
  │ Notes        │    │ Notes     3  │
  │              │    │ • fix title  │
  │ [Copy notes] │    │ [Save]       │
  └──────────────┘    └──────────────┘
  ```
- **Explore draws while you think.** When you explore an idea, the agent draws in the chat with the same patterns: the flow as it is today, the options side by side, what each costs. It still writes no files.
  ```text
  you: "should notes sync?"
          │
    ┌─────┴──────┐
    ▼            ▼
  ┌──────┐    ┌──────┐
  │ keep │    │ sync │
  │ local│    │ them │
  └──────┘    └──────┘
   simple     needs a login
  ```

Non-goals: no change to how the page shows, zooms, or takes notes on a drawing; no plain-ASCII switch; no picture or HTML drawings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: drawings follow a shared pattern guide, may reach 56 columns for side-by-side work, and the builder warns about misaligned box edges; screen sketches show each named state and a before-and-after; `/explore` draws in chat by the same guide.

## Impact

- New `.agents/skills/plan/references/drawings.md`: the five patterns, the width rule, and the screen-sketch rule, each with one example.
- `.agents/skills/plan/SKILL.md` and `.agents/skills/explore/SKILL.md`: point to the guide; the width sentence changes.
- `.agents/skills/plan/scripts/build-review.mjs`: box-edge check; width warning text names 56.
- `openspec/config.yaml` proposal rule, `wiki/ux-principles.md` (*Context of use*, *The review file*), and the payload manifest's plan entry.
- `scripts/tests/review.test.mjs`: box-edge and warning-text coverage.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Asked how wide a drawing may be → chose aim for 40, up to about 56 when side by side, a table, or before-and-after needs it; the builder still warns past 60.
- **2026-09-28** — Asked which characters drawings use → chose keep the line characters (┌─┐ │ ▼) and add a builder check for box edges that don't line up, rather than OpenSpec's plain `+ - |`.
- **2026-09-28** — Asked where the better drawings apply → chose plans' review pages and `/explore` in chat.
- **2026-09-28** — Assumed: OpenSpec ships no drawing library, only prose rules and four examples in its explore template (CLI 1.13.2), so we copy the patterns, not code, because there is nothing else to copy.
- **2026-09-28** — Assumed: the guide is one short file beside the plan skill, not a wiki page, because it is how an agent draws, and lighten-the-loop removed a long author guide for weight.
- **2026-09-28** — Assumed: screen sketches draw a before-and-after for a changed screen and each state the flow names for a new one, because a reviewer can't see a change or a state nobody drew.
- **2026-09-28** — Assumed: the edge check covers only the line characters, not `+`/`|` boxes, because `+` and `|` show up in plain text and would give false warnings.
- **2026-09-28** — Built inside `/ship`: the guide, the builder's box-edge check, and the docs; `/plan` also says to fix a box edge the builder flags, beside its width sentence. Run over every archived proposal, the check flags only show-browsing-in-chat's three known crooked boxes and nothing else.
- **2026-09-28** — Asked how to fit the instruction-size budget, which main had nearly used up (170 bytes left; the change added about 3,700) → chose trim to fit, keeping the check as strict: the guide keeps its drawings but loses most prose and one overlapping example, and the payload manifest drops a repeated tutorial paragraph and says its preflight, Paseo, and not-copied rules in fewer words.
- **2026-09-28** — Distilled at ship: `.github/CONTRIBUTING.md` now says the size check also fails unless instructions stay below the baseline, and that line-drawing characters count three bytes; the OpenSpec fact stays in memory, no other repeatable fact.
- **2026-09-28** — Archived at ship as 26.24.0; all tasks done and CI green on the branch.

<!-- end proposal.md -->
<!-- file design.md utf8 4964 -->
# Design

## Context

`/plan` draws each What Changes visual as a fenced `text` block, about 40 columns wide ([`plan/SKILL.md`](../../../.agents/skills/plan/SKILL.md#draw-in-the-proposal-then-build-the-page), [`wiki/ux-principles.md#the-review-file`](../../../wiki/ux-principles.md#the-review-file), and the proposal rule in [`openspec/config.yaml`](../../config.yaml)). `build-review.mjs` warns only past 60 columns. Nothing tells the agent *how* to draw, so drawings default to a vertical chain of steps.

OpenSpec 1.13.2 has no drawing library. Its explore template (`dist/core/templates/workflows/explore.js` in the global install) holds a *Visualize* section, a plain-ASCII rule, and four examples: a collaboration spectrum (side by side with labels under), an auth flow (titled frame, fan-out, fan-in), and a Postgres-vs-SQLite comparison table. Those are the patterns to copy.

lighten-the-loop (22.0.0) removed `review-author.md` and `review-examples.html` for weight, so the new guide must stay small.

## Goals / Non-Goals

**Goals:**
- One short guide both `/plan` and `/explore` draw from.
- Room for side-by-side drawings without giving up phone-first.
- A deterministic check for the one drawing mistake we have shipped: a miscounted box edge.
- Screen sketches that show each named state and the before-and-after.

**Non-Goals:**
- Any change to `review-kit.html`: the page already fits a drawing to the screen and zooms it full screen.
- Plain-ASCII drawings, rendered images, or HTML visuals.
- Rebuilding archived review pages.

## Decisions

### The guide: `plan/references/drawings.md`

One page, under about 80 lines, owned by the plan skill because it ships in that folder and both skills can reach it. It holds:

1. **Characters.** `┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼`, arrows `▶ ◀ ▲ ▼`, and `═` for a title rule; no emoji or wide characters, which take two columns and break alignment.
2. **Width.** Aim for 40; up to 56 for side by side, a table, or before-and-after; the builder warns past 60.
3. **Five patterns**, each one example of 10 lines or fewer: titled frame, side by side, split and join, labels under boxes, comparison table. Adapted from OpenSpec's examples, redrawn in our characters and widths.
4. **Screens.** Low fidelity; before-and-after for a changed screen; one small sketch per named state for a new one. It links [`ux-principles.md#the-review-file`](../../../wiki/ux-principles.md#the-review-file) for *what* a sketch holds rather than restating it.
5. **Count before you close a box**: every line of a box is the same length.

`plan/SKILL.md` keeps its example and replaces "about 40 columns wide for a phone" with the width rule and a link to the guide. `explore/SKILL.md` gets one sentence under *Questions during standalone exploration*: draw in chat by the guide when a picture clarifies the flow, the options, or their costs. The guide itself owns the how; neither skill copies it.

The payload manifest's **plan** line names the guide. `ux-principles.md` changes *Context of use* and *The review file* to the new width, and adds the before-and-after line; the proposal rule in `openspec/config.yaml` points to the guide and the width.

### The box-edge check

In `drawing()` beside the width check, over the fence's lines as code-point arrays:

- For each `┐` at column `c` on line `i`, walk down lines `i+1…`.
- A line whose column `c` holds `│`, `┤`, or `┼` continues the box; `┘` closes it with no warning.
- Otherwise, if that line has `│` or `┘` within two columns of `c`, warn once for the box: `proposal.md line N: item K, drawing line L has a box edge at column X, but its corner is at column C`. Then stop.
- Otherwise, stop silently: the `┐` was not a box's corner, for example the end of a `┌──┴──┐` split with arrows below.

Only the right edge is checked, because text drifts right when a line is miscounted and the left edge is typed first. Nested and side-by-side boxes pass because each corner is walked on its own. `+` and `|` are skipped: they show up in ordinary text.

Alternatives: a full box parser (too much code for one mistake); checking that every line in a fence has the same length (drawings mix boxes and free text, so it would warn constantly).

### Width warning text

`WIDE` stays 60. The message changes from `keep drawings under 60, aim for 40` to `keep drawings under 60: aim for 40, up to 56 side by side`. The two tests that match the old text change with it.

## Risks / Trade-offs

- **A heuristic can miss or misfire** → it is a warning, never a failure, and the page still builds. Tests pin the nested, side-by-side, split, and crooked cases.
- **Wider drawings are harder to read on a phone** → 56 is the exception, the full-screen view zooms, and the guide says to prefer one column.
- **This plan's own crooked-box example will warn once the check ships.** The warning is expected and shows the check working.

<!-- end design.md -->
<!-- file tasks.md utf8 1892 -->
# Tasks

## 1. Drawing guide (skills)

- [x] 1.1 Write `.agents/skills/plan/references/drawings.md`: characters, width rule, the five patterns each with one example of 10 lines or fewer, the screen rule linking `wiki/ux-principles.md#the-review-file`, and *count before you close a box*; under about 80 lines
- [x] 1.2 `.agents/skills/plan/SKILL.md`: replace "about 40 columns wide for a phone" with the width rule and a link to the guide; keep the example
- [x] 1.3 `.agents/skills/explore/SKILL.md`: one sentence to draw in chat by the guide when a picture clarifies the flow, options, or costs; still writes nothing

## 2. Builder (script)

- [x] 2.1 `build-review.mjs`: add the right-edge box check in `drawing()`, warning once per box with item, line, and both columns
- [x] 2.2 `build-review.mjs`: change the width warning text to `keep drawings under 60: aim for 40, up to 56 side by side`
- [x] 2.3 `scripts/tests/review.test.mjs`: cover a crooked right edge, a short bottom edge, nested boxes, side-by-side boxes, a `┌──┴──┐` split with arrows below, a `+--+` box (no warning), and a 56-column line (no warning); update the two width-warning assertions

## 3. Docs and config

- [x] 3.1 `wiki/ux-principles.md`: *Context of use* and *The review file* give the 40/56 width; *The review file* adds before-and-after for a changed screen and links the guide
- [x] 3.2 `openspec/config.yaml`: the proposal drawing rule names the width and points to the guide; run `node scripts/check-openspec-config.mjs`
- [x] 3.3 `.agents/skills/wong-sync/references/payload-manifest.md`: the **plan** entry lists the drawing guide
- [x] 3.4 `CHANGELOG.md`: `## Next (minor) — Better drawings in plans and explore` entry
- [x] 3.5 Run `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs`

## 4. Gate

- [x] 4.1 `/save`: CI passes, including the review tests

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 2481 -->
## MODIFIED Requirements

### Requirement: A visual is a narrow text drawing

A visual SHALL be a fenced `text` block inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser, from the shared drawing guide's patterns. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A drawing SHALL aim for 40 columns and MAY reach 56 for options side by side, a table, or a before-and-after. The builder SHALL warn about a line wider than 60 columns and still build.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

## ADDED Requirements

### Requirement: The builder flags a crooked box

The builder SHALL warn, naming the item and drawing line, when a line inside a box drawn with line characters puts the box's right edge in a different column from its top-right corner. It SHALL still write the page, and SHALL NOT warn about boxes drawn with `+`, `-`, and `|`.

#### Scenario: One edge one column too far

- **WHEN** a drawing's box has a middle line whose `│` sits one column right of the `┐` above it
- **THEN** the builder warns with that item and line and still writes the page

#### Scenario: Lined-up and nested boxes

- **WHEN** a drawing holds a box inside a box and two boxes side by side, all edges lined up
- **THEN** the builder gives no box warning

### Requirement: Screen sketches show each state and the change

A change that restructures a screen SHALL sketch it before and after, side by side where both fit in 56 columns, else one above the other. A change that adds a screen SHALL sketch each empty, loading, or error state its flow names.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows that screen before and after the change

### Requirement: Explore draws in chat from the same guide

`/explore` SHALL draw in the chat, from the same drawing guide, when a picture clarifies the current flow, the options, or their costs, and SHALL still write no file.

#### Scenario: Comparing two options

- **WHEN** an exploration weighs two approaches
- **THEN** the chat shows them side by side in a text drawing, and no file changes

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-28

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 40349 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-28-better-drawings</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-28-better-drawings">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-28-better-drawings</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A plan's drawings are almost always one column of steps joined by arrows, so they rarely show choices, branches, or a before-and-after. OpenSpec's explore mode draws richer pictures with a few simple patterns, and one of our recent plans shipped a box with a crooked edge that nothing caught.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A short guide with five drawing patterns.</b> Plans and explore draw from one guide, copied from OpenSpec's explore mode: a titled frame, options side by side, branches that split and join, labels under boxes, and a comparison table. Each pattern has one small example to copy. It stays short, not the long guide we removed before.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">DRAWING PATTERNS</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">════════════════════════════</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">titled frame     side by side</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">split and join   labels under</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">comparison table</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Wider when a drawing needs it.</b> Drawings still aim for 40 columns, the width of a phone. Options side by side, a table, or a before-and-after may go up to 56. The page still warns past 60.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">     ONE COLUMN            SIDE BY SIDE</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">     ──────────            ────────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">      step one         ┌────────┐  ┌────────┐</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">         │             │ option │  │ option │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">         ▼             │   A    │  │   B    │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">      step two         └────────┘  └────────┘</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">                         simple      faster</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">     ◀─── 40 ───▶      ◀────────── 56 ──────────▶</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Crooked boxes get caught.</b> When a box's right edge doesn't line up with its top corner, building the plan's page names the drawing and line, like the too-wide warning. It still builds the page.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ lined up     │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ one too far   │  ◀── warning: line 3</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">└──────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Screen sketches show every state and the change.</b> A plan that changes a screen draws it before and after, side by side. A plan that adds a screen draws each state its steps name, such as empty, loading, or error.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">   BEFORE               AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌──────────────┐    ┌──────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ Notes        │    │ Notes     3  │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│              │    │ • fix title  │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ [Copy notes] │    │ [Save]       │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">└──────────────┘    └──────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Explore draws while you think.</b> When you explore an idea, the agent draws in the chat with the same patterns: the flow as it is today, the options side by side, what each costs. It still writes no files.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">you: &quot;should notes sync?&quot;</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">  ┌─────┴──────┐</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">  ▼            ▼</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">┌──────┐    ┌──────┐</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ keep │    │ sync │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ local│    │ them │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">└──────┘    └──────┘</span>
<span class="ln" data-note="item-5-line-9" tabindex="0"> simple     needs a login</span></pre></div></details></li>
</ol>
<p class="aside">Non-goals: no change to how the page shows, zooms, or takes notes on a drawing; no plain-ASCII switch; no picture or HTML drawings.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked how wide a drawing may be → chose aim for 40, up to about 56 when side by side, a table, or before-and-after needs it; the builder still warns past 60.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked which characters drawings use → chose keep the line characters (┌─┐ │ ▼) and add a builder check for box edges that don't line up, rather than OpenSpec's plain <code>+ - |</code>.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked where the better drawings apply → chose plans' review pages and <code>/explore</code> in chat.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: OpenSpec ships no drawing library, only prose rules and four examples in its explore template (CLI 1.13.2), so we copy the patterns, not code, because there is nothing else to copy.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the guide is one short file beside the plan skill, not a wiki page, because it is how an agent draws, and lighten-the-loop removed a long author guide for weight.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: screen sketches draw a before-and-after for a changed screen and each state the flow names for a new one, because a reviewer can't see a change or a state nobody drew.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the edge check covers only the line characters, not <code>+</code>/<code>|</code> boxes, because <code>+</code> and <code>|</code> show up in plain text and would give false warnings.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Built inside <code>/ship</code>: the guide, the builder's box-edge check, and the docs; <code>/plan</code> also says to fix a box edge the builder flags, beside its width sentence. Run over every archived proposal, the check flags only show-browsing-in-chat's three known crooked boxes and nothing else.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked how to fit the instruction-size budget, which main had nearly used up (170 bytes left; the change added about 3,700) → chose trim to fit, keeping the check as strict: the guide keeps its drawings but loses most prose and one overlapping example, and the payload manifest drops a repeated tutorial paragraph and says its preflight, Paseo, and not-copied rules in fewer words.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Distilled at ship: <code>.github/CONTRIBUTING.md</code> now says the size check also fails unless instructions stay below the baseline, and that line-drawing characters count three bytes; the OpenSpec fact stays in memory, no other repeatable fact.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Archived at ship as 26.24.0; all tasks done and CI green on the branch.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
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
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat to update the plan.'); },
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
    fit(d);
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

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat to update the plan.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
