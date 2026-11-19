<!-- openspec-archive v1 2026-09-27-catch-loosened-checks -->
<!-- file proposal.md utf8 6944 -->
# Catch checks the AI loosens

**Status:** ready-to-ship
**Branch:** explore/guardrails-nontechnical-coding
**Open questions:** none

## Why

The automatic checks only protect you if they stay switched on. Today the AI can quietly turn one off, skip a test, or lower a limit, and everything still passes. You would have to read the code to notice, and a non-technical person can't. So a loosened check should never pass silently: it needs a written reason, and you should see every one before you publish.

## What Changes

- **Loosening a check stops the save until a reason is written down.** Every save compares the work with the live version. If a check got weaker and no reason is recorded, the checks fail.
  ```text
  save ──▶ compare with live
              │
        check loosened?
         │          │
         no         yes
         │          │
         ▼       reason written?
       pass       │        │
                  yes      no
                  │        │
                  ▼        ▼
                pass     fail ──▶ agent
                                  fixes
  ```
- **What counts as loosening.** Turning a check off on one line of code. Skipping or deleting a test. Any change to a check's settings: its limits, what it leaves out, the test command, or the checks themselves. A setting that gets stricter needs a one-line reason too, because a script can't reliably tell stricter from looser.
- **The agent fixes it without asking you.** It either switches the check back on, or writes a plain reason into the plan's list of decisions. It only tells you what it could not fix.
- **You see each one before you publish.** The *publish it?* question and the final "it is live" report list every loosened check in one plain line. The plan's review page tags them `check`, beside `asked` and `assumed`.
  ```text
  Built the tip calculator.
  Preview: https://…/apps/tips/

  Checks loosened (1):
  • Skipped one test for the
    rounding code, because the
    test needs a live bank feed.

  Publish it?
  ```
- **It works in every WongStack repo, across all its code.** Mini apps included: a skipped or deleted test counts wherever it is.

Non-goals: stronger checks for mini apps, an automatic second review, and scanning for pasted keys or unsafe packages. Those stay open for later.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ci-tests`: the Test check fails on a loosened check that has no recorded reason.
- `apply-completion-handoff`: the publish question lists the change's loosened checks.
- `ux-wireframes`: the review page labels a `Check:` decision `check`.

## Impact

- New core payload script `.github/scripts/loosened-checks.mjs`; `.github/scripts/app-untouched.sh` prints a fourth output, `base`; `.github/workflows/test.yml` runs the new script on every run, after the suite.
- `.claude/skills/apply/SKILL.md` (finish with a preview) and `.claude/skills/ship/SKILL.md` (report) list `Check:` bullets; `.claude/rules/code.md` and `wiki/development/the-change-loop.md#the-gate` state the rule once.
- `.claude/skills/plan/scripts/build-review.mjs` and `references/review-kit.html` gain the `check` label.
- `payload-files.json`, meta test `scripts/tests/loosened-checks.test.mjs`, `scripts/tests/app-untouched.test.mjs`, `VERSION` 25.6.0, `CHANGELOG.md`.
- Installed repos: a branch that changes a check's settings, including a `/wong-sync` that updates `test.yml`, now needs a `Check:` bullet. CI's failure message says exactly what to add.

## Decision log

