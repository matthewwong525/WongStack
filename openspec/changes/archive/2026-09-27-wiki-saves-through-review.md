<!-- openspec-archive v1 2026-09-27-wiki-saves-through-review -->
<!-- file proposal.md utf8 9759 -->
# Wiki saves go through review, like code

**Status:** ready-to-ship
**Branch:** explore/wiki-saves-through-review
**Open questions:** none

## Why

Today a save that only changes the wiki goes live right away, with no review page and no check. Nobody looks at it before it lands. You want wiki edits to take the same route as code: a review page you can look at, and publishing only when you say so. The automatic checks should stay fast for these saves, running the app's tests only when code changed.

## What Changes

- **There is one way to save, and the wiki uses it.** The special "wiki goes straight to live" route is deleted, not bent. Every save that changes a file gets a branch and a review page on GitHub, then goes live when you publish. A wiki page is no different from any other file. Saves only differ in whether they need a plan: code does, and anything else gets a review page whose description says what changed.
  ```text
  Before             After
  ────────────────   ──────────────────
  code ─▶ save ─▶    any file edit
     review page        │
  wiki ─▶ save ─▶       ▼
     live             save ─▶ review
                        page + checks
                          │
                          ▼
                    publish ─▶ live
  ```
- **Publishing works whether or not there was a plan.** When you publish (`/ship`), it files away the plan if there is one, waits for the checks, and publishes. Work that needed no plan skips that first step. Code with no plan still stops, as it does today.
- **Checks run the code tests only when code changed.** The app's tests and deploy already skip when only Markdown changed. This repo's own extra checks (Payload checks) now skip their code tests when only the wiki or plans changed. The link, spec, and private-name checks still run, and skill text still gets every test.
  ```text
  changed files    what runs
  ─────────────    ────────────────────
  only wiki/,      links, specs, private
  openspec/        names — code tests skip
  anything else    everything
  ```
- **Saving facts still commits nothing.** A conversation that only produced facts still stores them in memory, with no branch and no review page.

Non-goals: no change to the app's Test and Deploy workflows, which already skip on docs; no auto-publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: *Wiki-only saves go straight to the default branch* is removed; every file edit takes a branch, a pull request, and the gate, needing an OpenSpec change only for code; `/ship` merges work that needed no change; the doctrine owner names no path-specific route.
- `knowledge-center`: *The agent writes what it learns when it learns it* — the wiki edit goes through a pull request.
- `context-economy`: save's conditional procedures name facts-only, not prose-only.
- `open-source-release`: the ruleset keeps no owner bypass for prose.
- `payload-checks`: the payload workflow skips lint, shell checks, and the script suite when every changed path is under `wiki/` or `openspec/`.

## Impact

