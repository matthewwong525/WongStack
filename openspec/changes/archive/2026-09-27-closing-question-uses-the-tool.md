<!-- openspec-archive v1 2026-09-27-closing-question-uses-the-tool -->
<!-- file proposal.md utf8 5187 -->
# Every plan prints its link, and "What next?" is multiple choice

**Status:** ready-to-ship
**Branch:** explore/why-multiple-choice
**Open questions:** none

## Why

The assistant asks you questions as tap-to-answer choices, except the last one in a reply. "What next?" after a plan, a report, or a finished task comes as a typed numbered list, so you have to type "1" to answer it. The rule for that last question says to use the same format as every other question, but never says to use the same tool, and its examples read like text to write out.

The plan's link has the opposite problem: only the plan step knows to print it. When a plan is made or changed some other way, the reply can end without the link, and the review page is hard to find.

## What Changes

- **"What next?" becomes tap-to-answer.** The report and the plan link stay as text. The question under them becomes a choice you tap, like every other question.
  ```text
  Before                After
  ──────                ─────
  The plan is ready.    The plan is ready.
  Click here: [plan]    Click here: [plan]

  What next?            ┌──────────────────┐
  1. Build it now       │ What next?       │
     (Recommended)      │ ○ Build it now   │
  2. Change the plan    │   (Recommended)  │
  3. Stop here          │ ○ Change the plan│
                        │ ○ Stop here      │
  (you type "1")        │ ○ Other…         │
                        └──────────────────┘
  ```
- **Every plan prints its link.** Whenever the assistant makes or changes a plan, the reply prints *Click here to see the plan:* and the link, on its own line, just above the question. It does this whichever command made the plan: planning, building, updating WongStack, or your notes from the review page. It prints the link even when the work carries on without stopping. This becomes a standing rule, not a step only the plan command knows.
- **Where there is no tap-to-answer tool, nothing changes.** In a chat with no such tool, the assistant still writes the numbered list and waits.

Non-goals: no change to what the choices are, how many there are, or when the assistant asks; no command is renamed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `structured-asks`: the next-step requirement names the host question tool, by the same order as every other ask, and puts the report and review link in chat text before it. A new requirement: a reply that makes or changes a plan prints its review link, whatever verb made it.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: one line in *End every reply with the next step*, the finished-plan example reworded so the link is text and the choice is the question, and a new *Print the plan's link* rule that owns the link line.
- `AGENTS.md` (`CLAUDE.md` is its symlink): one line in the `WONG-STACK` block that states the link rule and links the shared page.
- `.agents/skills/plan/SKILL.md` *Finish*: links the shared rule instead of owning the *Click here* wording.
- `VERSION` 25.10.1 → 25.11.0 and a `CHANGELOG.md` entry.
- No code, script, or test changes. Installed repos get it through `/wong-sync`; nothing to migrate.

## Decision log

- **2026-09-27** — Asked whether to fix the typed "What next?" menus → chose plan the fix.
- **2026-09-27** — Assumed: the fix is one line in the shared ask page plus the matching rule, because `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/verify`, and `/improve` all link that page for their closing question.
- **2026-09-27** — Asked (review) whether the plan link should print only in `/plan` → chose a standing rule: every reply that makes or changes a plan prints the link, whatever made it.
- **2026-09-27** — Assumed: the shared ask page owns the link rule, the `WONG-STACK` block states it in one line, and `/plan`'s *Finish* links it, because the block is always loaded and the page is the one place the wording lives.
- **2026-09-27** — Assumed: the link stays in the chat text above the question, not inside the tap-to-answer card, because a card may not make links clickable.
- **2026-09-27** — Assumed: a minor release, 25.10.0, because it adds a standing rule; installed repos need no migration. The unsaved setup change also picked 25.10.0, so whichever publishes second takes the next number.
- **2026-09-27** — Assumed: the report and the plan link go in the chat text just before the question, because a tap-to-answer card holds short choices, not a report.
- **2026-09-27** — Built: the *Print the plan's link* section and the tool line in `asking-the-user.md`, the `WONG-STACK` block line, and `/plan`'s *Finish* link. The setup change shipped first as 25.10.0 and a fix as 25.10.1, so this release is renumbered 25.11.0 on top of `main`.
- **2026-09-27** — Distilled: no repeatable fact for the wiki. The one preference (print the plan link from a shared rule) is now the rule itself.
- **2026-09-27** — Archived after CI passed on the pull request (task 3.3); this is the archive checkpoint.

