<!-- openspec-archive v1 2026-10-03-verify-autonomous-staging -->
<!-- file proposal.md utf8 2780 -->
# Complete safe verification before asking for help

**Status:** ready-to-ship
**Branch:** sleek-dragonfly
**Open questions:** none

## Why

Verification should check as much as it safely can without bringing you in halfway through. You should get the results together, with a clear list of the few checks that need your login, permission, or hands-on help.

## What Changes

- Finish independent checks before asking for help, even when another check is blocked or its result is unclear.
  ```text
  Safe checks ──▶ Results together
      │                │
      ▼                ▼
  Continue others   One help list
                       │
                       ▼
                  Resume remaining
  ```
- Exercise changes on disposable staging data, preserving shared data and keeping real-world actions behind the permissions they need.
- Try safe simulations for checks that cannot be completed directly, and explain what they show and what remains unproven. Give you one list of remaining checks with the option to help, skip selected checks, or skip them all. Skipped checks stay clearly marked as unchecked. Already completed checks stay completed unless your action changes their conditions.

**Non-goals:** changing publishing approval, broadening verification into an unrelated audit, or inventing new testing tools.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: continue safe independent checks, protect staging data, and consolidate human handoffs.

## Impact

The verify skill and walkthrough reference, their owning wiki page, and the payload changelog. No app, dependency, or driver changes.

## Decision log

- **2026-10-03** — Assumed: finish safe independent checks before one consolidated handoff, because the request asks to do as much as possible before involving the person.
- **2026-10-03** — Assumed: staging writes use disposable data and known test integrations; a staging URL alone does not authorize resetting shared data or triggering real-world effects.
- **2026-10-03** — Assumed: retain the existing scope and retry bounds, because autonomy should complete the requested checks without widening the assignment.
- **2026-10-03** — Asked: review note on Change #3 → added safe best-effort simulations before the handoff and options to skip selected or all remaining checks. Simulated evidence must name its limits, and skipped checks remain unverified; implementation waits for a later instruction.
- **2026-10-03** — Asked: `/ship` → authorized completing the remaining simulation and skip work and publishing it. All eight tasks passed their checks; the archive checkpoint carries release 29.16.0 and the before/after grading and independent handoff reviews.

<!-- end proposal.md -->
<!-- file design.md utf8 3690 -->
# Verification autonomy and staging safety

## Context

See [the proposal](proposal.md) for the intended outcome. The driver already runs independent journeys in order; the changes are agent decisions around safety, blocking, and reporting. The current instructions immediately ask on ambiguous evidence and reset any stack-pack staging database after failure.

## Decisions

- Keep the existing driver and probe ladder. Add a scenario ledger before execution, distinguishing runnable checks from blocked checks, dependencies, and cleanup. Scope stays with the selected change, or the named plain check.
- Authorize reversible staging actions only against isolated fixtures or records created by the invocation, with known cleanup. Confirm deployed bindings and test integration destinations before writes; never infer isolation from the URL alone. Database-wide reset requires an established disposable seed database with no overlapping work.
- Collect unresolved evidence, manual checks, credentials, and permissions for one final handoff. A block pauses only dependent journeys. Failures remain failures; ambiguity stays unverified. Existing SUCCESS-with-partly-shown semantics remain, while a runnable scenario blocked by access, safety, or ambiguity makes the final result UNKNOWN unless FAILURE or TIMEOUT applies.
- Before the handoff, attempt the strongest safe simulation available through existing deployed interfaces, disposable synthetic data, or established sandbox integrations. Keep the no-local-execution and no-invented-tooling boundaries. Record that evidence is simulated, which claims it supports, and what real behavior remains unproven; a simulated delivery cannot prove actual delivery or a person's experience. If no safe simulation exists, explain the limitation rather than inventing evidence.
- The consolidated handoff offers help or authorization, skipping selected checks, or skipping all remaining checks. Record each declined check as skipped and unverified with its evidence limits; stop requesting it unless the person reopens it. Skipping grants no authorization, erases no observed failure, and creates no passing result. Apply existing verdict rules to the coverage actually obtained.
- Keep the grader's evidence standards and two-fix bound. Change when the person is asked, rather than supplying an assumed reading. Preserve useful evidence in the comment or chat before temporary-file cleanup; after help, resume only the pending checks and anything invalidated.
- Keep instructions within the existing context ceiling by tightening the reference's long comment example and repeated prose. Update the owning wiki reasons and capability delta together.

## Risks / Trade-offs

- A safe fixture is absent → report the check as unverified; finish independent read-only checks.
- An integration's target is unknown → defer its trigger, state the exact destination or sandbox proof needed, and avoid a real-world effect.
- Simulation could be mistaken for complete verification → label its source and limits and retain unverified real-world claims, including checks the person skips.
- Existing practice evaluation covers grading, not staging ownership → measure baseline and candidate grading, then review realistic blocking and safety cases separately.