- `.agents/skills/save/SKILL.md`: the `wiki/` routing test is deleted; the normal route states that a save with no change gets a plain PR body. `references/prose-save.md` becomes `references/facts-save.md`, facts only.
- `.agents/skills/ship/SKILL.md`: Step 2 skips archive and distillation when the branch needed no change; the walk skips when there is no preview.
- `wiki/development/the-change-loop.md`: *The prose allowlist* is deleted, with no replacement section; `wiki/README.md`, `wiki/wiki-style.md`, and the `WONG-STACK` block in `AGENTS.md` follow.
- `.github/scripts/app-untouched.sh` (+ test): new `docs_only` output. `.github/workflows/payload.yml` gates its heavy steps on it.
- `scripts/retired-names.json`: retires `#the-prose-allowlist` and `prose-save.md`.
- `VERSION` 25.13.0 → 26.0.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked how a wiki-only pull request gets merged → chose `/ship` merges it, the same as code.
- **2026-09-27** — Asked whether a wiki-only save needs an OpenSpec change → chose no plan record; the PR body describes the edit.
- **2026-09-27** — Asked whether Payload checks should skip script tests on Markdown-only changes → chose skip only when every path is under `wiki/` or `openspec/`, keeping the link and spec checks.
- **2026-09-27** — Assumed: this request supersedes the 2026-07-30 feedback that prose may go straight to `main` without review, because it is newer and from the same repo owner.
- **2026-09-27** — Assumed: the app's `test.yml` and `deploy.yml` need no change, because `app-untouched.sh` already skips the suite and the deploy when every path is under `wiki/`, `openspec/`, or ends in `.md`.
- **2026-09-27** — Assumed: the private-names test still runs on a wiki-only change, because it scans every tracked file, wiki pages included, for private names.
- **2026-09-27** — Assumed: the payload workflow reads a new `docs_only` output from `app-untouched.sh` rather than its own diff, because the base-finding and fail-safe logic must live in one place; a comparison that can not be made answers `false`.
- **2026-09-27** — Assumed: a facts-only save keeps making no commit, because facts live in the memory store, not the repo.
- **2026-09-27** — Assumed: a major release, 26.0.0, because installed repos lose a route their agents use, as 25.0.0 did when mini apps lost theirs.
- **2026-09-27** — Assumed: the two delivery-gate requirements are replaced under new names rather than modified, because a modified requirement must keep every old scenario, and seven of them describe the removed route.
- **2026-09-27** — Asked at the review link whether to build → chose build, with the note that wiki saves must not be an exception anywhere in the docs or code: it is simply how saving always works.
- **2026-09-27** — Assumed: the note replaces every wiki-specific route with the general rule "a change is required for code; other file edits get a PR with a plain body", because that rule already decides when `/save` authors a change, and it names no path.
- **2026-09-27** — Assumed: `/ship` merges a branch that needed no change without an archive, and still stops on code with no change, by the same rule `/save` uses, because a path test would be a wiki exception.
- **2026-09-27** — Assumed: `/ship` skips `/verify` when the deploy made no preview, because there is nothing to walk; this is the existing skipped-rung rule, not a wiki rule.
- **2026-09-27** — Assumed: `prose-save.md` becomes `facts-save.md`, because it now owns only the facts-only save and a "prose" route name would read as the old exception.
- **2026-09-27** — Assumed: the change loop loses *The prose allowlist* with no replacement section, because the normal route already covers wiki edits; other pages link to the gate instead.
- **2026-09-27** — Assumed: the Payload checks skip keys on `wiki/` and `openspec/` paths, because it decides which tests are relevant, not how work is saved; the user asked for it.
- **2026-09-27** — Check: `.github/scripts/app-untouched.sh` gains a `docs_only` output that lets a check skip, because the Payload checks need one shared, fail-safe answer for a `wiki/`- or `openspec/`-only change.
- **2026-09-27** — Check: `.github/workflows/payload.yml` skips lint, shellcheck, and the script suite when `docs_only` is true, because those only test code and skill text, which such a change does not touch; the private-names test and release checks still run.
- **2026-09-27** — Assumed: `open-source-release` and `context-economy` get small deltas too, because the search in task 3.5 found an owner bypass for prose and a "prose save" route named in those live specs.
- **2026-09-27** — Built: one save route for every file edit (the `wiki/` route and *The prose allowlist* deleted; `prose-save.md` is now `facts-save.md`, facts only); `/ship` merges work that needed no change by `/save`'s own test; `app-untouched.sh` gains `docs_only`, and Payload checks skip lint, shellcheck, and the script suite on it, keeping the private-names test and release checks. Spec deltas reconciled into six live specs. Local link, retired-name, config, and context checks and strict validation pass; CI (task 4.2) is next.
- **2026-09-27** — CI passed on PR #156 (task 4.2); every task is done.
- **2026-09-27** — Asked, after the save report left out the plan's link twice, what next → chose add the fix to this change, then publish, and make sure the link shows next time.
- **2026-09-27** — Assumed: the save and publish reports missed the link because their "one link" rule never named the plan-link rule, and the second miss came from the host hiding chat text written above a question card; so the reports now name the rule, and the question's own text carries the plan's path.
- **2026-09-27** — Merged main's 25.15.0–25.17.0 (thinner specs #157, shorter skills #151) at ship time. The spec deltas were rewritten against the merged capabilities (`people-wiki` → `knowledge-center`, `dependency-currency` → `dependencies`, which no longer mentions the allowlist) in the promise-not-procedure style, and the skill conflicts were resolved on main's shorter text with this change's rules kept. Release stays 26.0.0, above main's 25.17.0.
- **2026-09-27** — Distilled: no repeatable fact; the rules the facts state now live in the save and ship skills and the change loop.
- **2026-09-27** — Archived and checkpointed for merge by `/ship`.

<!-- end proposal.md -->
<!-- file design.md utf8 4537 -->
# Design

