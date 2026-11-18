<!-- openspec-archive v1 2026-09-27-clean-up-drift -->
<!-- file proposal.md utf8 8247 -->
# Clean up what the v25–26 releases left stale

**Status:** ready-to-ship
**Branch:** green-cow
**Open questions:** none

## Why

Fifteen releases in two days left pages, rules, and specs that no longer match how WongStack works. A new user reads that setup leaves an existing website alone, when setup only runs in an empty folder, and looks for a button the starter page no longer has. Some automatic checks also miss files they should watch, and one test fails at random.

## What Changes

- **Pages tell the truth again.** The stack pages drop Tailwind, which left in v18, and describe today's preview: the agent hands you a link as soon as it builds. *Getting started* says setup needs an empty folder, and describes the starter page as it is: your apps and a *Learn the development loop* box. The contributing page stops saying an update wipes the cached copy. It never does.
- **Smaller fixes where a page points at nothing.** The pipeline page lists the two scripts it missed. The walkthrough stops using a command that doesn't exist. The secrets rule points at the page that holds its rule. The tools page stops citing a "Step 0" that is gone. The design page drops its "Part 1 —" headings.
- **The wiki rule for agents matches the wiki's own rule.** Agents working on a plan write repeatable knowledge to the wiki when they learn it, not only "when wiki work is in scope".
- **"Review page" means one thing.** It stays the plan's page with the drawings and *+ Note* buttons. The pull request gets its own name in chat: *the change on GitHub*.
  ```text
  plan ──▶ review page  (drawings, + Note)
  save ──▶ the change on GitHub
  ```
- **Specs say each promise once.** Three promises written in two specs each keep one copy. The workspace spec loses how-to detail. One save spec stops naming a step that is no longer separate. An unused setting that let a repo keep its wiki pages in another folder is removed.
- **The automatic checks watch everything they should.** The check that catches a switched-off test now watches every workflow file, not just one. Lint and coverage now include the memory service, the mini-app router, and the check scripts. A test that failed at random now waits properly. Dependency updates cover the test tools and every place that names the OpenSpec version, and a test proves those places agree.

