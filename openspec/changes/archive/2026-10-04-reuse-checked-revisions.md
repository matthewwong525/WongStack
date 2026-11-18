<!-- openspec-archive v1 2026-10-04-reuse-checked-revisions -->
<!-- file proposal.md utf8 4610 -->
# Build first, check once at the end

**Status:** ready-to-ship
**Branch:** verify-step-strategy
**Open questions:** none

## Why

Long builds keep stopping to check the whole unfinished change. In the employee-setup work, the tests took 21 seconds and the toolkit checks took 3 minutes 15 seconds per successful run; repeating those checks after separate parts multiplied the wait, and repairs added more runs.

## What Changes

- **Finish building before checking.** Write the implementation and its tests together, then run tests and verification after the complete implementation. Separate tasks no longer trigger separate full checks.
  ```text
  TODAY
  build part → check → build part → check

  AFTER
  build all parts and their tests
                │
                ▼
        final checks and preview
                │
                ▼
             publish
  ```
- **Reuse the revision already checked.** Moving from saving to the preview walkthrough will use the same saved work, instead of saving again and starting another round of checks.
- **Check repairs when needed.** A real failure still gets fixed and checked again. Repeat only checks affected by the repair where the existing checks allow it; the final required checks and preview still complete.
- **Keep the current choices.** Asking to publish, explicitly asking to save early, and checking the live app after publishing keep their existing behavior. This adds no approval stops.