## Migration

The payload release replaces instructions and docs only. Existing previews and credentials keep working. No data migration or new configuration.

## Validation

[Practice measurement](measurement.md) records the before/after results and runner limitation. [Verification checks](verification.md) records realistic handoff and staging-safety reviews and validator compatibility.

<!-- end design.md -->
<!-- file tasks.md utf8 1622 -->
# Tasks

## 1. Skill and walkthrough

- [x] 1.1 Measure the existing grading reference and a scratch candidate with the practice evaluation; record actual results or runner limitations without treating an unsuccessful run as a measurement.
- [x] 1.2 Update the skill and reference to complete independent safe checks, protect staging and real integrations, and consolidate human handoffs; review login, ambiguous evidence, unsafe reset, and safe delete cases against the delta.
- [x] 1.3 Validate the skill metadata and context ceiling; run payload link and OpenSpec config checks and strict change validation.
- [x] 1.4 Add safe best-effort simulations before the consolidated handoff and options to skip selected or all remaining checks; verify simulations name evidence limits, skipped checks stay unverified, and skipped help is not requested again unless reopened.
- [x] 1.5 Review simulation and skip behavior against the revised scenarios, measure any grading changes, and rerun metadata, context, payload link, config, and strict change checks; preserve the existing staging safety and retry bounds.

## 2. Docs and release

- [x] 2.1 Update the staging walkthrough's reasons to match the skill and add a Next minor changelog entry with the updating note; verify links and leave VERSION unchanged.
- [x] 2.2 Rebuild the review page and mark the proposal ready-to-ship after the revised work and checks pass; verify every task is complete.
- [x] 2.3 Update the owning wiki and pending release entry to explain safe simulations, their limits, and skipping remaining checks; verify links and leave VERSION unchanged.

<!-- end tasks.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 6520 -->
# Staging walkthrough delta

## MODIFIED Requirements

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. A journey whose evidence shows some of its `THEN` and contradicts none SHALL be reported as partly shown, naming each part not shown and why, and SHALL NOT be reported as a plain pass; it does not change the walk's verdict. Ambiguous evidence SHALL remain unverified and be shown beside its `THEN` for the person to resolve after independent safe checks finish.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: A part the preview cannot show

- **WHEN** a `THEN` promises a greeting that appears and is announced, and the evidence shows it appearing but nothing can show it announced
- **THEN** the journey is reported as partly shown, naming the announcement, and the walk's verdict is unchanged

#### Scenario: Ambiguity does not stop independent checks