**Non-goals:** the fixes to how plans and publishing are worded in chat (asking the user, the change loop, `/explore`) are a separate part in this chat. Release number collisions are their own workspace. No new behavior for users.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-part-workspaces`: two requirements lose how-to detail.
- `change-loop`: drops the review-notes requirement that `ux-wireframes` owns.
- `context-economy`: drops the one-owner requirement that `payload-layout` owns; save's conditional list drops "archived handoff".
- `dependencies`: drops the setup-tools requirement that `install-onboarding` owns; `/update-dependencies` covers the payload test tools and every OpenSpec pin.
- `install-onboarding`: takes the one promise only `dependencies` held (never install a package manager).
- `wong-sync`: the install record no longer keeps a relocated docs folder; the mapping requirement is removed.
- `payload-checks`: lint and coverage name the memory worker, the check scripts, and the mini-app router.
- `ci-tests`: the loosened-check guard watches every workflow file.

## Impact

- Wiki: `wiki/stack/core-stack.md`, `wiki/stack/getting-started.md`, `wiki/stack/d1-pipeline.md`, `wiki/contributing.md`, `wiki/README.md`, `wiki/ux-principles.md`, `wiki/development/required-tools.md`.
- Rules: `.claude/rules/openspec.md`, `.claude/rules/secrets.md`.
- Skills: `verify/references/walkthrough.md`, `explore/references/asking-the-user.md` (one phrase, line 28), `continue/SKILL.md` (one phrase), `wong-sync/SKILL.md`, `wong-sync/references/payload-manifest.md`, `wong-sync/scripts/preflight.mjs`, `update-dependencies/SKILL.md`.
- Checks: `.github/scripts/loosened-checks.mjs`, `.github/workflows/payload.yml`, `scripts/tests/.c8rc.json`, `scripts/retired-names.json`, and tests `loosened-checks`, `memory-worker`, `server-setup`, `wong-sync-preflight`.
- Installed repos: after `/wong-sync`, a branch that changes any workflow file, `deploy.yml` included, needs a `Check:` line. A record's `components.docsPath` is ignored.
- `VERSION`, `CHANGELOG.md`, eight spec deltas.

## Decision log

- **2026-09-27** — Asked which stale pages, spec drift, and check gaps to fix → chose the list settled in the 2026-09-27 audit, carried in this part's brief.
- **2026-09-27** — Asked whether to split the request into parts → chose this part here, publishing-flow fixes next in this chat, and release collisions in their own workspace.
- **2026-09-27** — Assumed: the pull request's plain name in chat is *the change on GitHub*, because "review page" already means `review.html`, and the wiki glossary's *Pull request* entry can say what the agent calls it.
- **2026-09-27** — Assumed: this part changes only the one phrase at `asking-the-user.md:28`; the publishing-flow part owns every other edit to that file, and whichever lands second rebases.
- **2026-09-27** — Assumed: each duplicate pair keeps the fuller copy (`ux-wireframes`, `payload-layout`, `install-onboarding`), because each already covers the other's promise; `install-onboarding` gains *never install a package manager*, the one promise only `dependencies` held.
- **2026-09-27** — Assumed: `docsPath` is removed outright and added to the retired names, because no install record sets it (the audit found none) and keeping unused mapping code costs tests and prose.
- **2026-09-27** — Assumed: the flaky test counts a missing key as "not yet", because returning `undefined` would satisfy `!== key` mid-write and hide the race instead of waiting it out.
- **2026-09-27** — Assumed: if the wider coverage drops below the floor in `.c8rc.json`, the build adds tests rather than lowering the floor, because the floor only rises.
- **2026-09-27** — Assumed: this ships as 26.2.0 (or the next minor after `main`), because it removes an unused setting and fixes text; no command changes.
- **2026-09-27** — Check: `.github/scripts/loosened-checks.mjs` watches more files, because every workflow file can switch a check off, not only `test.yml`.
- **2026-09-27** — Check: `.github/workflows/payload.yml` lints more paths, because the memory worker, check scripts, and mini-app router were unlinted.
- **2026-09-27** — Check: `scripts/tests/.c8rc.json` measures more files, because the same files were outside coverage.
- **2026-09-27** — Assumed: the `path-collision` check stays, with a new test for two skills renamed to one local name, because skill renames can still collide once `docsPath` is gone.
- **2026-09-27** — Check: `scripts/tests/wong-sync-preflight.test.mjs` deletes the two `docsPath` tests, because the feature they test is removed.
- **2026-09-27** — Checkpoint: tasks 1.1–5.1 built as 26.2.0; spec deltas reconciled into `openspec/specs/`; local lint, 367 script tests, and coverage (87.9% lines, 83.4% branches) pass. Waiting on CI for task 5.2.
- **2026-09-27** — Checkpoint: CI passed on PR #159 (coverage floor included); task 5.2 done, all tasks complete.
- **2026-09-27** — Merged `main` after #160 (26.2.0, releases numbered at publish) took the same number: the entry is now `## Next (minor)`, `VERSION` stays at main's, and `/ship` numbers it before merging. Main's payload check had failed on the flaky envKey test this change fixes; its job was re-run.
- **2026-09-27** — Distilled: no repeatable fact. The live facts are this change's fix and two host or merge-order threads.
- **2026-09-27** — Archive checkpoint: merged `main` again after #161 (26.3.0); the release is numbered 26.4.0 from main's 26.3.0. Archived with specs already reconciled.
- **2026-09-27** — Archive checkpoint: `merge.sh` reported `stale_version=26.4.0` after #162 (publishing-flow fixes) took 26.4.0. Merged `main`; in `asking-the-user.md:28` kept #162's new sentence and this change's *the change on GitHub*. Renumbered 26.5.0.