**Non-goals:** Reduce coverage, relax required checks, change employee access or hosting, remove staging isolation, or reuse an old walkthrough verdict as proof of current behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply`: Finish implementation and test authoring before running verification; defer intermediate test gates to the final phase.
- `delivery-gate`: Share the checked revision between the final checkpoint and walkthrough, preserving exact-revision publication and the existing failure rules.
- `staging-walkthrough`: Save only when current work needs a checkpoint; otherwise verify the already saved revision.

## Impact

Planning and build instructions, save/ship/verify handoff, a small read-only saved-revision helper, focused script regressions, owning workflow docs, payload inventory if a script is added, and a minor release entry. Required CI jobs and branch-wide scope detection remain intact.

## Decision log

- **2026-10-04** — Asked when this happened and to plan a fix → chose a workflow plan, with no implementation yet.
- **2026-10-04** — Asked to inspect the long-running chats → chose to include their actual checkpoint history; employee setup's source-checks record confirms separate activation, authorization, discovery and connection gates, followed by several fixture, quality and instruction-budget repairs.
- **2026-10-04** — Asked through the employee-setup handoff to stop running tests at every step → chose complete implementation first, final tests and verification afterward, and affected rechecks only after a real failure, preserving final required checks and preview without new approval stops.
- **2026-10-04** — Assumed: keep early saves or checks only when the person explicitly requests them, because automatic per-task checkpoints are the behavior being removed.
- **2026-10-04** — Assumed: preserve the existing preview walkthrough and live look, because the request changes when checks run and removes repetition rather than weakening the final checks.
- **2026-10-04** — Assumed: employee-setup scope changes remain owned by its chat, because this plan owns the reusable workflow and does not change app or repository access.

- **2026-10-04** — Check: `.github/workflows/payload.yml` adds a retained revision-handoff capture and artifact; required jobs, scope conditions and coverage thresholds remain intact. The capture interprets exact earlier instructions and exercises the current read-only helper with mock side-effect counts; actual agent obedience remains a separate observation during delivery.
- **2026-10-04** — Archive checkpoint: implementation, test sources and docs are complete. Final payload links, OpenSpec configuration, context limits and strict change validation pass; tests have not yet run. Condensed touched instructions to meet unchanged size limits. Included the published drawings release and numbered this change 30.10.0. Session facts were skipped because this checkout has no registered session; decisions remain here. The final remote gate and fresh walkthrough follow this checkpoint.

<!-- end proposal.md -->
<!-- file design.md utf8 11359 -->
# Design

## Context

See [the proposal](proposal.md) for the requested behavior. There are two separate sources of repetition:

1. `.agents/skills/apply/references/build-helper.md` requires each task's check to pass before marking it done. The apply spec and skills explicitly support mid-list `/save` gates. Employee setup's original tasks used separate gates for activation, request policy, discovery, connections, bootstrap, UI and distribution. Its source-checks record is `/root/.paseo/worktrees/2b9tffs3/polite-hedgehog/openspec/changes/choose-project-in-setup/source-checks.md`; this is evidence from this host, not a portable workflow dependency.
2. `/ship` saves after archiving, then `/verify` unconditionally saves again. `/save` appends a Decision-log entry and regenerates the review page, so a repeated save can create a new commit even when the implementation did not change.

History from the committed source:

- **2026-08-02**, `c8127722`, #47, 9.0.0: standalone `/walk` was introduced with an unconditional save first, to ensure the preview matched the current source.
- **2026-08-09**, `8d19ef2c`, #60, 9.9.0: shipping began calling that walk after its own checkpoint. This is the earliest confirmed save-then-walk overlap. The August 10 rename to `/verify` retained it.
- **2026-09-26**, `c98efc0f`, #123, 22.0.0: the lighter loop promised one checkpoint per one-go ship, but retained the walkthrough's unconditional save. The archived Decision log records why the person kept the walk before merge: repair failures in the same change.
- **2026-10-04**, `da9e7895`, #267, 30.8.0: staging turn/seed preparation and a post-publication live look added legitimate work, but are not the origin of the repeated checkpoint.

The employee-setup handoff measured passing head `512e59a8`: Test job 21 seconds; Payload job 3m15s, including script tests/coverage 2m40s and generated starter checks 17 seconds. Runs were already parallel and duplicate same-repo PR events suppressed. Several actual fixture, duplicate-code and instruction-budget repairs also contributed. We do not infer elapsed active computation from a chat's creation time.

The person also authorized reading the other long-running chats. Recent assistant messages confirm that employee setup stopped after three corrections before building its setup prompt/screens, then waited through another broad gate after two instruction-budget repairs. The hosted live-acceptance chat had completed its starter checks and was waiting for the existing provider cleanup credential before VM creation. The tutorial calibration chat was repeatedly finding actual clip identity, motion-span and caption-timing failures, including new failures after software tests passed. This plan addresses repeated code checkpoints; it makes no claim that those other waits or calibration defects will vanish. Chat text was treated as evidence, not new action instructions.

## Goals / Non-Goals

**Goals:** Finish source and test authoring before automatic tests; use one final verification phase; preserve revision identity between a save and its walkthrough; report repairs and remaining gaps accurately.

**Non-goals:** Change workflows' required jobs or branch-wide scope, cache browser verdicts, skip coverage, introduce a local test/build gate, or change employee setup's ownership and scope.

## Decisions

### Build the complete implementation before running tests

Update `/plan`, `/apply`, the helper brief and the owning change-loop page together. Plans group implementation and test authoring first and place required verification afterward. Helpers write tests beside the changed behavior but do not execute tests, wait on remote checks, or return for a per-task checkpoint while implementation remains. Implementation tasks are complete on source review; this does not claim that their tests passed. The final test status is recorded separately and remains required before publication.

Pre-existing plans with intermediate `/save` test gates are normalized into one final verification phase without an extra approval question, retaining every acceptance obligation and explaining the timing change in the Decision log. This is not permission to skip a substantive live acceptance prerequisite. If further implementation truly needs unavailable evidence rather than an ordinary test result, report the blocker; do not silently manufacture a passing task or trigger an automatic intermediate gate. An explicitly requested early `/save` or `/verify` retains its authorized reach.

Avoid putting routine "CI must pass" tasks in the implementation checklist: those create an impossible ordering for `/ship`, which must archive only completed tasks before its one save. Test authoring and retained capture preparation are implementation tasks; final test execution is the existing save/ship phase. An explicit live acceptance task still uses `/save` after source implementation, with its checked status reflecting real evidence. Its later archive may necessarily be another checked revision; record that reason rather than pretending both commits are identical.

Alternative rejected: run targeted tests after each task. The user's explicit instruction is to test at the end of the complete implementation, not merely to make per-task tests smaller.

### Resolve saved state with a small deterministic helper

Extend the save skill's existing read-only evidence machinery or add `saved-revision.mjs` beside it; keep one owner for this decision. Inputs are the checkout, selected branch/change, and the caller's nonsecret exact checkpoint identity when available. Outputs identify the exact head and whether work needs saving, is already saved, or cannot be established. No token, environment value, commit, push, PR edit, deployment or test execution belongs in this helper.

Check staged/unstaged/nonignored untracked work, local HEAD, actual branch and the authoritative remote candidate/PR head. Dirty work or a local commit not yet pushed needs `/save`; a clean matching saved head does not. Failure to read identity is `UNKNOWN`, not permission to save speculatively or to reuse another revision. The save owns all mutations.

Within the same authorized chain, reuse `/save`'s head-bound gate result after a cheap identity check. Do not start another save, append another archive note, refresh an unchanged review page, or wait for the same settled gate again. Without a current checkpoint result, read the authoritative gate through the existing read-only GitHub waiter or verified hosted adapter; reading existing checks does not request a rerun. A newer run/attempt for the same head must be respected, not overridden by stale success.

Keep existing `SAVE_GATE_RESULT` output and add explicit nonsecret head identity for callers if needed. GitHub `NONE` remains valid only under its current no-checks doctrine. Hosted projects retain mandatory exact checks, private-context verification, candidate/generation/base identity and native preview receipt; never accept GitHub absence as a hosted pass. No persistent receipt cache is needed.

Alternative rejected: a skill-only "skip the next save" flag. It cannot prove that the source or candidate stayed unchanged.

### Separate unchanged gate evidence from fresh walkthrough evidence

`/verify` scouts before spending work, asks the saved-state helper whether saving is necessary, and invokes `/save` only for unsaved or unpushed work. Reuse the exact checkpoint inside `/ship`; a standalone repeated `/verify` on clean saved code still produces a fresh walkthrough, without a new checkpoint.

Continue discovering previews by the existing receipt/URL discovery mechanism. Keep the preflight's browser/request/state/CI-only selection: no reachable scenario spends nothing; CI-only evidence uses `--no-preview --no-browser` and takes no staging turn. A real deployed walk retains a fresh staging turn/seed, safe credentials, exact-source evidence, and owned cleanup. A gate pass is not itself proof that a scenario works.

Any source, remote candidate, scenario or relevant runtime change invalidates dependent evidence. An in-scope repair is saved and gated before its affected checks are repeated. Run only affected scenario checks where dependencies can be established; final required CI jobs still run normally on new pushed source. The existing three-attempt CI repair cap, two walkthrough repairs and failure handoff remain intact. Collect every observed failure before fixing and pushing once, to avoid one push per failing check.

Keep the existing one post-publication live look. It observes the published environment and does not rerun the whole pre-publication walkthrough.

## Risks / Trade-offs

- Later test execution can uncover several defects at once → retain test authoring alongside source, read all failures together and batch repairs within existing limits.
- A saved result can be stale → compare local/remote revision and newest authoritative run identity; keep UNKNOWN distinct from NONE and never reuse a result for another revision.
- Required jobs still use the full branch diff → each genuine fix push can still cost a full Payload run. This plan removes repeated unchanged checkpoints, not the required checks on a new revision.
- Existing task lists encode early gates → move test execution to the final phase while retaining acceptance criteria and source-progress honesty; explicitly report evidence-dependent blockers.
- Employee setup is being revised in another chat → change only reusable workflow here; preserve its Cloudflare/app access edits when bringing updated source in.
- Instructions are near their byte ceiling → offset added text by cuts in touched workflow guidance; do not raise the baseline.

## Validation

Author regressions during implementation; execute them only when the complete change is ready. Use disposable histories and fake `git`/`gh`/hosted responses to assert side-effect counts and identities: clean saved chain performs one checkpoint; dirty/unpushed work requests save; changed/foreign head refuses reuse; newest failed attempt defeats old success; hosted failure never becomes NONE; repairs use new evidence. Include no-probe and CI-only preflight cases so no staging work starts unnecessarily.

Retain one orchestration capture that exercises the selected path, records checkpoint/push/wait counts and actual source identities, and proves the former second-save path fails the same assertion while the new path passes. Be explicit that script fixtures prove deterministic decisions, not that an agent will always follow prose. Check the latter in the next real ship and record any gap.

At the end, run the payload link, OpenSpec config and instruction-budget checks together, then use the ordinary final `/save` gate and `/verify` evidence. Tests run in existing CI; planning only validates its artifacts and builds the review page. [Review page](review.html).

## Migration Plan

Ship the changed skills and helper in the normal payload with a `Next (minor)` entry. The Updating note says builds now finish before tests and existing per-part checks move to the end; no credential, data or hosting change is needed. Include any new shipped helper in the explicit payload inventory. Reverting the skills/helper restores prior timing without a data migration.

<!-- end design.md -->
<!-- file tasks.md utf8 5428 -->
# Tasks

Implementation completion means the source, tests and docs are prepared and reviewed, not that tests have passed. Author tests within the group that changes their behavior; execute tests and verification only after all implementation groups are complete. The existing final `/save` and `/ship` checks remain required. This implementation checklist adds no intermediate test gate or approval stop.

## 1. Planning and build instructions

- [x] 1.1 Update `.agents/skills/plan/SKILL.md` and any directly affected planning reference so test authoring accompanies source tasks but automatic test execution and remote verification belong at the end of the complete implementation. Completion: a representative multi-part task list has one final verification phase and retains all acceptance obligations.
- [x] 1.2 Update `.agents/skills/apply/SKILL.md` and `references/build-helper.md` to finish implementation/test authoring before testing, replace per-task pass requirements and mid-list gate returns with source-progress reporting plus a final verification handoff, and normalize existing intermediate test gates without a new approval. Completion: instructions distinguish authored/source-reviewed work from passing tests, preserve real blockers and explicitly requested early checks, and retain helper/git boundaries.
- [x] 1.3 Author a retained orchestration regression/capture in the existing script-test and verification-recipe conventions for a multi-part build followed by one checkpoint and walkthrough. Completion: fixture asserts that no automatic test/checkpoint starts between implementation parts, and records source identities and checkpoint/push/wait counts for failing-before and passing-after comparison; execution waits for the final phase.

## 2. Saved-revision helper and handoff

- [x] 2.1 Extend existing read-only save evidence machinery or add `saved-revision.mjs` under `.agents/skills/save/scripts/` to resolve clean saved state, unsaved/unpushed work, and unknown identity using local work plus authoritative GitHub/verified hosted identity. Author its focused regressions alongside it. Completion: reviewed cases cover staged/unstaged/untracked work, unpushed head, foreign branch/repo/head, failed lookup, superseding run attempts, hosted mandatory checks and zero mutation calls.
- [x] 2.2 Update save's internal report and shared gate reference to expose exact nonsecret checkpoint head identity while preserving `SAVE_GATE_RESULT` and current failure limits. Completion: the saved result can be compared to local/remote head without printing credentials, and read-only status lookup does not commit or request CI reruns.
- [x] 2.3 Update `.agents/skills/ship/SKILL.md`, `.agents/skills/verify/SKILL.md` and only the relevant preparation/handoff clauses in walkthrough references to reuse the final checkpoint, save only unsaved/unpushed work, and perform fresh walkthroughs without record-only commits. Completion: reviewed chain has one unchanged checkpoint, repair source gets a fresh gate, and unavailable identity is never a pass or hosted NONE.
- [x] 2.4 Extend existing script regressions and the retained capture to cover repeated standalone verification, clean ship handoff, stale/new-attempt rejection, no reachable scenarios, CI-only preflight without staging, and affected rechecks after a repair. Completion: all assertions and retained-observation routes are authored before any test run, with no new browser runtime or paid practice run needed.

## 3. Owning docs and release

- [x] 3.1 Update `wiki/development/the-change-loop.md` and `wiki/development/staging-walkthrough.md` with complete-build-first timing, honest source/test progress, one reused checkpoint, explicit early requests and unchanged final/live checks. Completion: docs no longer prescribe automatic per-task saves or an unconditional verification save, and linked headings remain compatible.
- [x] 3.2 Include any new helper in `.agents/skills/wong-sync/references/payload-files.json` and applicable memory-area/script inventory; add `## Next (minor) — Build first, check once at the end` to CHANGELOG.md with a plain Updating note. Completion: exact payload paths are declared, no new credential setting is needed, and VERSION is unchanged.
- [x] 3.3 Review the complete implementation against the spec scenarios, refresh the review page, and prepare final validation evidence without adding more implementation checkpoints. Completion: tests/captures/docs are present and the checklist does not claim tests passed merely because their source is written.