- **WHEN** one journey's evidence is ambiguous and another journey can safely run independently
- **THEN** the independent journey completes before the person is asked to resolve the ambiguous evidence

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE` only, `/verify` SHALL reset staging to its seed only when it is an established disposable staging database, separate from production, and no overlapping work depends on its current data. Otherwise it SHALL preserve shared data and clean up only records it owns through known safe operations. It SHALL then fix a failure in this change's own scope, save, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. A failure SHALL NOT prevent independent safe checks from completing.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` safely restores its disposable test data, fixes, saves, and walks again, stopping after two failed attempts

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` preserves shared data, reports the failure, and finishes independent safe checks without a fix

## ADDED Requirements

### Requirement: Safe checks finish before a consolidated handoff

Within the requested scope, `/verify` SHALL complete every safe check possible with existing authorization and tools before asking for help. A blocked check SHALL pause only its dependents. The report SHALL distinguish completed, failed, partly shown, and unverified checks. Remaining checks SHALL form one consolidated handoff naming the reason, exact manual action or authorization needed, and expected observation, with options to help, skip selected checks, or skip all remaining checks. Skipped checks SHALL remain explicitly unverified and SHALL NOT be requested again unless the person reopens them. Skipping SHALL NOT imply authorization, erase an observed failure, or count as a pass. After the person helps, verification SHALL resume pending checks and repeat completed checks only when their conditions changed. Waiting or an unattended run SHALL NOT imply authorization.

#### Scenario: One check needs a person's login

- **WHEN** a login blocks one journey while other journeys need no person
- **THEN** those other journeys complete, and the final handoff names the blocked journey and how to enable or manually complete it

#### Scenario: Help enables the pending check

- **WHEN** the person supplies the requested authorization without changing completed checks' conditions
- **THEN** only the pending journey and its dependents resume

#### Scenario: The person skips remaining manual checks

- **WHEN** the person chooses to skip selected or all remaining checks
- **THEN** the report names those checks as skipped and unverified, retains observed failures and coverage gaps, and no further help is requested for them unless the person reopens them

### Requirement: Safe simulations explain their evidence limits

For checks that cannot be completed directly, `/verify` SHALL attempt the strongest safe simulation possible with existing authorization, tools, and deployed test surfaces before asking for help. Simulation SHALL preserve the same staging and external-system safety boundaries. Its report SHALL identify simulated evidence, claims it supports, and real behavior it does not prove. Simulated effects SHALL NOT count as proof of unobserved real effects. If no safe simulation exists, the check SHALL remain unverified with its limitation explained.

#### Scenario: A sandbox can simulate delivery

- **WHEN** actual delivery requires help but an existing safe sandbox can exercise the request and response
- **THEN** verification exercises the sandbox, labels the resulting evidence as simulated, and leaves actual delivery unverified with the option to help or skip it

#### Scenario: No safe simulation is available

- **WHEN** a remaining check has no safely accessible simulation
- **THEN** its limitation is reported without fabricated evidence or unsafe actions, and the person can help or skip the check

### Requirement: Verification preserves staging and external systems

Verification SHALL use staging-only bindings and known sandbox destinations for mutating checks. Reversible writes and destructive journeys SHALL be limited to disposable fixtures or records owned by the invocation with known safe cleanup. Existing shared data, production resources, access controls beyond already authorized repair, and real messages, purchases, or paid resources SHALL require explicit authorization before being changed or triggered. If isolation or safe cleanup cannot be established, the affected checks SHALL remain unverified while independent safe checks continue.

#### Scenario: A disposable delete journey

- **WHEN** a delete scenario has an isolated staging fixture and a known restoration path
- **THEN** the journey runs without a permission prompt and the fixture is safely restored afterwards

#### Scenario: Staging points at a real integration

- **WHEN** a staging journey would send a real message or its integration destination cannot be established
- **THEN** its trigger is deferred for the final authorization handoff and independent safe checks still run

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-03

~~~
<!-- end .openspec.yaml -->
<!-- file measurement.md utf8 2725 -->
# Verification instruction measurement

Measured 2026-10-03, one isolated practice run per version. Model: inherited Codex session model; the host exposes no exact identifier or per-agent cost. Approximate elapsed time: baseline 4 minutes, candidate 5 minutes. Cost is unavailable.

The normal `scripts/eval-verify.mjs --label autonomous-baseline --runs 1` attempt ended with HTTP 429 before any model tokens or verdicts: its CLI account had reached its weekly limit. Its displayed zero scores are not a measurement.

Instead, two independent delegated agents received the same twelve practice promises, separate disposable instances of the existing practice site, their own temporary evidence directories, and the baseline or candidate reference. Neither received the answer key, implementation, or the other agent's output. They used the existing verification driver and browser. The parent scored their verdict files against the existing key using the evaluator's caught/missed/false-alarm rules.

| Version | Planted failures caught | Missed | Working promises failed | Working passed | Asked | Unobservable claims named | Overclaimed | Ungraded |
|---|---|---|---|---|---|---|---|---|
| Baseline | 5/5 | 0 | 0/4 | 3/4 | 1 | 3/3 | 0 | 0 |
| Candidate | 5/5 | 0 | 0/4 | 3/4 | 1 | 3/3 | 0 | 0 |

Both agents deferred the meaning of “Saved badge” rather than assuming that plain inline Saved text met it. Both caught the incorrect empty-title message, wrong deletion, invalid API creation side effect, truncated title after reload, and nonmatching search row. Both named nightly indexing, audit logging, and email delivery as unobserved claims.

The result supports retaining the existing detection standard while changing when help is requested. This is a single-run comparison, not evidence of improved detection or a statistical benchmark. Candidate sections a, b, and d were held stable during measurement; subsequent cuts to report prose and execution dependency instructions did not change the grader.

The practice fixture measures grading, not shared-data isolation or credential handoff. See [the verification review](verification.md) for those instruction checks; their runtime enforcement remains the agent's responsibility.

The later simulation and skip additions live in report section f and the skill entrypoint. Sections a (scouting), b (journey writing), and d (grading) are byte-identical to the measured candidate, confirmed against a scratch copy before this revision. No grading changes required another practice run; the table above remains the applicable grading evidence. The revised simulation and skip cases are reviewed in [verification](verification.md), separately from the practice scores.

<!-- end measurement.md -->
<!-- file review.html utf8 33538 fence=~~~ -->
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
<title>Review · 2026-10-03-verify-autonomous-staging</title>
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
<body data-change="2026-10-03-verify-autonomous-staging">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-03-verify-autonomous-staging</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Verification should check as much as it safely can without bringing you in halfway through. You should get the results together, with a clear list of the few checks that need your login, permission, or hands-on help.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0">Finish independent checks before asking for help, even when another check is blocked or its result is unclear.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">Safe checks ──▶ Results together</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">    │                │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">    ▼                ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Continue others   One help list</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                     │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                     ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">                Resume remaining</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0">Exercise changes on disposable staging data, preserving shared data and keeping real-world actions behind the permissions they need.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0">Try safe simulations for checks that cannot be completed directly, and explain what they show and what remains unproven. Give you one list of remaining checks with the option to help, skip selected checks, or skip them all. Skipped checks stay clearly marked as unchecked. Already completed checks stay completed unless your action changes their conditions.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> changing publishing approval, broadening verification into an unrelated audit, or inventing new testing tools.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: finish safe independent checks before one consolidated handoff, because the request asks to do as much as possible before involving the person.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: staging writes use disposable data and known test integrations; a staging URL alone does not authorize resetting shared data or triggering real-world effects.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: retain the existing scope and retry bounds, because autonomy should complete the requested checks without widening the assignment.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked: review note on Change #3 → added safe best-effort simulations before the handoff and options to skip selected or all remaining checks. Simulated evidence must name its limits, and skipped checks remain unverified; implementation waits for a later instruction.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked: <code>/ship</code> → authorized completing the remaining simulation and skip work and publishing it. All eight tasks passed their checks; the archive checkpoint carries release 29.16.0 and the before/after grading and independent handoff reviews.</li>
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
<!-- file verification.md utf8 4182 -->
# Verification checks

- Login blocks one journey: only its dependents pause. Independent browser, request, and state checks finish; a browser preflight failure falls back to request/state checks. The final handoff names the login action, expected observation, and pending checks.
- Ambiguous evidence: the journey stays unverified, with its original expectation and evidence preserved for a person. Other safe checks continue. Contradictions still fail; inherently unobservable claims stay partly shown.
- Shared staging or real integration: the address alone proves no isolation. Unknown destinations and unsafe resets are deferred; shared data stays intact. A seed reset requires failure, an established disposable database separate from production, and no overlapping dependent work.
- Disposable delete: an isolated owned fixture with known safe cleanup runs without asking. Cleanup restores owned data on pass or fail; a cleanup failure preserves record identifiers and blocks dependent mutations.
- Help arrives: only pending checks and their dependents resume. Completed mutation inputs are moved outside the driver's journeys directory, so repair retries cannot replay them.
- Partly shown claim: the help list includes a human observation where possible; absent surfaces require named access or instrumentation, not an invented proof.
- Sandbox simulation: before asking for help, exercise an existing deployed sandbox with disposable data and the same isolation and cleanup checks. Label its observations simulated and leave actual delivery and a person's experience unproven. No new tool or local app execution is introduced.
- No safe simulation: missing surfaces or unknown integration targets stay unverified with the reason, while other checks finish. A simulation never grants permission to trigger a real effect.
- Skip selected or all remaining checks: report the chosen checks as skipped and unverified; keep observed failures and coverage gaps. A blocked reachable check still yields UNKNOWN unless FAILURE or TIMEOUT takes precedence. Do not request skipped help again unless the person reopens the check.

The generic skill validator rejects the existing host-specific `user-invocable` key. The original frontmatter parses as YAML with `user-invocable: true` preserved. A temporary copy omitting only that field passes the generic validator; no workflow metadata was changed for compatibility.

## Independent simulation and skip exercise

On 2026-10-03 an independent delegated agent read the revised skill and reference, with raw records for a failed deletion, receipt creation with a test mail adapter, project creation pointing at real billing, and a greeting with an aria-live region. It then received the person's instruction to skip all remaining checks. This was a decision-only exercise: no network requests, app runs, or staging writes.

The resulting plan used the existing test adapter for a safe simulated mail check without inventing its result, deferred real paid provisioning, and kept actual email arrival and screen-reader speech unproved. Its post-skip report retained FAILURE for deletion, marked remaining checks skipped and unverified, and made no further help requests for them. It required scope evidence before selecting any deletion fix and established no authority to reset staging.

The exercise exposed no necessary instruction change. Email delivery can remain partly shown or become a blocked reachable check depending on the actual deployed delivery surface and authorization; the existing distinction applies to observed coverage. This review does not prove runtime isolation or actual delivery.

Payload links, OpenSpec config parsing, and strict change validation passed again after the simulation and skip additions. Context measurement passed: skill instructions total 190792 bytes below the 190845-byte ceiling; startup uses 2195 of 2200 words. The original YAML frontmatter parses and a temporary copy omitting only the existing host-specific field passes the generic validator. No application build was run and VERSION was left unchanged. See [practice measurement](measurement.md) for the before/after grading result.

<!-- end verification.md -->