<!-- end proposal.md -->
<!-- file design.md utf8 3276 -->
# Design

## Context

`asking-the-user.md` has two sections that matter here. *Which tool carries it* sets the tool order: Codex `request_user_input`, Claude `AskUserQuestion`, another structured tool, then numbered chat. *End every reply with the next step* says to put the closing question "in the same format", and its finished-plan example reads as prose to write out ("one line, *Click here to see the plan:* … then build it now / change the plan first / stop here"). In the purple-falcon session, the agent called `AskUserQuestion` four times for clarification and typed both closing menus as numbered chat.

## Goals / Non-Goals

**Goals:** the closing question follows *Which tool carries it*, with the report and link as text before it. Every reply that makes or changes a plan prints its link, whichever skill made it.

**Non-Goals:** no change to the options, the tool order, or when a reply asks; no edit to the runbooks of `/apply`, `/continue`, `/ship`, or `/wong-sync`; they reach the rule through the block and `/plan`.

## Decisions

- **One line in the shared page, not a line in each skill.** The payload rule says a skill never keeps a second copy of the choice format or the tool order. Every skill with a closing question links *End every reply with the next step*, so one line there reaches all of them. Alternative: add "use the question tool" to `/plan`'s *Finish* and each runbook's end — seven copies that can drift.
- **Reword the finished-plan example.** It says "one line … then build it now", which reads as one block of text. The new wording separates the two: the *Click here to see the plan:* link in chat text, then the question with its three options. Alternative: leave the example and rely on the new line; the example is what agents copy, so it has to match.
- **The link rule lives in the shared ask page, stated in the block.** A plan can come from `/plan`, `/apply`, `/continue`, `/ship`, `/wong-sync`, or review notes. Today only `/plan`'s *Finish* names the *Click here* line, and only for a standalone run. A new *Print the plan's link* section in `asking-the-user.md` owns the wording. The `WONG-STACK` block gets one line that states it and links there, because the block loads in every session, even when no skill is loaded. `/plan`'s *Finish* links the section instead of spelling out the line. Alternative: a line in each of the five skills — five copies, which the payload rule forbids.
- **Print the link even when the chain continues.** A typed `/apply` or `/ship` plans and builds in one run. The link costs one line and lets the person open the plan while the build goes on; it adds no stop.
- **Report before the question, in chat text.** A question tool's card holds a short question and short options. The report and review link stay readable and clickable in the chat, above the card.

## Risks / Trade-offs

