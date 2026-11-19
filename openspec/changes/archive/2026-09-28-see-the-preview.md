<!-- openspec-archive v1 2026-09-28-see-the-preview -->
<!-- file proposal.md utf8 4603 -->
# A "See the preview" choice after a build

**Status:** ready-to-ship
**Branch:** apply-preview-link
**Open questions:** none

## Why

After a build, the agent writes the preview link and then asks *publish it?*. Some apps hide the text written just before a question box, so you never see the link and can't look at what was built. The plan's page had the same problem, and *Review the plan* fixed it.

## What Changes

- **A *See the preview* choice.** When a build finishes with a preview, its last question offers *See the preview* next to *Publish it*, *Change it more*, and *Save it*. Picking it shows the link as plain text, with nothing asked after it, so no box hides it. Nothing is built, saved, or published; your next message decides.
  ```text
       BEFORE                  AFTER
  ┌────────────────┐     ┌────────────────┐
  │ (link hidden)  │     │ (link hidden)  │
  │ Publish it?    │     │ Publish it?    │
  │ ○ Publish it   │     │ ○ Publish it   │
  │ ○ Change more  │     │ ○ Change more  │
  │ ○ Save it      │     │ ○ Save it      │
  │                │     │ ● See preview  │
  └────────────────┘     └───────┬────────┘
                                 ▼
                         ┌────────────────┐
                         │ Click here to  │
                         │ see the        │
                         │ preview:       │
                         │ https://…      │
                         └────────────────┘
  ```
- **The link opens the page you changed.** The preview link goes straight to the page that shows the change, such as a mini app's own page or the settings page, not the home page. It shows on its own line as *Click here to see the preview:*, like the plan's link. The home page is used only when the change has no page of its own.
- **A gap under the plan's link.** When a plan waits for you, a blank line now separates its link from *When you're ready, type `/apply` to build it.*, so the chat no longer runs them together.
- **The same everywhere a preview shows.** Any reply that prints a preview link and then asks a question offers the choice, such as a save you ran yourself.

Non-goals: no change to how the preview is made; no change to the live link after publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the plan's next-step line sits after a blank line; a reply that prints a preview link to the page showing the change above a closing question offers *See the preview* as the allowed fourth option; picking it ends the next reply with the link and no question.
- `apply`: the finished-change question offers *See the preview* after a preview upload.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: the fourth-option line, the no-question reply, and a *Print the preview's link* section beside *Print the plan's link*.
- `.agents/skills/plan/scripts/build-review.mjs` and `scripts/tests/review.test.mjs`: a blank line between the link line and the next-step line.
- `.agents/skills/apply/SKILL.md` *Finish with a preview* step 4: print the link line and offer *See the preview*.
- `openspec/specs/asking-the-user/spec.md` and `openspec/specs/apply/spec.md` via deltas.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Assumed: the choice mirrors *Review the plan*: it shows the link as plain text, asks nothing, and starts nothing, because the person asked for the same fix as the plan's page.
- **2026-09-28** — Assumed: the rule lives once in the shared ask convention and covers any reply that prints a preview link before a question, such as a directly run `/save`, because one rule in one place can't drift.
- **2026-09-28** — Asked for a gap between the plan's link and the line under it → chose a blank line, printed by the page builder.
- **2026-09-28** — Asked for the preview link to open where the change can be seen → chose the page that shows the change, the home page only when none does.
- **2026-09-28** — Assumed: the live link after publishing stays as is, because the person asked about the build step, and `/ship`'s report ends with no link-hiding problem reported.
- **2026-09-28** — Assumed: archived and checkpointed by `/ship` for merge, because every task was done and checks passed locally.

<!-- end proposal.md -->
<!-- file design.md utf8 2162 -->
## Context