<!-- end proposal.md -->
<!-- file design.md utf8 6953 -->
# Design

## Context

See proposal.md, Why. Every item was found and located by the 2026-09-27 audit; this design fixes the wording and the mechanics where a choice exists. The skill-text fixes to `asking-the-user.md`, the change loop page, and `/explore` belong to the publishing-flow part, which edits the same files after this one.

## Goals / Non-Goals

**Goals:** each stale sentence says what WongStack does today; each spec promise has one owner; lint, coverage, and the loosened-check guard reach every file they should; the OpenSpec pins cannot drift apart.

**Non-Goals:** rewriting the pages beyond the stale sentences; new tests beyond the ones the specs need; any change to what setup, sync, or save do.

## Decisions

### Page wording

- `wiki/stack/core-stack.md`: line 3 drops "and styled with Tailwind"; the `Tailwind 4` table row goes. Line 25: `/apply` uploads a preview from the agent's machine as soon as a build finishes and hands back its link; `/save` and CI give each pushed branch its own. Line 27: drop "No `npm install`"; say nothing runs on *your* machine because the agent installs and builds what it needs, with no `wrangler dev` and no localhost.
- `wiki/stack/getting-started.md`: line 16 describes the starter page as it is (`app/src/App.tsx`): a *Your apps* list and the *Learn the development loop* box. Line 18 becomes one sentence: setup starts from an empty folder, so the starter site always comes with it. Line 67: the page loads and lists your apps, the proof your address and your code are live. Keep the Copy-box paragraph at line 69.
- `wiki/contributing.md:20`: `/wong-sync` fast-forwards the cache on every run and moves to a fresh checkout when it finds local work there ([latest source](../.agents/skills/wong-sync/references/latest-source.md)), so work left there is never used. Fork and clone instead.
- `.claude/rules/openspec.md:7`: "Repeatable knowledge goes in `wiki/` when you learn it, by [the repeatable-knowledge rule](../../wiki/wiki-style.md#repeatable-knowledge)."
- *Review page* vs pull request: `wiki/README.md` glossary line 38 says every save gets a pull request you publish when ready; the *Pull request* entry (line 30) adds that the agent calls it *the change on GitHub*. `asking-the-user.md:28` and `continue/SKILL.md:73` use *the change on GitHub*. Chosen over *the pull request*, because the plain-words rule keeps git terms out of chat. `grep -rn "review page on GitHub"` must then find nothing live.
- `wiki/stack/d1-pipeline.md` script table gains two rows: `scripts/cf-preview.sh` (run by `/apply` for a preview from the agent host: installs, migrates staging, builds, uploads a staging version, prints the URL; never deploys production) and `scripts/mini-dashboard.mjs` (run by `cf-build.sh` after every build: copies each mini app into the build and writes `apps/apps.json` for the landing page).
- `verify/references/walkthrough.md:76`: replace the made-up alias with the real command, run from `app/`: `npx wrangler d1 execute <staging-db> --remote --env staging --command "…"`, where `<staging-db>` is `env.staging`'s database name in `wrangler.jsonc`.
- `.claude/rules/secrets.md:17`: the secrets page owns worktree resolution and branch copies; [`/save`'s named secrets](../skills/save/references/named-secrets.md) owns what a save keeps out of commits.
- `wiki/development/required-tools.md:96`: "`/wong-sync` reads `.claude/.wong-stack.json` this way before anything else" (no Step 0).
- `wiki/ux-principles.md`: headings become `## Start from the use case` and `## Principles`; line 75's anchor becomes `#start-from-the-use-case`; line 30's "The Part 1 brief" becomes "The use-case brief".

### Specs

Each duplicate pair keeps the fuller copy and REMOVEs the other (see specs/). `install-onboarding` gains *never install a package manager*, the only promise the removed `dependencies` copy held alone; the home-folder and password detail is how-to and stays in the skill. `multi-part-workspaces` keeps every scenario; only the requirement text shrinks (515 → 394 and 530 → 416 characters).

### `docsPath`

Remove `docsPathOf`, the `docsPath` argument of `targetPathFor`, and its call in `.agents/skills/wong-sync/scripts/preflight.mjs`; delete the two `docsPath` tests in `scripts/tests/wong-sync-preflight.test.mjs`; drop payload-manifest.md's paragraph at line 26 and "a relocated docs path" at line 69; drop "and a relocated docs path" from the brief in `wong-sync/SKILL.md:32`. Add `docsPath` to `scripts/retired-names.json` (replacement: WongStack's pages stay under `wiki/`). The `path-collision` check stays only if another mapping can still collide; if skill renames alone cannot, remove it too and say so in the changelog.