## Context

`/save` routes a save whose every path is under `wiki/` through `save/references/prose-save.md`, which commits and pushes straight to `main`. `wiki/development/the-change-loop.md#the-prose-allowlist` owns the rule; `AGENTS.md`, `wiki/README.md`, `wiki/wiki-style.md`, and three specs repeat or rely on it. `/save` already has the general rule this change needs: *with no change selected, author one only if the session established code or a code plan*. What it lacks is a PR body for a save with no change, which today lives only in `prose-save.md`'s protected-branch fallback.

CI already does most of the rest. `.github/scripts/app-untouched.sh` answers `untouched=true` when every path is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`, and `test.yml` and `deploy.yml` skip the suite and deploy on it. Only the meta-only `payload.yml` runs everything on every push. Its script tests read skill Markdown, and `private-names.test.mjs` scans every tracked file, wiki included.

`/ship` Step 2 stops whenever no change record exists, so it can not merge a PR that needed no change.

## Goals / Non-Goals

**Goals:**
- One save route for every file edit, with no path test anywhere in `/save` or `/ship`.
- A change is authored for code only; other edits get a plain PR body.
- `/ship` merges work that needed no change.
- Payload checks skip code tests when only `wiki/` or `openspec/` changed.

**Non-Goals:**
- Changing `test.yml` or `deploy.yml`.
- Auto-merging.

## Decisions

- **Delete the route; don't rewrite it.** `save/SKILL.md` loses the `wiki/` row in its routing table, the allowlist paragraph in §1, and the direct-save report line in §5. The description drops "Wiki-only saves go to the default branch". §2's normal route gains one sentence: with no change, the PR body describes the edit in plain words with a `/ship` footer, and the change-body renderer is not used. Alternative, keeping a "wiki route" that happens to open a PR: rejected by the user; it is still an exception to read and maintain.
- **`prose-save.md` becomes `facts-save.md`.** It keeps only the facts-only save: facts to the store, a to-do's `thread` fact, no commit. The routing row reads "The session only produced facts, including a to-do that changed no repo file". `new-plan.md`'s "uses the prose route" becomes "uses the facts-only save". `retired-names.json` retires `prose-save.md` (allowing `scripts/fixtures/context-baseline.json`, the measured before-state) and `#the-prose-allowlist`.
- **Ship uses save's test, not a path test.** Step 2: when no rung selects a change, apply `/save`'s authoring test to the branch diff. Code or a plan for code → today's stop. Otherwise skip archive and distillation, go to Step 3's single `/save`. Step 4's walk already treats a missing preview as a skipped rung; no new text.
- **The change loop just loses a section.** *The prose allowlist* is deleted. *The gate* gains no replacement paragraph beyond one sentence that every file edit takes it, and that a change is needed for code only, linking `/save`. The source repo's rule that a payload wiki page needs a release bump already lives in `.agents/rules/payload.md`; check it still reads right. Pages that linked `#the-prose-allowlist` link `#the-gate`.
- **`docs_only` comes from the shared scope check.** `app-untouched.sh` gains a fifth output, `docs_only=true|false`: true only when every changed path is under `wiki/` or `openspec/`, false in every fail-safe branch and on an empty diff. Base-finding stays in one place. This decides which tests are relevant, not how work is saved.
- **`payload.yml` gates by step.** Checkout with `fetch-depth: 0`, run the scope step, and put `if: steps.scope.outputs.docs_only != 'true'` on lint, shellcheck, and the c8 suite. A step runs `node --test scripts/tests/private-names.test.mjs` only when `docs_only` is true, because the full suite already includes it. Release checks always run. A summary line says which set ran. `npm ci` and the OpenSpec install stay in every run.

## Risks / Trade-offs

- Wiki facts written mid-task now wait in an open PR until someone ships it → the save report gives the review page, and `/ship` makes merging one step.
- `/ship`'s "code or a plan for code" is a judgment, not a path list → it is the same judgment `/save` already makes, and a wrong call stops rather than merges.
- An `openspec/`-only branch skips script tests → strict spec validation and the config check still run, which are the checks specs need.

<!-- end design.md -->
<!-- file tasks.md utf8 3133 -->
# Tasks

## 1. Save and ship skills

