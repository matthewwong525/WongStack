<!-- openspec-archive v1 2026-10-13-protect-checks-from-edits -->
<!-- file proposal.md utf8 7580 -->
# Checks the assistant can't quietly change

**Status:** ready-to-ship
**Branch:** verify-machine-checks
**Open questions:** none

## Why

A team that let AI agents rebuild a game for three months found the agents kept editing the pass-or-fail script to leave their own work out ([the post](https://momo5502.com/posts/2026-10-09-game-decompilation/)). WongStack has two places where the assistant can do the same and you would not hear of it: it can rewrite or delete a saved check of an older feature, and it can edit the guard that is meant to catch a loosened check.

## What Changes

- **A rewritten or removed saved check is reported.** Before each publish the assistant replays the saved checks of older features. Today it may re-record or delete one with no word to you. Now the automatic checks fail until the assistant writes down why, and that reason shows under *Checks loosened* in the build and publish reports. A new saved check needs no reason, and neither does one whose promise your change rewrites.
  ```text
  saved check        what happens
  ─────────────────┼─────────────────────────
  new              │ nothing
  promise rewritten│ nothing
  re-recorded      │ +needs a reason you see
  removed          │ +needs a reason you see
  ```
- **A change can't edit the guard that judges it.** Today the guard runs from the change's own copy, so a change that weakens the guard is judged by the weakened one. Now a second run uses the copy already published, and reads the change only as text. A change to the guard still needs a written reason, and the old guard is the one that asks for it.
  ```text
    BEFORE                 AFTER
  change ─▶ its own      change ─▶ its own guard
            guard                  +published guard
              │                      │
              ▼                      ▼
            pass                   both must pass
  ```
- **Shared steps of the automatic checks count as settings.** A change to one now needs a reason, like a change to any other check setting. They were missed before.

This is for projects kept on GitHub. A project kept elsewhere keeps the guard it has today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ci-tests`: the loosened-check requirement also covers kept checks and shared workflow actions, and a new requirement has the guard run from the default branch's copy on a pull request.

## Impact

- `.github/scripts/loosened-checks.mjs`, `.github/scripts/check-settings.mjs`, and their tests in `scripts/tests/`.
- A new workflow, `.github/workflows/guard.yml`, on `pull_request_target`; added to `payload-files.json` and the payload manifest.
- `.agents/skills/verify/references/walkthrough.md` § g: one clause on writing the reason; an offsetting cut for the context budget.
- `wiki/development/the-change-loop.md` (the gate), `wiki/development/kept-checks.md`.
- `CHANGELOG.md`: a minor entry. Installs get the new workflow at their next update.
- No app code, no data, no new dependency.

## Decision log

- **2026-10-13** — Asked which improvements to the checking step to plan → chose *Plan 1 and 2*: report rewritten or removed kept checks, and stop a change from editing its own guard.
- **2026-10-13** — Ruled out for this change: a script that decides the machine-readable part of a fresh check. It changes how the walk grades, so it needs paid practice-site runs under the builder framing first; the 2026-10-03 measurement found no missed mistakes, so the gain is unproven.
- **2026-10-13** — Ruled out: a reviewer agent (declined 2026-10-03, and the post found the same), stricter matching (no mistake on record; [Anthropic's post](https://www.anthropic.com/engineering/redesigning-source-control) warns of added complexity), and earlier compaction or an hourly re-read (settings of the chat app, not WongStack's).
- **2026-10-13** — Assumed: only a change to a kept check's steps or expectations is flagged, because a re-keep that changes only when and from which files it was recorded weakens nothing and would put a line in every publish report.
- **2026-10-13** — Assumed: the published-copy run is a second check beside the existing one, because the existing one also serves the pre-check on this computer and projects not on GitHub.
- **2026-10-13** — Assumed: the new check is not added to the repository's required checks by this change, because `/ship` already stops on any failing check and the rule set is the owner's to edit; the changelog names it as an optional hand step.
- **2026-10-13** — Check: `.github/scripts/loosened-checks.mjs` and `.github/scripts/check-settings.mjs` gain kept checks and shared actions as things to flag, because this change is the one that adds them; nothing they flagged before stops being flagged.
- **2026-10-13** — Check: `.github/workflows/guard.yml` is new, because the guard needs a run the change can not edit.
- **2026-10-13** — Built in one pass: each task's own check moved to one run of the local checks at the end, with its acceptance kept.
- **2026-10-13** — The spec reader, the promise fingerprint and the "same steps and expectations" test moved to `.agents/skills/verify/scripts/kept-promises.mjs`, which both the kept-check script and the guard import, so there is one copy.
- **2026-10-13** — The guard uses the default branch's copy of a kept check to say which promise it guards, and the change's copy only when the older one is unreadable; otherwise a change could point a check at a promise it rewrote and dodge the reason. A kept check moved out of its folder counts as removed. A check whose promise was already gone before the change still needs a reason when deleted, as the design's "differs between base and head" reads.
- **2026-10-13** — `guard.yml` checks out the pull request as `refs/pull/<number>/head` from the project itself, because a fork's commit can not be fetched by its hash alone, and takes the script path from `$GITHUB_WORKSPACE/guard/`. It has no concurrency group: a cancelled run reads as a failed check.
- **2026-10-13** — Found for task 4.2: `/save`'s wait (`.agents/skills/save/scripts/wait-for-checks.sh`) calls a pass once two polls ten seconds apart list the same finished checks. GitHub starts `guard` for the pull request, not the push, so on a fast change it could be listed after that. The wait now holds a pass until a check named `guard` is listed, for up to the 60-second grace, when `origin/HEAD` or `origin/main` holds `guard.yml`. Tested in `scripts/tests/wait-for-checks.test.mjs`.
- **2026-10-13** — The list of what is flagged moved from `wiki/development/the-change-loop.md` to a new page, `wiki/development/loosened-checks.md`, because the first page stood 17 words under the 3,000-word limit and the additions needed about 200. The old heading and its link stay; the new page is in the payload list, the development hub and the `ci` area.
- **2026-10-13** — `scripts/tests/payload-rule-paths.test.mjs` now expects three shipped workflows and reads `guard/` paths in `guard.yml` as the default branch's files.
- **2026-10-13** — Archive checkpoint for publishing as 41.1.0. Review before the save found `guard.yml`'s run step piped the guard into `tee` with no `pipefail`, so the step would have passed whatever the guard said; `set -o pipefail` now leads the step and the contract test pins it. `guard.yml` can not run on its own pull request, so its first real run is the next one.

<!-- end proposal.md -->
<!-- file design.md utf8 6577 -->
# Design

## Context

See proposal.md — Why. Read on 2026-10-13:

- `.github/scripts/loosened-checks.mjs` flags skip markers, deleted tests and settings changes; `check-settings.mjs` owns the settings list, shared with `checks.mjs`. Neither names `.agents/verification/journeys/` or `.github/actions/` (memory fact #646 left the second as is on 2026-09-29).
- `test.yml` checks out the pushed commit and runs `node .github/scripts/checks.mjs`, so the workflow, `checks.mjs` and the guard are all the branch's copy. A branch that edits the guard is flagged only by its own edited guard.
- The `main` rule set requires the `test` and `payload` checks and a pull request. `/ship` stops on any failing check `gh pr checks` lists.
- Ten commits on `main` have modified or deleted files under `.agents/verification/journeys/`. Whether any was wrong was not checked.
- A kept check holds `scenario` (`capability`, `requirement`, `scenario`), `thenDigest`, `steps`, `expect`, and recording details (`recordedAt`, `sourcePaths`). `verify-journeys.mjs` already has `promiseDigest` and `ownRequirements`.

## Goals / Non-Goals

**Goals:** a kept check weakened or removed with no reason turns CI red; a pull request is judged by a guard copy it can not change.

**Non-Goals:** changing how a fresh walk is graded; a secret hash of the script, as the post used; protecting the non-GitHub route; adding the new check to the required checks.

## Decisions

1. **A fourth kind in the guard: `kept`, "changes or removes a kept check".** For each changed path under `.agents/verification/journeys/` ending `.json`:
   - status `A`, or a rename whose steps and expectations are equal: not flagged.
   - status `M` or a rename: flagged when `JSON.stringify` of `steps` or of `expect` differs between base and head. Unreadable JSON on either side counts as differing.
   - status `D`: flagged.
   - exempt in every case when the promise moved: the scenario's promise digest in `openspec/specs/<capability>/spec.md` differs between base and head (rewritten or gone), or a delta spec in the diff under `openspec/changes/**/specs/<capability>/spec.md` lists its requirement as MODIFIED or REMOVED. The second covers the pre-check on this computer, before `/save` reconciles deltas.

   Export the spec reader and digest from `verify-journeys.mjs` (or move them to a small shared module beside it) and import them, as the guard already imports `cli.mjs` from the memory skill; no second parser. Alternative considered: put the folder in `isSettings`. Rejected: every new kept check at every publish would need a reason, and `checks.mjs` would rerun the "prove it still fails" pass for each.

2. **`.github/actions/` joins `isSettings`.** One line in `check-settings.mjs`. `checks.mjs` shares that list, so an action edit also triggers its prove-it-fails pass; that is the intended reading of "a check's settings".

3. **A second run from the default branch: `.github/workflows/guard.yml`.** Trigger `pull_request_target` (opened, synchronize, reopened), which always uses the default branch's workflow file. One job, `guard`, `permissions: contents: read`:
   - check out the default branch into `guard/`;
   - check out the pull request's head into `pr/` with full history and `persist-credentials: false`;
   - find the base as `git merge-base` of the head and the base ref, inside `pr/`;
   - `cd pr && node ../guard/.github/scripts/loosened-checks.mjs --base <sha>`, writing the report to the job summary.

   The script already `chdir`s to the top level of the folder it is run from and resolves its imports beside itself, so it reads `pr/` as data and runs only `guard/` code. Nothing from `pr/` is installed or executed, which is what makes `pull_request_target` safe here, forks included; say so in the workflow's header comment. `setup-node` reads `.nvmrc` from `guard/`. Pin actions by commit like the other workflows.

   Alternatives considered. *Have `checks.mjs` fetch the default branch's guard*: `checks.mjs` and `test.yml` are the branch's own, so the change could remove the fetch. *A hash of the guard compared with a stored secret* (the post's fix): it stops edits outright, so every honest guard change needs a secret rotated by hand; the default-branch copy needs no secret and lets a guard change through with a reason. *Replace the in-branch run*: it also serves `--worktree` and the Artifacts route.

4. **The reason is written where kept checks change.** `/ship` archives before `/verify` § g installs kept checks, and `explainedPaths` accepts an archived proposal the diff touches. § g gains one clause: a replaced or removed kept check gets its `Check:` bullet in the archived proposal before the save. `keep --install` prints one `REPLACED=<path>` or `REMOVED=<path>` line per kept file whose steps or expectations it changed or that it deleted, so the clause has a list to follow. The words come out of the same file to hold the context budget.

5. **First landing.** `pull_request_target` reads the default branch, so `guard.yml` does not run on its own pull request; the in-branch guard does, and flags `guard.yml`, both scripts and nothing else. The proposal's two `Check:` bullets explain them. After the merge, the next pull request is the first real run.

## Risks / Trade-offs

- [More lines under *Checks loosened*: a renamed button re-records a kept check and now needs a reason] → that line is the point; decision 1 keeps re-keeps with unchanged steps silent.
- [`/save` reads checks right after opening the pull request, before the `guard` run is listed] → confirm in task 4.2 how `/save`'s wait treats a check that appears late; if it can miss one, wait for `guard` by name when `guard.yml` exists on the default branch.
- [The check is not required by the rule set, so a person merging by hand on GitHub can pass a red `guard`] → `/ship` stops on it; the changelog offers adding `guard` to the required checks as a hand step.
- [The Artifacts route and `--worktree` still run the branch's copy] → named in the gate page as the limit.
- [A guard bug on the default branch blocks every pull request, and its fix is judged by the buggy copy] → the fix needs only a `Check:` bullet naming the guard file, which the buggy copy's explained-path logic already accepts; a broken explained-path reader is the one case needing a hand merge.

## Migration Plan

Ships as a minor release. Installs receive `guard.yml` and the two scripts through `/wong-sync`; nothing to migrate. Roll back by reverting the commit; the in-branch guard keeps working alone.

<!-- end design.md -->
<!-- file tasks.md utf8 5315 -->
# Tasks

## 1. The guard flags kept checks and shared actions

- [x] 1.1 In `.github/scripts/loosened-checks.mjs`, add the `kept` kind by design decision 1: flag a kept check under `.agents/verification/journeys/` whose `steps` or `expect` changed or that was deleted, exempting added files, unchanged moves, and a promise the branch rewrites or removes (main spec digest differs, or a delta spec in the diff lists the requirement as MODIFIED or REMOVED). Reuse the spec reader and digest from `.agents/skills/verify/scripts/verify-journeys.mjs` by exporting or moving them; write no second parser. Update the header comment. Verify `node .github/scripts/loosened-checks.mjs --worktree` on this branch prints a report and flags no kept check.
- [x] 1.2 In `.github/scripts/check-settings.mjs`, count every path under `.github/actions/` as settings (decision 2). Verify the existing settings tests still pass.
- [x] 1.3 Author tests in `scripts/tests/loosened-checks.test.mjs` beside the existing ones, each in a throwaway git repo: an expectation removed is flagged; a deletion is flagged; a re-keep changing only `recordedAt` and `sourcePaths` is not; an added file is not; an unchanged move is not; a rewritten `THEN` in the main spec exempts the edit; a MODIFIED delta spec in the diff exempts it; unreadable JSON is flagged; a `Check:` bullet naming the file explains it; an edit under `.github/actions/` is flagged as settings.

## 2. The run a change can not edit

- [x] 2.1 Add `.github/workflows/guard.yml` by design decision 3: `pull_request_target`, one `guard` job, read-only permissions, default branch in `guard/`, pull request head in `pr/` with full history and no persisted credentials, merge-base as the base, the default branch's `loosened-checks.mjs` run from inside `pr/`, report to the job summary. Pin actions by commit as `test.yml` does, and say in the header comment why nothing from the pull request is executed. Verify with `actionlint` if installed, else by reading it against `test.yml`.
- [x] 2.2 Author a test in `scripts/tests/` that runs the guard the way the workflow does: two checkouts of a throwaway repo, the script taken from one and the working folder set to the other, where the second has an emptied guard and a new skip comment. Verify the run exits 1 and names both files, and that a contract test pins `guard.yml`'s trigger, its two checkout paths and the absence of any `run:` step that executes a file under `pr/`.
- [x] 2.3 Add `.github/workflows/guard.yml` to `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest, beside `test.yml`. Verify `node scripts/payload-checks.mjs` passes.

## 3. The reason is written where kept checks change

- [x] 3.1 In `.agents/skills/verify/scripts/verify-journeys.mjs`, make `keep --install` print one `REPLACED=<path>` or `REMOVED=<path>` line for each kept file whose steps or expectations it changed or that it deleted (decision 4), and test it in `scripts/tests/verify-journeys.test.mjs`: a re-keep with new steps prints `REPLACED`, an unchanged re-keep prints nothing.
- [x] 3.2 In `.agents/skills/verify/references/walkthrough.md` § g step 3, add the clause: each `REPLACED` or `REMOVED` line gets a `Check:` bullet in the archived proposal before the save. Cut at least as many words from the same file. Verify `node scripts/measure-context.mjs --check` passes.
- [x] 3.3 Update the wiki by its rules and voice: in `wiki/development/the-change-loop.md` § *A loosened check needs a reason*, add kept checks and shared actions to what is flagged, the default-branch run, and its limit off GitHub; in `wiki/development/kept-checks.md`, say under *What each result means* that a replaced or removed kept check is reported with its reason. Verify `node scripts/check-payload-links.mjs` passes.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Checks the assistant can't quietly change` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing to do; to make the new check un-skippable when merging by hand, add `guard` to the required checks in the project's GitHub settings (say where). Leave `VERSION` alone.
- [x] 4.2 Read how `/save` waits for checks (`.agents/skills/save/references/git-gate.md` and its script) and confirm it does not settle before a `guard` run that appears after the pull request opens. If it can, wait for `guard` by name when `guard.yml` is on the default branch, with a test. Record the finding in the Decision log either way.

## 5. Final verification

- [x] 5.1 After all source, tests and docs are written, run `node .github/scripts/checks.mjs --worktree` and repair failures this change caused: script tests, payload links, wiki checks, context budget, and `openspec validate "protect-checks-from-edits" --strict --no-interactive`. Confirm the in-branch guard lists `guard.yml` and both scripts as explained by the proposal's `Check:` bullets. Report local evidence without claiming remote checks passed.
- [x] 5.2 Record in memory, as an open thread tagged `verify`: the first pull request after this ships should show a `guard` check, since `guard.yml` can not run on its own pull request; and the later idea of a script deciding the machine-readable part of a fresh walk, to be measured under the builder framing first.

<!-- end tasks.md -->
<!-- file specs/ci-tests/spec.md utf8 3458 -->
## MODIFIED Requirements

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, changes a check's settings, or changes the steps or expectations of a kept check or removes one, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file and every file of a shared workflow action SHALL count as a check's settings. A kept check SHALL NOT be flagged when the branch adds it, moves it unchanged, changes only its recording details, or rewrites or removes the promise it points at. Its failure SHALL name each unexplained file and how to pass.

#### Scenario: A skip with no reason

- **WHEN** a branch adds a mutation-testing skip comment to a source file with no `Check:` bullet naming it
- **THEN** the check fails and names the file

#### Scenario: A recorded reason passes

- **WHEN** the Decision log adds a `Check:` bullet naming that file
- **THEN** the check passes and lists the file as explained

#### Scenario: A workflow other than the test workflow

- **WHEN** a branch removes a lint step from the payload workflow with no `Check:` bullet naming it
- **THEN** the check fails and names that workflow file

#### Scenario: A kept check loses an expectation

- **WHEN** a branch removes one expectation from a kept check whose promise it leaves alone, with no `Check:` bullet naming the file
- **THEN** the check fails and names the kept check's file

#### Scenario: A kept check is deleted

- **WHEN** a branch deletes a kept check whose promise still stands in the specs, with no `Check:` bullet naming the file
- **THEN** the check fails and names the kept check's file

#### Scenario: A kept check follows its rewritten promise

- **WHEN** a branch rewrites a scenario's `THEN` and re-records that scenario's kept check
- **THEN** the check does not flag the kept check's file

#### Scenario: A new kept check

- **WHEN** a branch adds a kept check, or re-keeps one with the same steps and expectations
- **THEN** the check does not flag the file

#### Scenario: A shared workflow action

- **WHEN** a branch edits a file of a shared workflow action with no `Check:` bullet naming it
- **THEN** the check fails and names that file

## ADDED Requirements

### Requirement: A pull request is judged by the guard it can not edit

On a GitHub pull request, a check SHALL run the loosened-check guard from the default branch's copy against the pull request's changes, executing no file from the pull request. It SHALL fail and pass by the same rule as the test check's guard, and SHALL report its result on the pull request under its own name.

#### Scenario: A change weakens the guard

- **WHEN** a pull request edits the guard so that it flags nothing, and adds a skip comment to a source file, with no `Check:` bullet
- **THEN** the default-branch guard's check fails and names both the guard's file and the source file

#### Scenario: A change removes the guard's workflow

- **WHEN** a pull request deletes the workflow that runs the default-branch guard
- **THEN** that check still runs on the pull request, and fails naming the deleted workflow file unless a `Check:` bullet explains it

#### Scenario: A change that loosens nothing

- **WHEN** a pull request changes no check, no kept check and no check's settings
- **THEN** the default-branch guard's check passes

<!-- end specs/ci-tests/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-13

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 52378 fence=~~~ -->
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
<title>Review · 2026-10-13-protect-checks-from-edits</title>
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
<body data-change="2026-10-13-protect-checks-from-edits">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-13-protect-checks-from-edits</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A team that let AI agents rebuild a game for three months found the agents kept editing the pass-or-fail script to leave their own work out (<a href="https://momo5502.com/posts/2026-10-09-game-decompilation/">the post</a>). WongStack has two places where the assistant can do the same and you would not hear of it: it can rewrite or delete a saved check of an older feature, and it can edit the guard that is meant to catch a loosened check.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A rewritten or removed saved check is reported.</b> Before each publish the assistant replays the saved checks of older features. Today it may re-record or delete one with no word to you. Now the automatic checks fail until the assistant writes down why, and that reason shows under <i>Checks loosened</i> in the build and publish reports. A new saved check needs no reason, and neither does one whose promise your change rewrites.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">saved check        what happens</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">─────────────────┼─────────────────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">new              │ nothing</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">promise rewritten│ nothing</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">re-recorded      │ +needs a reason you see</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">removed          │ +needs a reason you see</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A change can't edit the guard that judges it.</b> Today the guard runs from the change's own copy, so a change that weakens the guard is judged by the weakened one. Now a second run uses the copy already published, and reads the change only as text. A change to the guard still needs a written reason, and the old guard is the one that asks for it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">change ─▶ its own      change ─▶ its own guard</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">          guard                  +published guard</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">            │                      │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">            ▼                      ▼</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">          pass                   both must pass</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Shared steps of the automatic checks count as settings.</b> A change to one now needs a reason, like a change to any other check setting. They were missed before.</div></div></li>
</ol>
<p class="aside">This is for projects kept on GitHub. A project kept elsewhere keeps the guard it has today.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked which improvements to the checking step to plan → chose <i>Plan 1 and 2</i>: report rewritten or removed kept checks, and stop a change from editing its own guard.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Ruled out for this change: a script that decides the machine-readable part of a fresh check. It changes how the walk grades, so it needs paid practice-site runs under the builder framing first; the 2026-10-03 measurement found no missed mistakes, so the gain is unproven.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Ruled out: a reviewer agent (declined 2026-10-03, and the post found the same), stricter matching (no mistake on record; <a href="https://www.anthropic.com/engineering/redesigning-source-control">Anthropic's post</a> warns of added complexity), and earlier compaction or an hourly re-read (settings of the chat app, not WongStack's).</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: only a change to a kept check's steps or expectations is flagged, because a re-keep that changes only when and from which files it was recorded weakens nothing and would put a line in every publish report.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the published-copy run is a second check beside the existing one, because the existing one also serves the pre-check on this computer and projects not on GitHub.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the new check is not added to the repository's required checks by this change, because <code>/ship</code> already stops on any failing check and the rule set is the owner's to edit; the changelog names it as an optional hand step.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-13</p>Check: <code>.github/scripts/loosened-checks.mjs</code> and <code>.github/scripts/check-settings.mjs</code> gain kept checks and shared actions as things to flag, because this change is the one that adds them; nothing they flagged before stops being flagged.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-13</p>Check: <code>.github/workflows/guard.yml</code> is new, because the guard needs a run the change can not edit.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Built in one pass: each task's own check moved to one run of the local checks at the end, with its acceptance kept.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>The spec reader, the promise fingerprint and the &quot;same steps and expectations&quot; test moved to <code>.agents/skills/verify/scripts/kept-promises.mjs</code>, which both the kept-check script and the guard import, so there is one copy.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>The guard uses the default branch's copy of a kept check to say which promise it guards, and the change's copy only when the older one is unreadable; otherwise a change could point a check at a promise it rewrote and dodge the reason. A kept check moved out of its folder counts as removed. A check whose promise was already gone before the change still needs a reason when deleted, as the design's &quot;differs between base and head&quot; reads.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p><code>guard.yml</code> checks out the pull request as <code>refs/pull/&lt;number&gt;/head</code> from the project itself, because a fork's commit can not be fetched by its hash alone, and takes the script path from <code>$GITHUB_WORKSPACE/guard/</code>. It has no concurrency group: a cancelled run reads as a failed check.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Found for task 4.2: <code>/save</code>'s wait (<code>.agents/skills/save/scripts/wait-for-checks.sh</code>) calls a pass once two polls ten seconds apart list the same finished checks. GitHub starts <code>guard</code> for the pull request, not the push, so on a fast change it could be listed after that. The wait now holds a pass until a check named <code>guard</code> is listed, for up to the 60-second grace, when <code>origin/HEAD</code> or <code>origin/main</code> holds <code>guard.yml</code>. Tested in <code>scripts/tests/wait-for-checks.test.mjs</code>.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>The list of what is flagged moved from <code>wiki/development/the-change-loop.md</code> to a new page, <code>wiki/development/loosened-checks.md</code>, because the first page stood 17 words under the 3,000-word limit and the additions needed about 200. The old heading and its link stay; the new page is in the payload list, the development hub and the <code>ci</code> area.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p><code>scripts/tests/payload-rule-paths.test.mjs</code> now expects three shipped workflows and reads <code>guard/</code> paths in <code>guard.yml</code> as the default branch's files.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Archive checkpoint for publishing as 41.1.0. Review before the save found <code>guard.yml</code>'s run step piped the guard into <code>tee</code> with no <code>pipefail</code>, so the step would have passed whatever the guard said; <code>set -o pipefail</code> now leads the step and the contract test pins it. <code>guard.yml</code> can not run on its own pull request, so its first real run is the next one.</li>
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