### Checks

- `loosened-checks.mjs` `isSettings`: `/^\.github\/workflows\/[^/]+\.ya?ml$/` replaces the `test.yml` literal. A test in `scripts/tests/loosened-checks.test.mjs` proves an unexplained `payload.yml` edit fails and a `deploy.yml` edit fails.
- Lint, in `payload.yml`: `oxlint --deny-warnings scripts .agents/skills/*/scripts .agents/skills/memory/worker .github/scripts mini-apps/router.mjs mini-apps/routes.mjs`.
- Coverage, in `scripts/tests/.c8rc.json`: `src` adds `.github/scripts` and `mini-apps`; `include` adds `.agents/skills/*/worker/*.mjs`, `.github/scripts/*.mjs`, `mini-apps/*.mjs`. The floor stays at 85 lines / 81 branches; if the first CI run is under it, add tests for the uncovered paths.
- Flaky `envKey` (`memory-worker.test.mjs:71`): return `match?.[1]`, and the renewal wait at line 709 becomes `until(() => { const next = envKey(env); return next && next !== key; })`, so a half-written `.env` means "not yet", never a pass or a TypeError.
- OpenSpec pins: `server-setup.test.mjs` reads all four files (`.github/workflows/payload.yml`, `server/setup.sh`, `.agents/skills/save/references/preconditions.md`, `.github/CONTRIBUTING.md`), fails when any holds no pin, and fails naming the file whose pin differs from `payload.yml`'s.
- `/update-dependencies`: the survey adds `npm outdated` in `scripts/tests/` (exact pins, so it bumps the pin and `package-lock.json`); the OpenSpec step names the four pin files and the test that checks them.

## Risks / Trade-offs

- [Wider settings watch makes `/wong-sync` updates to `deploy.yml` need a `Check:` line in installed repos] → the guard's failure message already says what to add; the changelog's Updating note says so too.
- [Wider coverage may fall below the floor] → add tests, never lower the floor (Decision log).
- [This part and the publishing-flow part both edit `asking-the-user.md`] → this part changes one phrase at line 28; the second to land rebases.
- [A repo relied on `docsPath` after all] → its pages sync to `wiki/`; the changelog tells it to move them back first.

## Migration Plan

Ships as a minor release. Installed repos get the page, skill, and guard edits through `/wong-sync`. Rollback is a revert of the merge.

<!-- end design.md -->
<!-- file tasks.md utf8 4093 -->
# Tasks

## 1. Wiki pages and rules