- **2026-09-27** — Asked which guardrail gaps to plan now → chose catching loosened checks only; stronger mini-app checks, a second review, and secret and package scanning stay open.
- **2026-09-27** — Asked what a non-technical person sees when a check catches a problem → chose the agent fixes it itself and reports only what it could not fix.
- **2026-09-27** — Assumed: any change to a check's settings counts, not only a lowered number, because the loose direction differs per setting (a higher copy-paste limit is looser, a lower coverage limit is looser) and a list of known keys misses new ones. A reason for a stricter setting costs one line.
- **2026-09-27** — Assumed: the reason lives in the change's Decision log as a `Check:` bullet that names the file, not in a code comment beside it, because JSON settings files can't hold comments and the Decision log already reaches the review page and the archive. This replaces the "reason beside it" idea from exploring.
- **2026-09-27** — Assumed: a reason counts when a `proposal.md` this branch adds or changes, active or archived, names the file in a `Check:` bullet, because `/ship` archives the change before its last CI run.
- **2026-09-27** — Assumed: the step runs inside the existing Test check, before the suite and on docs-only branches too, so no new required check is needed.
- **2026-09-27** — Assumed: `app-untouched.sh` supplies the comparison point as a fourth output, `base`, so one script decides what the branch changed.
- **2026-09-27** — Assumed: when there is nothing to compare with, the step says so and passes, because that happens only on a push to `main` whose pull request already passed.
- **2026-09-27** — Assumed: the check covers the whole repo, mini apps included, and skips its own script so its list of markers doesn't flag itself.
- **2026-09-27** — Assumed: release 25.5.0, a minor bump: new behavior, no setup step, and the failure message tells an installed repo how to pass.
- **2026-09-27** — Assumed: release 25.6.0 instead of 25.5.0, because `main` shipped 25.5.0 (memory access from GitHub) while this was planned.
- **2026-09-27** — Assumed: the step runs after the suite rather than before it, even when the suite fails, because one push then reports every problem and the auto-fix needs one round, not two.
- **2026-09-27** — Assumed: the check reads its own script for settings changes but not for skip markers, because it names every marker, and an edit that weakens it must still need a reason.
- **2026-09-27** — Check: `.github/workflows/test.yml` adds the loosened-checks step and a summary line; nothing is skipped or lowered.
- **2026-09-27** — Check: `.github/scripts/app-untouched.sh` prints a fourth line, `base`, for the new step; its three answers are unchanged.
- **2026-09-27** — Check: `.github/scripts/loosened-checks.mjs` is the new check itself.
- **2026-09-27** — Distill: no repeatable fact in memory for this change; the rule it teaches lives in `wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason`.
- **2026-09-27** — Archive checkpoint: built and archived as 25.6.0. The check, its CI step, the `base` output, the publish-list and review tag, the gate section, and the code rule landed; 318 script tests pass locally, and the check reports this branch's three `Check:` files as explained.

<!-- end proposal.md -->
<!-- file design.md utf8 5219 -->
# Design

## Context

The main app's `npm test` chain (`app/package.json`) holds every limit: oxlint, Vitest at 100% coverage, knip, jscpd at 0, and Stryker with `thresholds.break: 100`. Each has an escape hatch in code or config, and nothing reads the diff for them. `app/worker/access.ts` already carries two justified `Stryker disable` comments, which shows the hatches get used. `.github/scripts/app-untouched.sh` already computes the base a branch is compared with, for `test.yml`, `deploy.yml`, and `/apply` (`--worktree`).

## Goals / Non-Goals

**Goals:**
- A deterministic step, no model, that fails CI on an unexplained loosening in any WongStack repo.
- One place for the reason, visible on the review page and kept in the archive.
- `/apply` and `/ship` show the loosenings in plain words.

**Non-Goals:**
- Judging whether a reason is good. A person reads it.
- Telling stricter from looser settings.
- Mini-app test settings, a second reviewer, secret or dependency scanning.

## Decisions

**A plain Node script in `.github/scripts/`.** `loosened-checks.mjs`, no dependencies, runs on the runner's preinstalled Node (no `setup-node` needed, so it runs on docs-only branches too). The step runs after the suite with `if: !cancelled()`, so a red suite and a loosened check show in the same run. Node over bash because it reads `package.json` scripts and walks proposal Markdown. It ships as core payload next to `app-untouched.sh`.

**Interface.**
- CI: `node .github/scripts/loosened-checks.mjs --base "$BASE"` diffs `$BASE..HEAD`.
- `/apply`: `node … --worktree` runs `app-untouched.sh --worktree` itself for the base, then diffs the working tree and reads untracked files as wholly added. It never touches the index.
- Output: a Markdown list on stdout (the step appends it to `$GITHUB_STEP_SUMMARY`), one line per flagged file, with `explained` or `needs a reason`. Exit 1 when any is unexplained, exit 0 otherwise, exit 2 on usage error. An empty `--base` prints "could not compare; nothing checked" and exits 0.

