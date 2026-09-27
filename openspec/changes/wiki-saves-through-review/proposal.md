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

- `delivery-gate`: the prose exception is removed; every save that changes a file takes a branch, a pull request, and the gate, and needs an OpenSpec change only for code. `/ship` merges a branch that needed no change without an archive. No surface may describe a path-specific save route.
- `people-wiki`: *The agent writes what it learns* — a wiki edit is saved like any other file, through a pull request, not straight to `main`.
- `dependency-currency`: a scenario's reason drops its mention of the prose allowlist.
- `open-source-release`: the ruleset no longer names an owner bypass for prose saved straight to the default branch.
- `context-economy`: the prose save route is named the facts-only save.
- `payload-checks`: the payload workflow skips lint, shell checks, and the script suite (except the private-names scan) when every changed path is under `wiki/` or `openspec/`.

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
