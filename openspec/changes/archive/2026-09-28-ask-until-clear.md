<!-- openspec-archive v1 2026-09-28-ask-until-clear -->
<!-- file proposal.md utf8 7094 -->
# Plans ask until they're clear, go straight from updates, and can publish in one pick

**Status:** ready-to-ship
**Branch:** allow-multiple-choice
**Open questions:** none

## Why

When you ask for a change, the assistant gets one set of questions before it writes the plan. If your answers raise a new question, it has to guess instead of asking, even though answering one more multiple-choice question takes you seconds. And an update from WongStack in an older install can stop halfway to ask *Plan it?* when the update should just go to a plan. And when a plan is ready, publishing it takes two answers even when you already know you want it live.

## What Changes

- **Follow-up questions are allowed.** Before a plan is written, whether you typed a verb or just asked, the assistant may ask another set of questions when your answers open a new choice. Every question stays multiple choice, with the recommended answer first and room for your own words. It still asks only what would make the plan wrong if guessed, never asks the same thing twice, and stops as soon as nothing is left open.
  ```text
     BEFORE               AFTER
  questions           questions
      │                   │
      ▼                   ▼
  answers             answers
      │                   │
      ▼             new choice? ──yes──┐
  guess the rest          │ no         ▼
      │                   ▼       more questions
      ▼                 plan ◀─────────┘
    plan
  ```
- **Updates go straight to a plan.** When an update finds new WongStack changes, it goes directly into planning, with no stop to ask *Plan it?* first. This holds for an older install too, whose own update steps still say to think it through first.
- **Build and publish in one pick.** When a plan is ready, the question under it adds *Build and publish*: the assistant builds the change, checks it, and makes it live with no second stop. *Build it now* stays first and still stops to show you the result before publishing.
  ```text
  What next for this plan?
  ┌───────────────────────────────┐
  │ 1. Build it now (Recommended) │
  │ 2. Build and publish    (new) │
  │ 3. Review the plan            │
  │ 4. Stop here                  │
  └───────────────────────────────┘
  ```
- **The upkeep check asks follow-ups too.** `/improve` may ask a second set of questions before it picks a fix, when your first answers leave a real choice open.
- **Nothing changes when nobody can answer.** An unattended run still takes the recommended answers and marks them as assumed.

Non-goals: no free-text questions in place of choices; no change to the one question about opening new workspaces, or to how review-page notes update a plan.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the one-round limit before planning becomes follow-up rounds of multiple-choice questions while a material choice stays open.
- `wong-sync`: an update goes straight into `/plan` with no standalone `/explore` stop, in old installs too; its exploration drops the one-round limit.
- `change-loop`: the stop at a finished plan also offers building and publishing in one go.
- `repository-improvement`: an interactive `/improve` may ask follow-up question groups before selecting.

## Impact