## Final verification after implementation

Run the payload-link, OpenSpec-config and context-budget checks once after the full implementation exists. Use ordinary `/save` to complete the required remote script/payload/app gate and retain actual results; run `/verify` against that exact saved head through the existing capture/preview routes. During `/ship`, archive the completed source checklist and use its ordinary final `/save` once, passing that checkpoint to `/verify`. Record honest gaps where only script fixtures, not a real agent chain, were observed. Repair actual failures under existing caps and rerun affected checks where supported; every new revision must still satisfy all required CI checks. This final phase is required delivery behavior, not an intermediate source task that forces a save before the remaining code is built.

<!-- end tasks.md -->
<!-- file specs/apply/spec.md utf8 2715 -->
## MODIFIED Requirements

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL work the change's implementation and test-authoring tasks, and it SHALL NOT ask the person, run git, save, execute tests, or upload a preview. It SHALL return on a question, a blocker, or completion of the whole implementation; final verification SHALL follow implementation. The parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same verification timing.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome and defers tests until implementation is complete

## REMOVED Requirements

### Requirement: A task that needs the gate is done through save

**Reason:** Automatic mid-list test gates repeat whole-branch checks before the complete implementation exists.

**Migration:** Preserve every required check and acceptance claim, collect test execution into the final verification phase, and retain an explicitly requested early checkpoint's authorized reach.