- [A host shows the tool's card but drops the chat text written in the same turn] → Paseo showed both in the purple-falcon session, where clarification questions followed text. If a host drops it, the fix belongs in the tool order, not here.
- [An agent still types the list out of habit] → the spec scenario names the case; `/improve`'s stale-guidance survey reads the page against transcripts.

<!-- end design.md -->
<!-- file tasks.md utf8 2265 -->
# Tasks

## 1. Ask convention

- [x] 1.1 In `.agents/skills/explore/references/asking-the-user.md`, *End every reply with the next step*, add a line that the next-step question is an ask like any other: it goes through the first callable tool in *Which tool carries it*, with the report and any review link written as chat text before it. Verify by reading the section: it names *Which tool carries it* by link and says numbered chat only when no tool is callable.
- [x] 1.2 Reword the finished-plan example in the same section so the *Click here to see the plan:* link is chat text and build it now *(Recommended)* / change the plan first / stop here is the question. Verify that no example in the section reads as a numbered list to type.

- [x] 1.3 Add a *Print the plan's link* section to the same page: whenever a reply makes or changes a plan, whatever skill made it and even when work continues, print *Click here to see the plan:* with a Markdown link to `review.html` on its own line, just above any question and outside the tool. Point the finished-plan example at it. Verify the section names every plan source in the spec's requirement.
- [x] 1.4 In `.agents/skills/plan/SKILL.md` *Finish*, replace the *Click here to see the plan:* wording with a link to the new section. Verify `grep -rn "Click here to see the plan" .agents` finds only the shared page.

## 2. Always-loaded rule

- [x] 2.1 Add one `WONG-STACK` block line to `AGENTS.md`: print the plan's link whenever you make or change a plan, linking the new section. Verify the line sits inside the block markers and `node scripts/check-payload-links.mjs` resolves its link.

## 3. Release

- [x] 3.1 Bump `VERSION` to 25.11.0 and add a newest-first `CHANGELOG.md` entry with an **Updating** line saying `/wong-sync` brings it and nothing needs migrating. Verify `VERSION` and the top `CHANGELOG.md` heading agree.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate closing-question-uses-the-tool --strict --no-interactive`; verify each passes. If `origin/main` already has 25.11.0 by then, take the next minor.
- [x] 3.3 Checkpoint with `/save` and verify CI passes on the pull request.

<!-- end tasks.md -->
<!-- file specs/structured-asks/spec.md utf8 3374 -->
## MODIFIED Requirements

### Requirement: A reply that returns control offers the next step

A skill SHALL end a reply that hands control back to the user with the decision that moves the work forward, put as a structured question in the same choice format. The skill SHALL carry that question with the same question mechanism as every other ask, in the same tool order, and SHALL NOT write it as numbered chat while a structured question tool is callable. The report, review link, or blocker that precedes the question SHALL be written as chat text before the question. This SHALL apply to a completed stage, a checkpoint, a report, and a blocked or partial result. The options SHALL be the supported ways to continue from the reported state, with the recommended one first. Where the work continues without user input, the skill SHALL continue instead of asking.

#### Scenario: A stage completes and stops

- **WHEN** a skill finishes its work and returns control to the user
- **THEN** its reply ends with the supported next steps as options, the recommended one first

#### Scenario: A structured question tool is callable at the end of a reply

- **WHEN** a skill ends a reply with the next-step question and `AskUserQuestion`, `request_user_input`, or an equivalent tool is callable
- **THEN** the report and any review link are written as chat text first
- **AND** the next-step question is asked through that tool, not as numbered chat

#### Scenario: Work is blocked or partial

- **WHEN** a skill stops with a blocker or unfinished work
- **THEN** its reply ends with the supported ways to resolve the blocker as options
- **AND** the report of the blocker stays intact

#### Scenario: The chain continues on its own

- **WHEN** a skill hands off to another skill that its invocation already authorized
- **THEN** it continues the chain
- **AND** it does not interrupt with a next-step question

## ADDED Requirements

### Requirement: A reply that makes or changes a plan prints its review link

Whenever a reply creates a change's plan or edits its proposal, the reply SHALL print *Click here to see the plan:* with a Markdown link to the change's `review.html`, as chat text on its own line. This SHALL hold whichever skill made or edited the plan — `/plan`, `/apply` planning first, `/continue`, `/ship`, `/wong-sync`, or review notes — and SHALL hold when the work continues without stopping. When the reply ends with a question, the link SHALL come just above it, outside the question tool. The rule SHALL live in the shared ask convention and be stated in the `WONG-STACK` block; a skill SHALL link it rather than restate it.

#### Scenario: A plan is made without the plan verb

- **WHEN** `/apply`, `/ship`, or `/wong-sync` creates a plan in the course of its own run
- **THEN** the reply prints the review link on its own line

#### Scenario: The work continues after planning

- **WHEN** the person's invocation authorizes building straight after the plan
- **THEN** the reply prints the review link before the build continues
- **AND** it does not stop to ask only because the link was printed

#### Scenario: The reply ends with a question

- **WHEN** a reply that made or changed a plan ends with a next-step question asked through a structured question tool
- **THEN** the link is chat text just above the question, not inside the tool's card

<!-- end specs/structured-asks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 35678 fence=~~~ -->
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
<title>Review · 2026-09-27-closing-question-uses-the-tool</title>
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
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-closing-question-uses-the-tool">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-closing-question-uses-the-tool</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The assistant asks you questions as tap-to-answer choices, except the last one in a reply. &quot;What next?&quot; after a plan, a report, or a finished task comes as a typed numbered list, so you have to type &quot;1&quot; to answer it. The rule for that last question says to use the same format as every other question, but never says to use the same tool, and its examples read like text to write out.</p>
<p data-note="why-2" tabindex="0">The plan's link has the opposite problem: only the plan step knows to print it. When a plan is made or changed some other way, the reply can end without the link, and the review page is hard to find.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>&quot;What next?&quot; becomes tap-to-answer.</b> The report and the plan link stay as text. The question under them becomes a choice you tap, like every other question.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">Before                After</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">──────                ─────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">The plan is ready.    The plan is ready.</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Click here: [plan]    Click here: [plan]</span>

<span class="ln" data-note="item-1-line-6" tabindex="0">What next?            ┌──────────────────┐</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">1. Build it now       │ What next?       │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">   (Recommended)      │ ○ Build it now   │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">2. Change the plan    │   (Recommended)  │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">3. Stop here          │ ○ Change the plan│</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">                      │ ○ Stop here      │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">(you type &quot;1&quot;)        │ ○ Other…         │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">                      └──────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Every plan prints its link.</b> Whenever the assistant makes or changes a plan, the reply prints <i>Click here to see the plan:</i> and the link, on its own line, just above the question. It does this whichever command made the plan: planning, building, updating WongStack, or your notes from the review page. It prints the link even when the work carries on without stopping. This becomes a standing rule, not a step only the plan command knows.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Where there is no tap-to-answer tool, nothing changes.</b> In a chat with no such tool, the assistant still writes the numbered list and waits.</div></div></li>
</ol>
<p class="aside">Non-goals: no change to what the choices are, how many there are, or when the assistant asks; no command is renamed.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to fix the typed &quot;What next?&quot; menus → chose plan the fix.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the fix is one line in the shared ask page plus the matching rule, because <code>/plan</code>, <code>/apply</code>, <code>/save</code>, <code>/continue</code>, <code>/ship</code>, <code>/verify</code>, and <code>/improve</code> all link that page for their closing question.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked (review) whether the plan link should print only in <code>/plan</code> → chose a standing rule: every reply that makes or changes a plan prints the link, whatever made it.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the shared ask page owns the link rule, the <code>WONG-STACK</code> block states it in one line, and <code>/plan</code>'s <i>Finish</i> links it, because the block is always loaded and the page is the one place the wording lives.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the link stays in the chat text above the question, not inside the tap-to-answer card, because a card may not make links clickable.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, 25.10.0, because it adds a standing rule; installed repos need no migration. The unsaved setup change also picked 25.10.0, so whichever publishes second takes the next number.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the report and the plan link go in the chat text just before the question, because a tap-to-answer card holds short choices, not a report.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built: the <i>Print the plan's link</i> section and the tool line in <code>asking-the-user.md</code>, the <code>WONG-STACK</code> block line, and <code>/plan</code>'s <i>Finish</i> link. The setup change shipped first as 25.10.0 and a fix as 25.10.1, so this release is renumbered 25.11.0 on top of <code>main</code>.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no repeatable fact for the wiki. The one preference (print the plan link from a shared rule) is now the rule itself.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived after CI passed on the pull request (task 3.3); this is the archive checkpoint.</li>
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
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
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