**`app-untouched.sh` prints `base=<sha>` as a fourth line**, empty when it fell back to `unknown`. Its test asserts the four keys. `test.yml` passes `steps.scope.outputs.base`.

**What is flagged** (per file; one hit is enough):
1. *Skip markers* on added lines of any changed file outside `wiki/`, `openspec/`, and `*.md`, case-sensitive: `Stryker disable`, `v8 ignore`, `c8 ignore`, `istanbul ignore`, `oxlint-disable`, `eslint-disable`, `biome-ignore`, `jscpd:ignore`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `(it|test|describe).(skip|only|todo)`, and `xit(`, `xdescribe(`, `fit(`, `fdescribe(`.
2. *Deleted tests:* a deleted path matching `*.test.*`, `*.spec.*`, or `test_*`, found with rename detection (`-M`), where a rename to another test-file name is not flagged.
3. *Check settings:* any added, changed, or deleted file whose basename matches `vitest.config.*`, `jest.config.*`, `stryker.conf*`, `stryker.config.*`, `.oxlintrc*`, `.eslintrc*`, `eslint.config.*`, `biome.json*`, `.jscpd.json`, `knip.json*`, `knip.config.*`, `tsconfig*.json`, plus `.github/workflows/test.yml` and `.github/scripts/*`. A `package.json` is flagged only when its `scripts.test`, or a script that `scripts.test` runs through `npm run <name>`, differs from the base.

The script skips its own path for markers only; a change to it is still a settings change. Its meta test builds marker strings at run time (`'Stryker' + ' disable'`) so the test file flags nothing either.

**Where the reason lives.** Proposals the branch adds or changes: `openspec/changes/*/proposal.md` and `openspec/changes/archive/*/proposal.md` in the diff. In each `## Decision log`, a bullet whose text after `**date** —` starts with `Check:` explains every backticked path it names. Matching is on exact repo-relative path. Reading only changed proposals stops an old archive from excusing a new loosening.