## ADDED Requirements

### Requirement: Complete implementation precedes automatic verification

Plans and builds SHALL prepare the whole agreed implementation and its tests before automatically executing tests, remote check waits or walkthroughs. They SHALL NOT introduce per-task verification checkpoints or approval stops. Source completion SHALL NOT be reported as a passing test result. Existing intermediate test gates SHALL be deferred to the final verification phase without dropping their acceptance obligations. Explicitly requested early saves or checks SHALL retain their reach; a substantive unavailable prerequisite SHALL be reported as a blocker rather than treated as passed.

#### Scenario: A plan has several test gates between source tasks

- **WHEN** a build's task list names checks after separate implementation parts and the person has not requested early checks
- **THEN** the complete implementation and test authoring finish before those checks run together in the final verification phase, with no new approval stops

#### Scenario: Final verification fails

- **WHEN** final verification reveals a real defect in the completed implementation
- **THEN** the defect is repaired and affected checks are repeated under the existing repair limits, with all final required checks preserved

<!-- end specs/apply/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 1203 -->
## MODIFIED Requirements

### Requirement: Ship checkpoints once through save

After archiving, `/ship` SHALL invoke ordinary `/save` exactly once, so the commit CI tests is the commit `/ship` merges; `/save` SHALL use the archive as the change record and SHALL NOT author a new active change. The walkthrough SHALL reuse that exact checkpoint without another save or rerun of unchanged settled checks. Uncommitted work on the default branch SHALL move to a new branch through that same save, not an earlier one, and SHALL NOT be reported as nothing to ship. A repair that changes source SHALL receive fresh exact-revision checks before publication; this SHALL NOT authorize bypassing or reinterpreting a failed or unreadable gate.