- [x] 1.1 In `.agents/skills/save/SKILL.md`, delete the `wiki/` routing row, the §1 allowlist paragraph, and the §5 direct-save report line; drop "Wiki-only saves go to the default branch" from the description; add to the normal route that a save with no change gets a plain PR body with a `/ship` footer
- [x] 1.2 Rename `references/prose-save.md` to `references/facts-save.md`, keep only the facts-only save, and update every link to it (`save/SKILL.md`, `new-plan.md`, any other)
- [x] 1.3 In `.agents/skills/ship/SKILL.md` Step 2, replace the no-change stop with `/save`'s authoring test: code or a plan for code stops; otherwise skip archive and distillation and continue to Step 3

## 2. CI

- [x] 2.1 Add the `docs_only` output to `.github/scripts/app-untouched.sh` (header, every `answer`, false when failing safe) and cover it in `scripts/tests/app-untouched.test.mjs`: wiki only, openspec only, wiki plus `.agents/` Markdown, wiki plus a root `.md`, no base, empty diff
- [x] 2.2 Check every caller that parses `app-untouched.sh` output still works with a fifth line
- [x] 2.3 Gate `.github/workflows/payload.yml`: `fetch-depth: 0`, the scope step, skip lint, shellcheck, and the c8 suite when `docs_only` is true, run `private-names.test.mjs` alone then, keep release checks, write a one-line summary, and update its header comment

## 3. Docs and records

- [x] 3.1 Delete *The prose allowlist* from `wiki/development/the-change-loop.md`; add one sentence to *The gate* that every file edit takes it and a change is needed for code only; repoint in-page references
- [x] 3.2 Delete the prose line from the `WONG-STACK` block in `AGENTS.md`; update the *Save* term in `wiki/README.md` and *Write it when you learn it* in `wiki/wiki-style.md` so neither describes a wiki route
- [x] 3.3 Confirm `.agents/rules/payload.md` still says a payload wiki page edit is a release, without reference to the allowlist
- [x] 3.4 Update the Purpose line of `openspec/specs/delivery-gate/spec.md` to drop "Wiki-only prose goes straight to the default branch"
- [x] 3.5 Add `#the-prose-allowlist` and `prose-save.md` to `scripts/retired-names.json`, and search for any other "prose allowlist", "prose route", or "wiki-only" wording outside history
- [x] 3.6 Bump `VERSION` to 26.0.0 and add a `CHANGELOG.md` entry telling installed repos that wiki edits now open a pull request like any save
- [x] 3.7 Record a memory fact that this supersedes the 2026-07-30 prose-straight-to-main feedback

## 4. Verify

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict --no-interactive`, and `node scripts/measure-context.mjs --check`
- [x] 4.2 `/save`, and confirm in CI that the payload and test checks pass on this branch

## 5. The plan's link after a save

- [x] 5.1 `/save`'s report prints the plan's link whenever the save changed a plan, apart from its one link; `/ship`'s report prints the archived plan's link; the closing question's own text ends with the plan's path, for hosts that hide chat text above a question card

<!-- end tasks.md -->
<!-- file specs/context-economy/spec.md utf8 508 -->
## MODIFIED Requirements

### Requirement: Save loads conditional procedures only when they apply

`/save` SHALL complete an ordinary checkpoint without loading its conditional procedures (named secrets, facts-only, new-plan fallback, archived handoff), and SHALL load each one that applies before acting on it.

#### Scenario: An ordinary checkpoint

- **WHEN** `/save` checkpoints an active change with no named secret
- **THEN** it loads no conditional procedure and keeps every credential and gate check

<!-- end specs/context-economy/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 2571 -->
## REMOVED Requirements

### Requirement: Wiki-only saves go straight to the default branch

**Reason**: A wiki edit now takes the same route as every other file edit; no save reaches the default branch without a pull request.
**Migration**: See "Every file edit takes the same route" and "Ship merges work that needed no change".

## MODIFIED Requirements

### Requirement: The gate doctrine has one owner

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then merge, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `CLAUDE.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms

## ADDED Requirements

### Requirement: Every file edit takes the same route

Every save that changes a repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

### Requirement: Ship merges work that needed no change

When no change record selects for the branch, `/ship` SHALL apply `/save`'s test for authoring one: code or a plan for code SHALL stop with no identifiable change record; anything else SHALL skip the archive and merge on the gate like any change.