`/apply` ends a build by writing the preview URL as chat text, then asking *publish it?* through the question tool. Some hosts (Paseo's app among them) hide chat text written just before a question card, so the link never shows. The plan's review link had the same problem; [`asking-the-user.md` *Print the plan's link*](../../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link) fixed it with a *Review the plan* option whose reply prints the link and asks nothing.

## Decisions

- **Mirror *Review the plan* in the shared convention.** Add a short *Print the preview's link* section under *Print the plan's link* in `asking-the-user.md`: the fixed line *Click here to see the preview:* plus the URL (a mini app's `/apps/<name>/` URL on the next line), above the question, never inside it; a closing question below a preview link offers *See the preview*; picking it ends the next reply with those lines and no question, starting nothing. One copy, so `/apply` and a direct `/save` share it.
- **Link the page that shows the change.** The preview line carries the full URL of the changed page (`/apps/<name>/`, `/settings`), since the upload's URL is the home page and leaves the person hunting. The home page only when the change has no page.
- **A blank line before the next-step line.** Markdown joins two adjacent lines into one paragraph, so `build-review.mjs` prints `\n\n` between the plan's link line and *When you're ready…*; the convention says to copy both with the gap.
- **Allow it as a fourth option.** `/apply`'s finish already has three choices (publish, change more, save); *See the preview* makes four, like *Review the plan*. Update the fourth-option bullet and the "only the reply to *Review the plan* ends without a question" line.
- **`/apply` step 4 links the rule** rather than restating it, and offers the choice only when a preview was uploaded.
- **Stay inside the context budget.** Offset the added words with cuts in the same files so `measure-context.mjs --check` passes.

## Risks

- A fourth option crowds the question on a phone. Accepted: the same trade *Review the plan* already makes.

<!-- end design.md -->
<!-- file tasks.md utf8 1383 -->
# Tasks

## 1. Skills

- [x] 1.1 In `.agents/skills/explore/references/asking-the-user.md`, allow *See the preview* as a fourth option, name its reply beside *Review the plan*'s as the ones that end without a question, and add a *Print the preview's link* section by the design; verify `node scripts/check-payload-links.mjs` passes.
- [x] 1.2 In `.agents/skills/apply/SKILL.md` *Finish with a preview* step 4, print the preview as *Click here to see the preview:* and offer *See the preview* when a preview was uploaded, linking the new section; verify by reading the step back against the apply spec delta.

- [x] 1.3 In `.agents/skills/plan/scripts/build-review.mjs`, print a blank line between the plan's link line and the next-step line, and say so in *Print the plan's link*; verify `node --test scripts/tests/review.test.mjs` passes with the updated output assertion.
- [x] 1.4 In *Print the preview's link*, point the link at the page that shows the change, the home page only when none does; verify by reading it back against the spec delta.

## 2. Release

- [x] 2.1 Add a `## Next (minor) — A "See the preview" choice after a build` entry at the top of `CHANGELOG.md` in plain words, with **Updating.** *Nothing to do by hand.*; verify `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check` pass.

<!-- end tasks.md -->
<!-- file specs/apply/spec.md utf8 936 -->
## MODIFIED Requirements

### Requirement: A finished change ends with a host preview

When every task is done, `/apply` SHALL upload a preview of the app from the agent host under the change's name and ask whether to publish, with changing it more or saving as the other choices, and *See the preview* when a preview was uploaded. It SHALL NOT invoke `/save` or take any git, pull-request, or CI action on completion. When the app is untouched or the upload cannot run, it SHALL say so in one line and still ask.

#### Scenario: The last task completes

- **WHEN** `/apply` finishes the final task of a change that touched the app
- **THEN** it reports the preview link and asks whether to publish, offering *See the preview*, with nothing saved

#### Scenario: No credential

- **WHEN** the repo has no Cloudflare credential
- **THEN** `/apply` says in one line that no preview was uploaded and why, and still asks whether to publish

<!-- end specs/apply/spec.md -->
<!-- file specs/asking-the-user/spec.md utf8 4686 -->
## MODIFIED Requirements

### Requirement: Every ask offers structured choices

Every question a skill puts to the person SHALL offer two or three real options, the recommended one first and labelled `(Recommended)`, each with a short tradeoff, and SHALL keep the person's own answer open and use it as given. The allowed fourth options are *Review the plan*, in a closing question after a plan changed, and *See the preview*, in a closing question below a preview link. Where real options cannot be formed, such as a name only the person knows, the skill SHALL ask a free-text question instead of inventing options.

#### Scenario: A decision is needed

- **WHEN** a skill cannot continue without the person's choice
- **THEN** it asks with two or three options, the recommended one first, each with its tradeoff

#### Scenario: A custom answer

- **WHEN** the person answers in their own words instead of picking an option
- **THEN** the skill uses that answer as given, not the nearest option

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and any link written as chat text above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. When the plan waits for the person, the line under the link, after a blank line, SHALL say *When you're ready, type `/apply` to build it.*; when the build goes on in the same run, or the plan has shipped, that line SHALL NOT appear. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and its next-step line and no question, and SHALL start nothing. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full-path link, a blank line, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

## ADDED Requirements

### Requirement: A reply that prints a preview link offers to show it again

A reply that prints a preview link SHALL print it as *Click here to see the preview:* with the full URL of the page that shows the change, such as a mini app's `/apps/<name>/` page, and the home page only when the change has no page of its own, as its own chat line above any closing question, never inside it. That closing question SHALL offer *See the preview*; picking it SHALL end the next reply with the same link lines and no question, and SHALL start, save, or publish nothing.

#### Scenario: The person picks See the preview

- **WHEN** a build finishes with a preview and the person picks *See the preview* in its closing question
- **THEN** the next reply ends with *Click here to see the preview:* and the full URL, with no question box after it, and nothing is saved or published

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no *See the preview*

<!-- end specs/asking-the-user/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-28

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 35568 fence=~~~ -->
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
<title>Review · 2026-09-28-see-the-preview</title>
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
<body data-change="2026-09-28-see-the-preview">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-28-see-the-preview</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">After a build, the agent writes the preview link and then asks <i>publish it?</i>. Some apps hide the text written just before a question box, so you never see the link and can't look at what was built. The plan's page had the same problem, and <i>Review the plan</i> fixed it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A <i>See the preview</i> choice.</b> When a build finishes with a preview, its last question offers <i>See the preview</i> next to <i>Publish it</i>, <i>Change it more</i>, and <i>Save it</i>. Picking it shows the link as plain text, with nothing asked after it, so no box hides it. Nothing is built, saved, or published; your next message decides.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">     BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌────────────────┐     ┌────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ (link hidden)  │     │ (link hidden)  │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ Publish it?    │     │ Publish it?    │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ ○ Publish it   │     │ ○ Publish it   │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ ○ Change more  │     │ ○ Change more  │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ ○ Save it      │     │ ○ Save it      │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│                │     │ ● See preview  │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">└────────────────┘     └───────┬────────┘</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">                               ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">                       ┌────────────────┐</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">                       │ Click here to  │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">                       │ see the        │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">                       │ preview:       │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">                       │ https://…      │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">                       └────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The link opens the page you changed.</b> The preview link goes straight to the page that shows the change, such as a mini app's own page or the settings page, not the home page. It shows on its own line as <i>Click here to see the preview:</i>, like the plan's link. The home page is used only when the change has no page of its own.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A gap under the plan's link.</b> When a plan waits for you, a blank line now separates its link from <i>When you're ready, type <code>/apply</code> to build it.</i>, so the chat no longer runs them together.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The same everywhere a preview shows.</b> Any reply that prints a preview link and then asks a question offers the choice, such as a save you ran yourself.</div></div></li>
</ol>
<p class="aside">Non-goals: no change to how the preview is made; no change to the live link after publishing.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the choice mirrors <i>Review the plan</i>: it shows the link as plain text, asks nothing, and starts nothing, because the person asked for the same fix as the plan's page.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the rule lives once in the shared ask convention and covers any reply that prints a preview link before a question, such as a directly run <code>/save</code>, because one rule in one place can't drift.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked for a gap between the plan's link and the line under it → chose a blank line, printed by the page builder.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked for the preview link to open where the change can be seen → chose the page that shows the change, the home page only when none does.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the live link after publishing stays as is, because the person asked about the build step, and <code>/ship</code>'s report ends with no link-hiding problem reported.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: archived and checkpointed by <code>/ship</code> for merge, because every task was done and checks passed locally.</li>
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

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
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
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
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