**The rule is stated once.** [The gate](../../../wiki/development/the-change-loop.md#the-gate) gets a short paragraph that owns it. `.claude/rules/code.md` gets one line that links it, so an agent editing code knows before CI tells it. `/apply`'s finish step and `/ship`'s report link the gate and add only their own step.

**Review page.** `build-review.mjs` labels `^Check:` as `check`. `review-kit.html` gives `.tag.check` a distinct border (dotted) so it reads apart from `asked` and `assumed` in both color schemes.

## Risks / Trade-offs

- [Any settings edit needs a reason, stricter ones included] → one line per file, and CI's message says what to write. Accepted over a per-key direction table that misses new keys.
- [A `/wong-sync` that updates `test.yml` or a scaffold config fails until it records a reason] → the `/save` auto-fix path adds the `Check:` bullet; the CHANGELOG's Updating note says so.
- [An agent writes a hollow reason] → the reason is shown to the person before publishing; judging it is out of scope.
- [A marker in a string literal, e.g. a lint config test] → flagged; the agent records a reason. Rare, and a false alarm costs one line.
- [No base on a push to `main` with an all-zero before SHA] → passes with a note; its pull request already ran the step.

<!-- end design.md -->
<!-- file tasks.md utf8 2788 -->
## 1. The check

- [x] 1.1 `.github/scripts/app-untouched.sh`: print a fourth output line, `base=<sha>`, empty when it falls back to unknown; update its header comment
- [x] 1.2 Add `.github/scripts/loosened-checks.mjs` with `--base <sha>` and `--worktree`, the three flag kinds, `Check:` bullet matching in changed proposals, the Markdown summary, and exit codes 0/1/2, as the design says
- [x] 1.3 `.github/workflows/test.yml`: run the script after the suite on every run that is not cancelled, appending its output to the job summary; add one line for it to the Summary step and a short header comment on why
- [x] 1.4 Add `loosened-checks.mjs` to the core list in `.agents/skills/wong-sync/references/payload-files.json`

## 2. Tests

- [x] 2.1 `scripts/tests/app-untouched.test.mjs`: expect four output keys, and `base` equal to the merge base, or empty when unknown
- [x] 2.2 Add `scripts/tests/loosened-checks.test.mjs` on throwaway git repos, one per spec scenario: an unexplained skip comment fails and names the file; a `Check:` bullet passes; a lowered coverage limit fails; a deleted test fails; a test renamed to another test passes; a mini-app `test.skip(` fails; a reason in an archived proposal passes; an unchanged old proposal does not excuse a file; a `package.json` edit outside the test scripts passes; an empty base passes with a note; `--worktree` sees an untracked file. Build marker strings at run time.

## 3. The reports and the review page

- [x] 3.1 `.claude/skills/apply/SKILL.md` "Finish with a preview": before the report, run `loosened-checks.mjs --worktree`, fix each unexplained file without asking, and list each `Check:` bullet in one plain line above *publish it?*
- [x] 3.2 `.claude/skills/ship/SKILL.md` Step 6: add a **Checks loosened** line that lists the change's `Check:` bullets in plain words
- [x] 3.3 `.claude/skills/plan/scripts/build-review.mjs`: label `^Check:` as `check`; `references/review-kit.html`: style `.tag.check`; extend `scripts/tests/review.test.mjs` for the label

## 4. The rule, stated once

- [x] 4.1 `wiki/development/the-change-loop.md#the-gate`: a short paragraph that owns the rule, what counts, and the `Check:` bullet format
- [x] 4.2 `.claude/rules/code.md`: one line linking the gate paragraph — never loosen a check without a `Check:` bullet

## 5. Release

- [x] 5.1 Add `Check:` bullets to this change's Decision log for every file the step flags on this branch (`test.yml`, `app-untouched.sh`, `loosened-checks.mjs`)
- [x] 5.2 Bump `VERSION` to 25.6.0 and add the `CHANGELOG.md` entry, with an Updating note that a sync touching check settings needs a `Check:` bullet
- [x] 5.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 1072 -->
## ADDED Requirements

### Requirement: The publish question lists loosened checks

Before `/apply` reports a finished change, it SHALL run the loosened-checks step against the working tree. It SHALL fix each unexplained file itself, with no question: switch the check back on, or add a `Check:` bullet with a plain reason to the change's Decision log. Its report SHALL then list each `Check:` bullet of the change in one plain line at the reader's level, above the *publish it?* question, and SHALL name any file it could not fix. `/ship`'s final report SHALL carry the same list. A change with no `Check:` bullet SHALL show no list.

#### Scenario: A loosening is fixed and shown

- **WHEN** `/apply` finishes a change that skipped one test with no recorded reason
- **THEN** it records a `Check:` bullet or restores the test, without asking
- **AND** its report lists the loosened check in one plain line before *publish it?*

#### Scenario: Nothing loosened

- **WHEN** `/apply` finishes a change with no flagged file
- **THEN** its report has no loosened-checks list

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 3246 -->
## ADDED Requirements

### Requirement: The Test check fails on a loosened check with no recorded reason

The core test workflow SHALL run a loosened-checks step on every run that is not cancelled: also when the main app is untouched, and after a failing suite, so one push reports every problem. The step SHALL compare the branch with the same base the untouched check uses, and SHALL flag each of these:

- an added line that turns a check off: a mutation, coverage, lint, type-check, or duplicate-code skip comment, or a skipped, focused, or to-do test;
- a deleted test file that was not moved to another test file;
- any change to a check's settings: a test runner, coverage, mutation, lint, type-check, duplicate-code, or unused-code config file, a `package.json` `test` script or a script it runs, the test workflow, or a script under `.github/scripts/`.

A flagged file SHALL count as explained when a `proposal.md` that the branch adds or changes, under `openspec/changes/` or its archive, names that file's path in a Decision-log bullet whose text after the date starts with `Check:`. The step SHALL list every flagged file in the job summary, marked explained or not, and SHALL fail when any is unexplained. Its failure message SHALL name each unexplained file and say how to pass: switch the check back on, or add a `Check:` bullet naming the file with a plain reason. When the untouched check found no base, the step SHALL say so and pass. The step SHALL skip its own script.

#### Scenario: A skip comment with no reason

- **WHEN** a branch adds a line holding a mutation-testing skip comment to `app/worker/access.ts`, and no changed proposal names that file in a `Check:` bullet
- **THEN** the `test` check fails
- **AND** the failure names `app/worker/access.ts` and says how to pass

#### Scenario: A recorded reason passes

- **WHEN** the same branch's change adds `**2026-09-27** — Check: \`app/worker/access.ts\` skips one mutant, because it changes nothing a caller can see.` to its Decision log
- **THEN** the step passes and lists the file as explained

#### Scenario: A lowered limit

- **WHEN** a branch changes a coverage threshold in `app/vitest.config.ts` from 100 to 90 with no `Check:` bullet
- **THEN** the `test` check fails and names `app/vitest.config.ts`

#### Scenario: A deleted test

- **WHEN** a branch deletes `app/src/App.test.tsx` and adds no test file in its place
- **THEN** the step flags `app/src/App.test.tsx`

#### Scenario: A moved test is not flagged

- **WHEN** a branch renames a test file to another test file name
- **THEN** the step does not flag it

#### Scenario: A skipped test in a mini app

- **WHEN** a docs-and-mini-app branch adds `test.skip(` to `mini-apps/apps/tips/api.test.mjs` with no `Check:` bullet
- **THEN** the `test` check fails, although the main app's suite does not run

#### Scenario: The reason survives the archive

- **WHEN** `/ship` archives the change before the last CI run, so the `Check:` bullet sits in `openspec/changes/archive/<date>-<name>/proposal.md`
- **THEN** the step still finds the reason and passes

#### Scenario: Nothing to compare with

- **WHEN** the untouched check reports no base
- **THEN** the step says it could not compare and passes

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 1530 -->
## MODIFIED Requirements

### Requirement: The page is one scrolling review

`review.html` SHALL be one vertically scrolling document. In order, it SHALL show the change name and the saved-note count, the proposal's Why, the What Changes items numbered with each item's full text and its visual when it has one, and the Decisions. Decisions SHALL list each bullet of the proposal's `## Decision log`, labeled `asked` when its text after the date starts with "Asked", `assumed` when it starts with "Assumed", `check` when it starts with "Check:", and `log` otherwise. A short jump list at the top SHALL link the three sections. The page SHALL have no side panel, no stage, no Previous or Next control, and no change-list sheet.

#### Scenario: Open the page on a phone

- **WHEN** a reviewer opens `review.html` at a width of 320px
- **THEN** Why, the numbered What Changes items, and the Decisions follow in one vertical order
- **AND** nothing makes the page scroll sideways

#### Scenario: Decisions are labeled

- **WHEN** the Decision log holds an "Asked … → chose …" bullet and an "Assumed …" bullet
- **THEN** the Decisions section shows them labeled `asked` and `assumed`

#### Scenario: A loosened check is labeled

- **WHEN** the Decision log holds a "Check: `app/vitest.config.ts` …" bullet
- **THEN** the Decisions section shows it labeled `check`

#### Scenario: No Decision log yet

- **WHEN** the proposal has no `## Decision log` section
- **THEN** the Decisions section says that no decision is recorded

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39261 fence=~~~ -->
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
<title>Review · 2026-09-27-catch-loosened-checks</title>
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
<body data-change="2026-09-27-catch-loosened-checks">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-catch-loosened-checks</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The automatic checks only protect you if they stay switched on. Today the AI can quietly turn one off, skip a test, or lower a limit, and everything still passes. You would have to read the code to notice, and a non-technical person can't. So a loosened check should never pass silently: it needs a written reason, and you should see every one before you publish.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Loosening a check stops the save until a reason is written down.</b> Every save compares the work with the live version. If a check got weaker and no reason is recorded, the checks fail.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">save ──▶ compare with live</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">            │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      check loosened?</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">       │          │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">       no         yes</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">       │          │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">       ▼       reason written?</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">     pass       │        │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">                yes      no</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">                │        │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">                ▼        ▼</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">              pass     fail ──▶ agent</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">                                fixes</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>What counts as loosening.</b> Turning a check off on one line of code. Skipping or deleting a test. Any change to a check's settings: its limits, what it leaves out, the test command, or the checks themselves. A setting that gets stricter needs a one-line reason too, because a script can't reliably tell stricter from looser.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The agent fixes it without asking you.</b> It either switches the check back on, or writes a plain reason into the plan's list of decisions. It only tells you what it could not fix.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>You see each one before you publish.</b> The <i>publish it?</i> question and the final &quot;it is live&quot; report list every loosened check in one plain line. The plan's review page tags them <code>check</code>, beside <code>asked</code> and <code>assumed</code>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">Built the tip calculator.</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">Preview: https://…/apps/tips/</span>

<span class="ln" data-note="item-4-line-4" tabindex="0">Checks loosened (1):</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">• Skipped one test for the</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">  rounding code, because the</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">  test needs a live bank feed.</span>

<span class="ln" data-note="item-4-line-9" tabindex="0">Publish it?</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>It works in every WongStack repo, across all its code.</b> Mini apps included: a skipped or deleted test counts wherever it is.</div></div></li>
</ol>
<p class="aside">Non-goals: stronger checks for mini apps, an automatic second review, and scanning for pasted keys or unsafe packages. Those stay open for later.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which guardrail gaps to plan now → chose catching loosened checks only; stronger mini-app checks, a second review, and secret and package scanning stay open.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what a non-technical person sees when a check catches a problem → chose the agent fixes it itself and reports only what it could not fix.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: any change to a check's settings counts, not only a lowered number, because the loose direction differs per setting (a higher copy-paste limit is looser, a lower coverage limit is looser) and a list of known keys misses new ones. A reason for a stricter setting costs one line.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the reason lives in the change's Decision log as a <code>Check:</code> bullet that names the file, not in a code comment beside it, because JSON settings files can't hold comments and the Decision log already reaches the review page and the archive. This replaces the &quot;reason beside it&quot; idea from exploring.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a reason counts when a <code>proposal.md</code> this branch adds or changes, active or archived, names the file in a <code>Check:</code> bullet, because <code>/ship</code> archives the change before its last CI run.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the step runs inside the existing Test check, before the suite and on docs-only branches too, so no new required check is needed.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>app-untouched.sh</code> supplies the comparison point as a fourth output, <code>base</code>, so one script decides what the branch changed.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: when there is nothing to compare with, the step says so and passes, because that happens only on a push to <code>main</code> whose pull request already passed.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the check covers the whole repo, mini apps included, and skips its own script so its list of markers doesn't flag itself.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: release 25.5.0, a minor bump: new behavior, no setup step, and the failure message tells an installed repo how to pass.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: release 25.6.0 instead of 25.5.0, because <code>main</code> shipped 25.5.0 (memory access from GitHub) while this was planned.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the step runs after the suite rather than before it, even when the suite fails, because one push then reports every problem and the auto-fix needs one round, not two.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the check reads its own script for settings changes but not for skip markers, because it names every marker, and an edit that weakens it must still need a reason.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/workflows/test.yml</code> adds the loosened-checks step and a summary line; nothing is skipped or lowered.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/scripts/app-untouched.sh</code> prints a fourth line, <code>base</code>, for the new step; its three answers are unchanged.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/scripts/loosened-checks.mjs</code> is the new check itself.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distill: no repeatable fact in memory for this change; the rule it teaches lives in <code>wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason</code>.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint: built and archived as 25.6.0. The check, its CI step, the <code>base</code> output, the publish-list and review tag, the gate section, and the code rule landed; 318 script tests pass locally, and the check reports this branch's three <code>Check:</code> files as explained.</li>
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