- [x] 1.1 Fix `wiki/stack/core-stack.md` (Tailwind, the preview sentence, "No `npm install`") and `wiki/stack/getting-started.md` (lines 16, 18, 67) per design.md, Page wording. Verify `grep -in "tailwind\|fetches\|left completely alone" wiki/stack/core-stack.md wiki/stack/getting-started.md` finds nothing.
- [x] 1.2 Fix `wiki/contributing.md:20`, `wiki/development/required-tools.md:96`, and the `wiki/ux-principles.md` headings, anchor, and "Part 1 brief". Verify `grep -rn "resets it\|Step 0\|Part 1\|Part 2\|#part-" wiki .agents` finds nothing live.
- [x] 1.3 Add the `cf-preview.sh` and `mini-dashboard.mjs` rows to the script table in `wiki/stack/d1-pipeline.md`. Verify every `scripts/*.sh` and `scripts/*.mjs` a deploy or preview runs has a row.
- [x] 1.4 Point `.claude/rules/openspec.md:7` at the repeatable-knowledge rule and `.claude/rules/secrets.md:17` at `save/references/named-secrets.md`. Verify both links resolve.
- [x] 1.5 Give the pull request its plain name, *the change on GitHub*: `wiki/README.md` glossary (Pull request and Save entries), `.agents/skills/explore/references/asking-the-user.md:28` (that phrase only), `.agents/skills/continue/SKILL.md:73`. Verify `grep -rn "review page on GitHub" wiki .agents AGENTS.md README.md` finds nothing.

## 2. Skill text

- [x] 2.1 Replace `npm run db:query:staging` in `.agents/skills/verify/references/walkthrough.md` with the `wrangler d1 execute … --env staging` command from design.md. Verify `grep -rn "db:query" .agents wiki` finds nothing.
- [x] 2.2 In `.agents/skills/update-dependencies/SKILL.md`, add `scripts/tests/` to the survey and name the four OpenSpec pin files and the test that checks them. Verify the section names each of the four paths once.

## 3. Specs and `docsPath`

- [x] 3.1 Remove `docsPath` from `.agents/skills/wong-sync/scripts/preflight.mjs`, its two tests in `scripts/tests/wong-sync-preflight.test.mjs`, `payload-manifest.md` (line 26 paragraph, line 69 phrase), and `wong-sync/SKILL.md:32`; add `docsPath` to `scripts/retired-names.json`. Keep or drop `path-collision` per design.md. Verify `node --test scripts/tests/wong-sync-preflight.test.mjs` passes and `node scripts/check-retired-names.mjs` passes.
- [x] 3.2 Verify the eight spec deltas still match the main specs they modify (`openspec validate clean-up-drift --strict --no-interactive`); `/save` reconciles them into `openspec/specs/`.

## 4. Checks

- [x] 4.1 Make `.github/scripts/loosened-checks.mjs` treat every `.github/workflows/*.yml` or `*.yaml` as settings; add tests in `scripts/tests/loosened-checks.test.mjs` that an unexplained `payload.yml` edit and an unexplained `deploy.yml` edit each fail, naming the file. Verify `node --test scripts/tests/loosened-checks.test.mjs` passes.
- [x] 4.2 Widen the lint paths in `.github/workflows/payload.yml` and the coverage `src`/`include` in `scripts/tests/.c8rc.json` per design.md. Verify `scripts/tests/node_modules/.bin/oxlint --deny-warnings` on the new paths reports nothing, fixing any finding it makes.
- [x] 4.3 Make `envKey` in `scripts/tests/memory-worker.test.mjs` tolerate a missing match, and the renewal wait treat a missing key as "not yet". Verify `node --test scripts/tests/memory-worker.test.mjs` passes.
- [x] 4.4 Make `scripts/tests/server-setup.test.mjs` check all four OpenSpec pins, naming a file with a missing or different pin. Verify it passes, and fails when one pin is edited by hand (then revert).

## 5. Release

- [x] 5.1 Bump `VERSION` to 26.2.0 (or the next minor after `main`) and add a newest-first `CHANGELOG.md` entry in plain words, with an Updating note: workflow files now need a `Check:` line, and `components.docsPath` is ignored. Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; verify all pass.
- [x] 5.2 Save with `/save` and verify CI passes, the coverage floor included; if coverage falls below the floor, add tests for the newly measured files and save again.

<!-- end tasks.md -->
<!-- file specs/change-loop/spec.md utf8 292 -->
## REMOVED Requirements

### Requirement: Review-page notes update the plan
**Reason**: The same promise is written in `ux-wireframes` as "Pasted notes update the plan and stop", which also covers a change missing from the checkout.
**Migration**: None; read the `ux-wireframes` requirement.