#### Scenario: A one-go ship

- **WHEN** `/ship <intent>` runs from plan to merge without a repair
- **THEN** only the save after the archive runs, CI runs once before the walk, and the walk uses that saved revision without a second checkpoint

#### Scenario: Publish from the default branch

- **WHEN** `/ship` runs on the default branch with a finished, uncommitted change
- **THEN** it archives in place, saves once to a new branch, and CI runs once before the merge

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 2469 -->
## MODIFIED Requirements

### Requirement: The walk targets this commit's deployed preview

When there is something to verify, `/verify` SHALL bind evidence to the exact saved head revision, invoking `/save` only when current work is unsaved or unpushed. Deployed probes SHALL target the preview URL published for that revision through the applicable verified delivery route, never a guessed URL or naming pattern. CI behavior probes SHALL use captured evidence whose actual source revision and run identity match the revision being checked. Missing evidence for one surface SHALL block only dependent checks.

#### Scenario: Uncommitted work

- **WHEN** `/verify` runs with uncommitted work and a reachable scenario
- **THEN** `/save` runs first, and verification targets its saved revision and the discovered evidence for that revision

#### Scenario: CI does not deploy

- **WHEN** no preview URL exists for this commit and a scenario needs the deployed app
- **THEN** that scenario is unverified, no URL is guessed, and independent CI behavior checks can still complete

## ADDED Requirements

### Requirement: A saved revision is reused without another checkpoint

Verification of clean, already saved work SHALL use the existing exact-revision checkpoint, without another commit, push, record-only save or request to rerun settled checks. Reuse SHALL require matching local and authoritative remote revision and the applicable gate identity; a missing, foreign or unreadable identity SHALL remain unverified. A superseding run attempt SHALL NOT be concealed by an earlier pass. A fresh invocation SHALL still produce fresh walkthrough evidence; a cached verdict SHALL NOT replace it. A source repair SHALL invalidate dependent evidence and use the newly saved revision's checks, with unchanged independent checks retained only when their conditions remain valid.

#### Scenario: Ship has just saved the change

- **WHEN** `/ship` passes a current exact checkpoint and the selected work stays clean at the same authoritative remote head
- **THEN** `/verify` walks that revision without invoking `/save` again or restarting its settled checks

#### Scenario: An earlier passing result belongs to different work