#### Scenario: Shipping a wiki-only pull request

- **WHEN** `/ship` runs on a branch whose only changes are wiki pages and that holds no change
- **THEN** it archives nothing and merges once the gate passes

#### Scenario: Code with no change record

- **WHEN** `/ship` runs on a branch that changes app code and holds no change
- **THEN** it stops and reports that the branch has no identifiable change record

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/knowledge-center/spec.md utf8 665 -->
## MODIFIED Requirements

### Requirement: The agent writes what it learns when it learns it

When a request teaches something repeatable, including "read this and remember it", the agent SHALL write it to the wiki in that request, citing the source by URL or path and never copying the source into git. The edit SHALL be saved like any other file edit, through a pull request; during a change, it SHALL ride in the change's pull request.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the repeatable points land on the page that owns the topic, with the URL, in a pull request for review

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/open-source-release/spec.md utf8 474 -->
## MODIFIED Requirements

### Requirement: GitHub settings enforce the gate

The default branch SHALL require the test and payload checks, block force-push and deletion, and allow only squash merges; no save route SHALL rely on bypassing these rules. Private vulnerability reporting, secret scanning, push protection, and Dependabot alerts SHALL be on.

#### Scenario: A red pull request

- **WHEN** a pull request's required checks fail
- **THEN** GitHub refuses the merge

<!-- end specs/open-source-release/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 792 -->
## ADDED Requirements

### Requirement: Payload checks skip script tests on a docs-only change

When every path a branch changes is under `wiki/` or `openspec/`, the payload checks SHALL skip lint, shell checks, and the script suite, and SHALL still run the private-name scan and the release checks. Markdown anywhere else, skill text included, and a change with no base to compare SHALL run every check. The required `payload` check SHALL still report.

#### Scenario: A wiki-only branch

- **WHEN** a branch changes only a wiki page
- **THEN** the payload job skips lint, shell checks, and the script suite, and runs the private-name scan and release checks

#### Scenario: Skill text changes

- **WHEN** a branch changes only a skill's Markdown
- **THEN** the payload job runs every check