<!-- end specs/change-loop/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 1019 -->
## MODIFIED Requirements

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, or changes a check's settings, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file SHALL count as a check's settings. Its failure SHALL name each unexplained file and how to pass.

#### Scenario: A skip with no reason

- **WHEN** a branch adds a mutation-testing skip comment to a source file with no `Check:` bullet naming it
- **THEN** the check fails and names the file

#### Scenario: A recorded reason passes

- **WHEN** the Decision log adds a `Check:` bullet naming that file
- **THEN** the check passes and lists the file as explained

#### Scenario: A workflow other than the test workflow

- **WHEN** a branch removes a lint step from the payload workflow with no `Check:` bullet naming it
- **THEN** the check fails and names that workflow file

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/context-economy/spec.md utf8 730 -->
## MODIFIED Requirements

### Requirement: Save loads conditional procedures only when they apply

`/save` SHALL complete an ordinary checkpoint without loading its conditional procedures (named secrets, facts-only, new-plan fallback), and SHALL load each one that applies before acting on it.

#### Scenario: An ordinary checkpoint

- **WHEN** `/save` checkpoints an active change with no named secret
- **THEN** it loads no conditional procedure and keeps every credential and gate check

## REMOVED Requirements

### Requirement: Each rule has one owner
**Reason**: The same promise is written in `payload-layout` as "Every payload fact has exactly one owning file".
**Migration**: None; read the `payload-layout` requirement.

<!-- end specs/context-economy/spec.md -->
<!-- file specs/dependencies/spec.md utf8 1574 -->
## MODIFIED Requirements

### Requirement: An on-demand verb updates this repo to latest

The source repo SHALL have an `/update-dependencies` verb that, only when asked, surveys and updates the OpenSpec CLI, the browser CLI, `gh`, `git`, `node`, the app's dependencies, and WongStack's own test tools to their latest versions, including majors with their migration notes applied, and hands a nonempty diff to `/save`. Every place that names the OpenSpec version SHALL move together, and a test SHALL fail when two of them disagree. It SHALL NOT run on a schedule, run a local test suite as the gate, or claim a green CI run proves every major safe.

#### Scenario: Nothing is out of date

- **WHEN** every surveyed tool and dependency is current
- **THEN** the verb reports them current, changes no file, and does not call `/save`

#### Scenario: A dependency has a new major

- **WHEN** a dependency's latest version is a major ahead
- **THEN** the verb bumps to it, applies the migration notes, and leaves verification to CI

#### Scenario: One OpenSpec pin is missed

- **WHEN** an update moves the OpenSpec version in CI but not in the contributing guide
- **THEN** the checks fail and name the file that still holds the old version

## REMOVED Requirements

### Requirement: Setup checks its tools before it writes anything
**Reason**: The same promise is written in `install-onboarding` as "Setup readies the computer before it writes anything", which now also holds the one promise only this copy had.
**Migration**: None; read the `install-onboarding` requirement.

<!-- end specs/dependencies/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 917 -->
## MODIFIED Requirements

### Requirement: Setup readies the computer before it writes anything

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, and an existing git identity SHALL stay unchanged.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/multi-part-workspaces/spec.md utf8 1926 -->
## MODIFIED Requirements

### Requirement: Separate parts are asked about once
When a request holds two or more parts that could each be planned and published alone, the agent SHALL ask once, in `/explore`'s exit round: open a new workspace for each other part *(Recommended)*, do them here one at a time, or keep them as one change. Steps of one change SHALL NOT count as parts. Without a running Paseo, the question SHALL leave out new workspaces and say they need Paseo.

#### Scenario: Three parts with Paseo
- **WHEN** a person asks for three separately publishable changes in one message, on a host with a running Paseo daemon
- **THEN** the exit round lists the three parts and asks once, with the new-workspace option first and recommended