- **WHEN** the local head, authoritative candidate, applicable run attempt or evidence revision does not match the passing result
- **THEN** the old result is not reused as proof of the current work and missing authoritative evidence remains unverified

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 35646 fence=~~~ -->
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
<title>Review · 2026-10-04-reuse-checked-revisions</title>
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
<body data-change="2026-10-04-reuse-checked-revisions">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-reuse-checked-revisions</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Long builds keep stopping to check the whole unfinished change. In the employee-setup work, the tests took 21 seconds and the toolkit checks took 3 minutes 15 seconds per successful run; repeating those checks after separate parts multiplied the wait, and repairs added more runs.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Finish building before checking.</b> Write the implementation and its tests together, then run tests and verification after the complete implementation. Separate tasks no longer trigger separate full checks.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">TODAY</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">build part → check → build part → check</span>

<span class="ln" data-note="item-1-line-4" tabindex="0">AFTER</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">build all parts and their tests</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">              │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">              ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">      final checks and preview</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">              │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">              ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">           publish</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Reuse the revision already checked.</b> Moving from saving to the preview walkthrough will use the same saved work, instead of saving again and starting another round of checks.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Check repairs when needed.</b> A real failure still gets fixed and checked again. Repeat only checks affected by the repair where the existing checks allow it; the final required checks and preview still complete.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Keep the current choices.</b> Asking to publish, explicitly asking to save early, and checking the live app after publishing keep their existing behavior. This adds no approval stops.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Reduce coverage, relax required checks, change employee access or hosting, remove staging isolation, or reuse an old walkthrough verdict as proof of current behavior.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked when this happened and to plan a fix → chose a workflow plan, with no implementation yet.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked to inspect the long-running chats → chose to include their actual checkpoint history; employee setup's source-checks record confirms separate activation, authorization, discovery and connection gates, followed by several fixture, quality and instruction-budget repairs.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked through the employee-setup handoff to stop running tests at every step → chose complete implementation first, final tests and verification afterward, and affected rechecks only after a real failure, preserving final required checks and preview without new approval stops.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: keep early saves or checks only when the person explicitly requests them, because automatic per-task checkpoints are the behavior being removed.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: preserve the existing preview walkthrough and live look, because the request changes when checks run and removes repetition rather than weakening the final checks.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: employee-setup scope changes remain owned by its chat, because this plan owns the reusable workflow and does not change app or repository access.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/payload.yml</code> adds a retained revision-handoff capture and artifact; required jobs, scope conditions and coverage thresholds remain intact. The capture interprets exact earlier instructions and exercises the current read-only helper with mock side-effect counts; actual agent obedience remains a separate observation during delivery.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: implementation, test sources and docs are complete. Final payload links, OpenSpec configuration, context limits and strict change validation pass; tests have not yet run. Condensed touched instructions to meet unchanged size limits. Included the published drawings release and numbered this change 30.10.0. Session facts were skipped because this checkout has no registered session; decisions remain here. The final remote gate and fresh walkthrough follow this checkpoint.</li>
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
<!-- file source-checks.md utf8 1750 -->
# Prepared implementation evidence

All source, test authoring, retained capture routes, workflow handoffs and release docs are prepared and source-reviewed. No tests, remote checks, preview uploads, saves or git mutations were run by the build helper. Checked implementation boxes mean authored/source-reviewed work; final verification remains required through the parent.

The read-only `saved-revision.mjs` uses clean local state, exact remote branch/head, repository and PR identity, plus current workflow attempts and check identities. Unsaved/unpushed work requests save; foreign or unavailable evidence remains UNKNOWN. Hosted status goes through the existing private-authority adapter and preserves candidate/base/generation and mandatory checks.

Authored regressions cover dirty states, missing/unpushed remote, ignored files, foreign receipts/PR heads, a rollup head race, newest same-head attempts, mandatory hosted gate states, repair invalidation, scouting without network and existing CI-only preparation without staging. The Payload workflow retains a compatible `revision-chain` capture with exact current and earlier instruction SHA/digests and deterministic mock checkpoint/push/wait counts. Its earlier instruction source is `da9e789563b0fcaa5a2c174e0fb86bb5bf2de35c`; the modeled earlier path must fail the same one-checkpoint assertion that the helper-based path passes.

The capture proves deterministic helper decisions and a modeled driver, not future agent compliance or live app behavior. The actual authorized ship should observe the helper on its real receipt and record whether another unchanged save occurred. Final release checks, required CI gate and fresh walkthrough evidence are still outstanding at this handoff.

<!-- end source-checks.md -->
