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