#### Scenario: No Paseo
- **WHEN** the same request runs on a host without `paseo` on PATH
- **THEN** the question offers only one at a time here or one change, and says new workspaces need Paseo

### Requirement: The next work is offered in a new workspace
When `/ship` finishes and more work the person asked for remains, its closing question SHALL offer to open the next piece in a new workspace *(Recommended)*, or stop. When new or resumed work would displace another unpublished change in this workspace, the agent SHALL offer a new workspace first and SHALL switch nothing here until the person answers. A resumed change's workspace SHALL open on its recorded branch.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A and the queued part B has no workspace yet
- **THEN** the closing question offers to open B in a new workspace, first and recommended, and stopping

#### Scenario: Continue from a busy workspace
- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch

<!-- end specs/multi-part-workspaces/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 700 -->
## MODIFIED Requirements

### Requirement: WongStack's scripts meet a quality bar

Every JavaScript file WongStack's own tests exercise, the memory worker, the check scripts, and the mini-app router included, SHALL meet a committed coverage floor that only rises, and pass the scaffold's linter; its shell scripts SHALL pass a static shell checker at warning severity.

#### Scenario: Coverage drops

- **WHEN** a change takes script coverage below the floor
- **THEN** the checks fail and name the measured and required figures

#### Scenario: A lint error in the memory worker

- **WHEN** a change leaves an unused variable in the memory worker
- **THEN** the payload checks fail and name the file

<!-- end specs/payload-checks/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 976 -->
## MODIFIED Requirements

### Requirement: Local installation choices survive an update

The install record `.claude/.wong-stack.json` SHALL keep the repo's renamed skills, and SHALL advance to the new source version and commit only after the update is implemented. A renamed skill SHALL be updated in place, never duplicated.

#### Scenario: Renamed skill

- **WHEN** the record maps a WongStack skill to a local name
- **THEN** the update lands in the local skill and no second copy appears

#### Scenario: Plan without implementation

- **WHEN** a sync plan is drafted but not built
- **THEN** the install record still names the old version

## REMOVED Requirements