- `.agents/skills/explore/SKILL.md`: *The exit round* and *When `/plan` invokes `/explore`* allow follow-up groups; heading text kept, since installs link `#the-exit-round`.
- `.agents/skills/plan/SKILL.md` *Explore first*: drop "only question round".
- `.agents/skills/wong-sync/SKILL.md`: go straight to `/plan`; drop "the one question round".
- `.agents/skills/wong-sync/references/payload-manifest.md` *Planning an update*: one new handoff line that every sync, however old, reads from the source.
- `.agents/skills/improve/SKILL.md`: follow-up groups before selecting.
- `.agents/skills/explore/references/asking-the-user.md` *End every reply with the next step*: the finished-plan options; `AGENTS.md` (`CLAUDE.md` links to it) rule *A person just asks*; `wiki/development/the-change-loop.md` *Just ask*.
- `wiki/development/the-change-loop.md` *Asking before drafting* and *The steps*.
- `CHANGELOG.md` `## Next (minor)` entry.
- The `perfect-vulture` workspace (PR #187) also edits `plan/SKILL.md` and `asking-the-user.md`, in other paragraphs; whichever merges second rebases.

## Decision log

- **2026-09-28** — Assumed: "immediately go into /plan" means an update never stops at a standalone explore's *Plan it?* question, because today's `/wong-sync` already calls `/plan` while 16.x installs' own skill hands off to `/explore` (memory #382), and the person also asked for more questions, so skipping the questions is not the intent.
- **2026-09-28** — Assumed: old installs are reached through a new line in the payload manifest's *Planning an update*, because every sync reads that page from the source whatever its installed skill says.
- **2026-09-28** — Assumed: follow-up groups still pass the "wrong, not merely different" test and hold no more questions than the tool supports, because the person asked to lift the round limit, not the bar for a question; a standard over a quota matches their earlier choice (memory #52).
- **2026-09-28** — Assumed: `/improve`'s one group before selecting gets the same freedom, because the person said "ship, plan or whatever".
- **2026-09-28** — Assumed: the heading *The exit round* keeps its text, because installed repos link `#the-exit-round` and the link check fails a missing anchor.
- **2026-09-28** — Assumed: one change, not two workspaces, because both parts are small edits to the same few pages about asking before a plan.
- **2026-09-28** — Asked what next for the plan → chose to add a *Build and publish* option to the finished-plan question.
- **2026-09-28** — Assumed: *Build and publish* runs `/ship`, second in the list, with *Build it now* still recommended, because publishing unseen work should be a deliberate pick and the tool holds four options.
- **2026-09-28** — Assumed: prose only, no script, because the behavior lives in skill instructions.
- **2026-09-28** — Assumed: the `AGENTS.md` rule reads "build it now, or build and publish?" and *The exit round* drops a line repeating the assumptions rule, because the build first failed CI's instruction-size check (2206 words against 2200, skill bytes grown).
- **2026-09-28** — Wiki distillation: no repeatable fact beyond `wiki/development/the-change-loop.md`, which this change edits.
- **2026-09-28** — Assumed: merged `main` (26.26.0, review notes can be questions) as the union of both changes, and trimmed wording in `wong-sync`, `plan`, `improve`, and the ask format, because the combined skills ran 104 bytes over the instruction-size check.
- **2026-09-28** — Archive checkpoint: archived by `/ship` and saved for release 26.27.0.

<!-- end proposal.md -->
<!-- file design.md utf8 2940 -->
# Design

## Context

See proposal.md for why. `/explore`'s *The exit round* is the runbook for questions before planning; `/plan`, `/wong-sync`, `/improve`, and `wiki/development/the-change-loop.md` each restate the one-round limit. A 16.x install's own `/wong-sync` hands the preflight report to `/explore` with fixed text (memory #382), so its agent can end at standalone explore's *Plan it?* question. Every sync, however old, reads `payload-manifest.md` *Planning an update* from the source and adds its lines to the handoff word for word.

## Goals / Non-Goals

**Goals:**
- One page owns when follow-up questions are allowed: `/explore`'s *The exit round*. The others link it and drop their "one round" wording.
- A sync with an update always lands at a plan, in current and old installs.

**Non-Goals:**
- Changing the ask format, the question tool order, standalone explore's *Plan it?* ending when the person ran `/explore` themselves, the one new-workspace question, or review notes.

## Decisions

- **Follow-ups keep the bar.** Each group holds only choices a wrong guess would make the plan *wrong*, no more questions than the tool holds, and nothing already answered. A follow-up is allowed only when the last answers opened such a choice; with nothing open, asking stops. Minor gaps stay recorded assumptions. Alternative: no bar, which invites filler rounds on a phone.
- **Keep the heading *The exit round*.** Installs link `#the-exit-round` and `check-payload-links.mjs` fails a missing anchor. The section's first line says it may take follow-up groups.
- **Bounded mode loses "one chance to ask"** and the "no second group" line becomes "never re-ask a settled choice", so a nested `/plan` from `/apply` or `/ship` may still ask what is genuinely open.
- **Old installs through the manifest.** Add one line to *Planning an update*: go straight into `/plan`; when the installed skill says `/explore`, run it as `/plan`'s bounded pass and never stop at *Plan it?*. The current `/wong-sync` gets the same sentence in its own words.
- **Build and publish runs `/ship`.** It sits second, under *Build it now (Recommended)*, so publishing unseen work stays a deliberate pick. Four options fit every question tool WongStack uses. `/ship` already builds an unfinished change through `/apply`, so no new chain is needed.
- **Spec shape.** `asking-the-user` drops a scenario (*A gap after the round*), so the requirement is REMOVED and ADDED under a new name per the CLI contract; the other two are MODIFIED.

## Risks / Trade-offs

- [More rounds slow a plan down] → each round must pass the same "wrong, not different" bar, and a settled choice is never re-asked.
- [An old install's agent may still follow its own skill's *Plan it?* ending] → the manifest line is read and added to the handoff word for word; check on the next real old-install sync.
- [PR #187 edits nearby paragraphs] → rebase whichever merges second.

<!-- end design.md -->
<!-- file tasks.md utf8 2717 -->
# Tasks

## 1. Skills

- [x] 1.1 In `.agents/skills/explore/SKILL.md`, rewrite *The exit round* so questions before planning may take follow-up groups while a material choice stays open (same bar, per-group tool capacity, never re-ask, stop when nothing is open, minor gaps assumed); keep the heading text. In *When `/plan` invokes `/explore`*, drop "with one chance to ask" and "not yet done", and make the standalone *Plan it* hand-off say the bounded pass asks only what is still open. Verify the `asking-the-user` delta's two scenarios are covered.
- [x] 1.2 In `.agents/skills/plan/SKILL.md` *Explore first*, replace "the plan's only question round" with a link to the exit round's rule, and log every follow-up answer as an `Asked` line.
- [x] 1.3 In `.agents/skills/wong-sync/SKILL.md`, say an `update` goes straight into `/plan` with no standalone `/explore` or *Plan it?* stop, and replace "the one question round" with the exit round's rule.
- [x] 1.4 In `.agents/skills/wong-sync/references/payload-manifest.md` *Planning an update*, add a line: go straight into `/plan`; when the installed skill says `/explore`, run it as `/plan`'s bounded pass and never stop at *Plan it?*. Verify the `wong-sync` delta's scenario is covered.
- [x] 1.5 In `.agents/skills/improve/SKILL.md`, allow a follow-up multiple-choice group before selecting when an answer opens another material choice. Verify the `repository-improvement` delta.

- [x] 1.6 In `.agents/skills/explore/references/asking-the-user.md` *End every reply with the next step*, make the finished-plan options *Build it now (Recommended)* / *Build and publish* / *Review the plan* / *Stop here*, where *Build and publish* runs `/ship`. Verify the `change-loop` delta's new scenario is covered.

## 2. Docs

- [x] 2.1 In `wiki/development/the-change-loop.md`, update *Asking before drafting* and *The steps*' `/explore` bullet to follow-up rounds, linking the exit round rather than restating it. Verify the page reads in [our voice](../../../wiki/voice.md).
- [x] 2.2 In `wiki/development/the-change-loop.md` *Just ask* step 1 and the `AGENTS.md` rule *A person just asks*, name the *Build and publish* choice at the plan's stop, keeping the rule to one line.
- [x] 2.3 Search the payload for leftover "one round", "one question round", "only question round", "one chance", and "second group" wording and fix each.

## 3. Release

- [x] 3.1 Add a `## Next (minor) — Plans ask until they're clear, and publish in one pick` entry at the top of `CHANGELOG.md`, with an **Updating.** line saying nothing to do by hand. Verify `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs` pass.

<!-- end tasks.md -->
<!-- file specs/asking-the-user/spec.md utf8 1391 -->
## REMOVED Requirements

### Requirement: One question round before planning

**Reason**: One round forced a guess whenever an answer opened a new material choice, though another multiple-choice question costs the person seconds.
**Migration**: Replaced by *Questions before planning continue while a choice is open*; follow-up groups keep the same bar and format.

## ADDED Requirements

### Requirement: Questions before planning continue while a choice is open

At the move into planning, however planning was invoked, `/explore` SHALL ask only the choices a wrong guess would make the plan wrong, not merely different, as structured multiple-choice asks of no more questions than the tool holds per group. When the answers open another such choice, it SHALL ask a follow-up group rather than assume it, and SHALL stop asking once none is open. A choice already settled SHALL NOT be asked again, nested calls included, and a minor gap SHALL become a recorded assumption with its reason.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: An answer opens a new choice

- **WHEN** the first group's answers reveal another choice that would make the plan wrong if guessed
- **THEN** `/explore` asks a follow-up multiple-choice group before the plan is drafted

<!-- end specs/asking-the-user/spec.md -->
<!-- file specs/change-loop/spec.md utf8 1086 -->
## MODIFIED Requirements

### Requirement: A change asked with no verb stops twice

A code or process change asked for with no verb SHALL stop at the plan's review link to ask whether to build it now, and after `/apply`'s preview to ask whether to publish, running the next verb on yes. The question at the plan SHALL also offer to build and publish in one go, which runs `/ship` with no stop before the merge. A verb the person types SHALL keep its own reach.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, then says yes at both stops
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: Build and publish at the plan

- **WHEN** the person picks *Build and publish* in the question under a finished plan
- **THEN** the agent runs `/ship`, which builds, checks, and merges with no stop at the preview

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

<!-- end specs/change-loop/spec.md -->
<!-- file specs/repository-improvement/spec.md utf8 500 -->
## MODIFIED Requirements

### Requirement: Unattended only when said so

An interactive run SHALL ask material multiple-choice questions before selecting, with a follow-up group when an answer opens another material choice. A run SHALL be unattended only when its invocation says so explicitly; it then takes supported defaults, labelled assumed.

#### Scenario: No reply

- **WHEN** an interactive selection question goes unanswered
- **THEN** the run waits and does not treat silence as permission

<!-- end specs/repository-improvement/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1105 -->
## MODIFIED Requirements

### Requirement: The update is judged from its changed units

The exploration inside `/plan` SHALL start from the classified changed units, read other repo files only for a named dependency or impact, and ask by the shared rule for questions before planning. Earlier user decisions, including an old verdict record, SHALL inform it as context, never as approval.

#### Scenario: Small update

- **WHEN** a few payload units changed
- **THEN** exploration starts from those units instead of rereading the whole payload

## ADDED Requirements

### Requirement: An update goes straight into planning

When the preflight reports an update, sync SHALL invoke `/plan` directly, and SHALL NOT stop at a standalone `/explore` or its *Plan it?* question, including in an install whose own sync skill hands the report to `/explore`.

#### Scenario: An older install's skill names explore

- **WHEN** an install's own sync skill says to hand the report to `/explore`
- **THEN** the exploration runs as `/plan`'s bounded pass and the sync ends at the plan's review link, never at *Plan it?*

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-28

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 38895 fence=~~~ -->
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
<title>Review · 2026-09-28-ask-until-clear</title>
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
<body data-change="2026-09-28-ask-until-clear">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-28-ask-until-clear</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When you ask for a change, the assistant gets one set of questions before it writes the plan. If your answers raise a new question, it has to guess instead of asking, even though answering one more multiple-choice question takes you seconds. And an update from WongStack in an older install can stop halfway to ask <i>Plan it?</i> when the update should just go to a plan. And when a plan is ready, publishing it takes two answers even when you already know you want it live.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Follow-up questions are allowed.</b> Before a plan is written, whether you typed a verb or just asked, the assistant may ask another set of questions when your answers open a new choice. Every question stays multiple choice, with the recommended answer first and room for your own words. It still asks only what would make the plan wrong if guessed, never asks the same thing twice, and stops as soon as nothing is left open.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">   BEFORE               AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">questions           questions</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">    │                   │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">    ▼                   ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">answers             answers</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">    │                   │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">    ▼             new choice? ──yes──┐</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">guess the rest          │ no         ▼</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">    │                   ▼       more questions</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">    ▼                 plan ◀─────────┘</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">  plan</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Updates go straight to a plan.</b> When an update finds new WongStack changes, it goes directly into planning, with no stop to ask <i>Plan it?</i> first. This holds for an older install too, whose own update steps still say to think it through first.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Build and publish in one pick.</b> When a plan is ready, the question under it adds <i>Build and publish</i>: the assistant builds the change, checks it, and makes it live with no second stop. <i>Build it now</i> stays first and still stops to show you the result before publishing.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">What next for this plan?</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌───────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ 1. Build it now (Recommended) │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ 2. Build and publish    (new) │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ 3. Review the plan            │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ 4. Stop here                  │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">└───────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The upkeep check asks follow-ups too.</b> <code>/improve</code> may ask a second set of questions before it picks a fix, when your first answers leave a real choice open.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Nothing changes when nobody can answer.</b> An unattended run still takes the recommended answers and marks them as assumed.</div></div></li>
</ol>
<p class="aside">Non-goals: no free-text questions in place of choices; no change to the one question about opening new workspaces, or to how review-page notes update a plan.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: &quot;immediately go into /plan&quot; means an update never stops at a standalone explore's <i>Plan it?</i> question, because today's <code>/wong-sync</code> already calls <code>/plan</code> while 16.x installs' own skill hands off to <code>/explore</code> (memory #382), and the person also asked for more questions, so skipping the questions is not the intent.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: old installs are reached through a new line in the payload manifest's <i>Planning an update</i>, because every sync reads that page from the source whatever its installed skill says.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: follow-up groups still pass the &quot;wrong, not merely different&quot; test and hold no more questions than the tool supports, because the person asked to lift the round limit, not the bar for a question; a standard over a quota matches their earlier choice (memory #52).</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: <code>/improve</code>'s one group before selecting gets the same freedom, because the person said &quot;ship, plan or whatever&quot;.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the heading <i>The exit round</i> keeps its text, because installed repos link <code>#the-exit-round</code> and the link check fails a missing anchor.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: one change, not two workspaces, because both parts are small edits to the same few pages about asking before a plan.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked what next for the plan → chose to add a <i>Build and publish</i> option to the finished-plan question.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: <i>Build and publish</i> runs <code>/ship</code>, second in the list, with <i>Build it now</i> still recommended, because publishing unseen work should be a deliberate pick and the tool holds four options.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: prose only, no script, because the behavior lives in skill instructions.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the <code>AGENTS.md</code> rule reads &quot;build it now, or build and publish?&quot; and <i>The exit round</i> drops a line repeating the assumptions rule, because the build first failed CI's instruction-size check (2206 words against 2200, skill bytes grown).</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Wiki distillation: no repeatable fact beyond <code>wiki/development/the-change-loop.md</code>, which this change edits.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: merged <code>main</code> (26.26.0, review notes can be questions) as the union of both changes, and trimmed wording in <code>wong-sync</code>, <code>plan</code>, <code>improve</code>, and the ask format, because the combined skills ran 104 bytes over the instruction-size check.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Archive checkpoint: archived by <code>/ship</code> and saved for release 26.27.0.</li>
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