<!-- end specs/payload-checks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 42687 fence=~~~ -->
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
<title>Review · 2026-09-27-wiki-saves-through-review</title>
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
<body data-change="2026-09-27-wiki-saves-through-review">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-wiki-saves-through-review</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today a save that only changes the wiki goes live right away, with no review page and no check. Nobody looks at it before it lands. You want wiki edits to take the same route as code: a review page you can look at, and publishing only when you say so. The automatic checks should stay fast for these saves, running the app's tests only when code changed.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>There is one way to save, and the wiki uses it.</b> The special &quot;wiki goes straight to live&quot; route is deleted, not bent. Every save that changes a file gets a branch and a review page on GitHub, then goes live when you publish. A wiki page is no different from any other file. Saves only differ in whether they need a plan: code does, and anything else gets a review page whose description says what changed.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">Before             After</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">────────────────   ──────────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">code ─▶ save ─▶    any file edit</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">   review page        │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">wiki ─▶ save ─▶       ▼</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">   live             save ─▶ review</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">                      page + checks</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                        │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">                  publish ─▶ live</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Publishing works whether or not there was a plan.</b> When you publish (<code>/ship</code>), it files away the plan if there is one, waits for the checks, and publishes. Work that needed no plan skips that first step. Code with no plan still stops, as it does today.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Checks run the code tests only when code changed.</b> The app's tests and deploy already skip when only Markdown changed. This repo's own extra checks (Payload checks) now skip their code tests when only the wiki or plans changed. The link, spec, and private-name checks still run, and skill text still gets every test.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">changed files    what runs</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">─────────────    ────────────────────</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">only wiki/,      links, specs, private</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">openspec/        names — code tests skip</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">anything else    everything</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Saving facts still commits nothing.</b> A conversation that only produced facts still stores them in memory, with no branch and no review page.</div></div></li>
</ol>
<p class="aside">Non-goals: no change to the app's Test and Deploy workflows, which already skip on docs; no auto-publishing.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how a wiki-only pull request gets merged → chose <code>/ship</code> merges it, the same as code.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether a wiki-only save needs an OpenSpec change → chose no plan record; the PR body describes the edit.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether Payload checks should skip script tests on Markdown-only changes → chose skip only when every path is under <code>wiki/</code> or <code>openspec/</code>, keeping the link and spec checks.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: this request supersedes the 2026-07-30 feedback that prose may go straight to <code>main</code> without review, because it is newer and from the same repo owner.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the app's <code>test.yml</code> and <code>deploy.yml</code> need no change, because <code>app-untouched.sh</code> already skips the suite and the deploy when every path is under <code>wiki/</code>, <code>openspec/</code>, or ends in <code>.md</code>.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the private-names test still runs on a wiki-only change, because it scans every tracked file, wiki pages included, for private names.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the payload workflow reads a new <code>docs_only</code> output from <code>app-untouched.sh</code> rather than its own diff, because the base-finding and fail-safe logic must live in one place; a comparison that can not be made answers <code>false</code>.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a facts-only save keeps making no commit, because facts live in the memory store, not the repo.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a major release, 26.0.0, because installed repos lose a route their agents use, as 25.0.0 did when mini apps lost theirs.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the two delivery-gate requirements are replaced under new names rather than modified, because a modified requirement must keep every old scenario, and seven of them describe the removed route.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked at the review link whether to build → chose build, with the note that wiki saves must not be an exception anywhere in the docs or code: it is simply how saving always works.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the note replaces every wiki-specific route with the general rule &quot;a change is required for code; other file edits get a PR with a plain body&quot;, because that rule already decides when <code>/save</code> authors a change, and it names no path.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>/ship</code> merges a branch that needed no change without an archive, and still stops on code with no change, by the same rule <code>/save</code> uses, because a path test would be a wiki exception.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>/ship</code> skips <code>/verify</code> when the deploy made no preview, because there is nothing to walk; this is the existing skipped-rung rule, not a wiki rule.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>prose-save.md</code> becomes <code>facts-save.md</code>, because it now owns only the facts-only save and a &quot;prose&quot; route name would read as the old exception.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the change loop loses <i>The prose allowlist</i> with no replacement section, because the normal route already covers wiki edits; other pages link to the gate instead.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the Payload checks skip keys on <code>wiki/</code> and <code>openspec/</code> paths, because it decides which tests are relevant, not how work is saved; the user asked for it.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/scripts/app-untouched.sh</code> gains a <code>docs_only</code> output that lets a check skip, because the Payload checks need one shared, fail-safe answer for a <code>wiki/</code>- or <code>openspec/</code>-only change.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/workflows/payload.yml</code> skips lint, shellcheck, and the script suite when <code>docs_only</code> is true, because those only test code and skill text, which such a change does not touch; the private-names test and release checks still run.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>open-source-release</code> and <code>context-economy</code> get small deltas too, because the search in task 3.5 found an owner bypass for prose and a &quot;prose save&quot; route named in those live specs.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built: one save route for every file edit (the <code>wiki/</code> route and <i>The prose allowlist</i> deleted; <code>prose-save.md</code> is now <code>facts-save.md</code>, facts only); <code>/ship</code> merges work that needed no change by <code>/save</code>'s own test; <code>app-untouched.sh</code> gains <code>docs_only</code>, and Payload checks skip lint, shellcheck, and the script suite on it, keeping the private-names test and release checks. Spec deltas reconciled into six live specs. Local link, retired-name, config, and context checks and strict validation pass; CI (task 4.2) is next.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>CI passed on PR #156 (task 4.2); every task is done.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked, after the save report left out the plan's link twice, what next → chose add the fix to this change, then publish, and make sure the link shows next time.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the save and publish reports missed the link because their &quot;one link&quot; rule never named the plan-link rule, and the second miss came from the host hiding chat text written above a question card; so the reports now name the rule, and the question's own text carries the plan's path.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Merged main's 25.15.0–25.17.0 (thinner specs #157, shorter skills #151) at ship time. The spec deltas were rewritten against the merged capabilities (<code>people-wiki</code> → <code>knowledge-center</code>, <code>dependency-currency</code> → <code>dependencies</code>, which no longer mentions the allowlist) in the promise-not-procedure style, and the skill conflicts were resolved on main's shorter text with this change's rules kept. Release stays 26.0.0, above main's 25.17.0.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no repeatable fact; the rules the facts state now live in the save and ship skills and the change loop.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived and checkpointed for merge by <code>/ship</code>.</li>
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