### Requirement: Relocated wiki pages map safely
**Reason**: No installed repo keeps its wiki pages in another folder; the setting was never used.
**Migration**: A record that still sets the docs folder is ignored, and the pages sync to `wiki/`. Move any relocated pages back under `wiki/` before syncing.

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39156 fence=~~~ -->
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
<title>Review · 2026-09-27-clean-up-drift</title>
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
<body data-change="2026-09-27-clean-up-drift">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-clean-up-drift</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Fifteen releases in two days left pages, rules, and specs that no longer match how WongStack works. A new user reads that setup leaves an existing website alone, when setup only runs in an empty folder, and looks for a button the starter page no longer has. Some automatic checks also miss files they should watch, and one test fails at random.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Pages tell the truth again.</b> The stack pages drop Tailwind, which left in v18, and describe today's preview: the agent hands you a link as soon as it builds. <i>Getting started</i> says setup needs an empty folder, and describes the starter page as it is: your apps and a <i>Learn the development loop</i> box. The contributing page stops saying an update wipes the cached copy. It never does.</div></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Smaller fixes where a page points at nothing.</b> The pipeline page lists the two scripts it missed. The walkthrough stops using a command that doesn't exist. The secrets rule points at the page that holds its rule. The tools page stops citing a &quot;Step 0&quot; that is gone. The design page drops its &quot;Part 1 —&quot; headings.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The wiki rule for agents matches the wiki's own rule.</b> Agents working on a plan write repeatable knowledge to the wiki when they learn it, not only &quot;when wiki work is in scope&quot;.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>&quot;Review page&quot; means one thing.</b> It stays the plan's page with the drawings and <i>+ Note</i> buttons. The pull request gets its own name in chat: <i>the change on GitHub</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">plan ──▶ review page  (drawings, + Note)</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">save ──▶ the change on GitHub</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Specs say each promise once.</b> Three promises written in two specs each keep one copy. The workspace spec loses how-to detail. One save spec stops naming a step that is no longer separate. An unused setting that let a repo keep its wiki pages in another folder is removed.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The automatic checks watch everything they should.</b> The check that catches a switched-off test now watches every workflow file, not just one. Lint and coverage now include the memory service, the mini-app router, and the check scripts. A test that failed at random now waits properly. Dependency updates cover the test tools and every place that names the OpenSpec version, and a test proves those places agree.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> the fixes to how plans and publishing are worded in chat (asking the user, the change loop, <code>/explore</code>) are a separate part in this chat. Release number collisions are their own workspace. No new behavior for users.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which stale pages, spec drift, and check gaps to fix → chose the list settled in the 2026-09-27 audit, carried in this part's brief.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to split the request into parts → chose this part here, publishing-flow fixes next in this chat, and release collisions in their own workspace.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the pull request's plain name in chat is <i>the change on GitHub</i>, because &quot;review page&quot; already means <code>review.html</code>, and the wiki glossary's <i>Pull request</i> entry can say what the agent calls it.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: this part changes only the one phrase at <code>asking-the-user.md:28</code>; the publishing-flow part owns every other edit to that file, and whichever lands second rebases.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: each duplicate pair keeps the fuller copy (<code>ux-wireframes</code>, <code>payload-layout</code>, <code>install-onboarding</code>), because each already covers the other's promise; <code>install-onboarding</code> gains <i>never install a package manager</i>, the one promise only <code>dependencies</code> held.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>docsPath</code> is removed outright and added to the retired names, because no install record sets it (the audit found none) and keeping unused mapping code costs tests and prose.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the flaky test counts a missing key as &quot;not yet&quot;, because returning <code>undefined</code> would satisfy <code>!== key</code> mid-write and hide the race instead of waiting it out.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: if the wider coverage drops below the floor in <code>.c8rc.json</code>, the build adds tests rather than lowering the floor, because the floor only rises.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: this ships as 26.2.0 (or the next minor after <code>main</code>), because it removes an unused setting and fixes text; no command changes.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/scripts/loosened-checks.mjs</code> watches more files, because every workflow file can switch a check off, not only <code>test.yml</code>.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/workflows/payload.yml</code> lints more paths, because the memory worker, check scripts, and mini-app router were unlinted.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>scripts/tests/.c8rc.json</code> measures more files, because the same files were outside coverage.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the <code>path-collision</code> check stays, with a new test for two skills renamed to one local name, because skill renames can still collide once <code>docsPath</code> is gone.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>scripts/tests/wong-sync-preflight.test.mjs</code> deletes the two <code>docsPath</code> tests, because the feature they test is removed.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Checkpoint: tasks 1.1–5.1 built as 26.2.0; spec deltas reconciled into <code>openspec/specs/</code>; local lint, 367 script tests, and coverage (87.9% lines, 83.4% branches) pass. Waiting on CI for task 5.2.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Checkpoint: CI passed on PR #159 (coverage floor included); task 5.2 done, all tasks complete.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Merged <code>main</code> after #160 (26.2.0, releases numbered at publish) took the same number: the entry is now <code>## Next (minor)</code>, <code>VERSION</code> stays at main's, and <code>/ship</code> numbers it before merging. Main's payload check had failed on the flaky envKey test this change fixes; its job was re-run.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no repeatable fact. The live facts are this change's fix and two host or merge-order threads.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint: merged <code>main</code> again after #161 (26.3.0); the release is numbered 26.4.0 from main's 26.3.0. Archived with specs already reconciled.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint: <code>merge.sh</code> reported <code>stale_version=26.4.0</code> after #162 (publishing-flow fixes) took 26.4.0. Merged <code>main</code>; in <code>asking-the-user.md:28</code> kept #162's new sentence and this change's <i>the change on GitHub</i>. Renumbered 26.5.0.</li>
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
