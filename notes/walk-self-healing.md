---
slug: walk-self-healing
started: 2026-08-09
updated: 2026-08-09
consolidated:
---

# Walk self-healing (and the ship/CI change it split from)

One `/explore` session produced **two** changes. This note covers both, because the reasoning is
shared and the second one is planned but not yet implemented.

## What the user asked for

Four asks, across the conversation:

1. `/ship` should run `/walk` "instead of generic integration tests", and the skill should be less
   repetitive and more concise.
2. `/walk` should use "the cloudflare session token if it's blocked" — resolve its own auth errors.
3. `/walk` shouldn't load Playwright at all for pure-backend changes.
4. `/ship` should run the tests, "or maybe we have the tests run as part of the CI/CD if it doesn't
   already do that". Plus: a parallel vitest pipeline on every save, and "maybe on every save we also
   implement vitest tests and build them as we continue working on our repo" — explicitly asking for
   thoughts rather than dictating.

On (2) the user clarified what they meant: *"it's doing the browser access and using browser run…
sometimes it doesn't have access and doesn't know that it can get access through cloudflare."* So
"session token" meant **the walk not knowing it can grant itself access**, not a literal session
cookie. That reading is what produced the two heal paths.

## Corrections that changed the shape

- **`/ship` runs no integration tests today** — it doesn't test at all. The premise of ask (1) was
  wrong, so there was nothing to swap out; the real ask was "add a walk to `/ship`." Worth
  remembering before implementing change B.
- **The pack's `deploy.yml` runs no tests either** — build and deploy only. That confirmed the
  user's own instinct in ask (4): tests belong in CI, where the gate already is.
- **`/ship` walking was tried before and removed**, recorded in `wiki/stack/staging-walkthrough.md`
  under the declined options. What was declined was the walk **as a merge gate** — a walk that
  couldn't run had to block, retries shared `/ship`'s budget, and the only moment you could see your
  app was the moment you were done. Change B threads this by making it an *evidence step*: unrunnable
  walks never block, and a `FAILURE` pauses for a user decision with "merge anyway" first-class.
  When implementing, revise that recorded entry rather than deleting it.

## The one push-back the user accepted

The user floated `/save` authoring vitest tests on every save. Recommended against it, and they
agreed ("sounds good"). Three reasons, worth keeping because the idea will recur:

1. `/save` is the checkpoint verb; a checkpoint that mutates code isn't a checkpoint.
2. Tests written at save time rubber-stamp code written minutes earlier, in a hurry to push.
3. It would slow every save, including prose-only ones.

The intent — coverage grows as a side effect of normal work — lands one step earlier instead:
`/plan` puts a test task in every behavioral change, `/apply` writes the tests while implementing
(richest context), and CI enforces them forever after. Net practice: **every `/apply` grows the
suite, every `/save` proves it still passes.**

## Decisions taken while designing change B (not yet built)

- **Parallel job inside `deploy.yml`, not a second workflow file.** Jobs in one workflow already run
  in parallel, and the existing workflow owns the `push`/`pull_request` double-fire collapse; a
  second file would have to duplicate that dedup or fire twice per commit.
- **`deploy` must not `needs: test`.** A staging deploy of red code is harmless (staging is a
  fixture, the walk observes it) and red code can't reach production because merges need green CI.
- **The gate grows a rung for free.** `/save` already waits on all checks and auto-fixes failures,
  so the moment the `test` job exists, every save enforces green tests with no new skill logic.
- The division of labor the user named and agreed with: **vitest = not end-to-end, accumulates in
  CI, gates; `/walk` = end-to-end, this change's scenarios only, gates nothing.**

## Repo facts worth not rediscovering

- **`.claude/skills/` and `.agents/skills/` are the same files** — hardlinked, identical inodes. Git
  tracks `.agents/skills/`; `git status` reports edits there even when you edited the `.claude/`
  path. Stage `.agents/skills/...`.
- `walk-runner.mjs` already exits **3** on an Access challenge and **4** on a Browser Run token
  refusal. Both signals predate this work — the walk was detecting the blocks it couldn't fix.
- `check-payload-links.mjs` reports *conditional* links (resolve only in some install shapes)
  separately from dead ones and exits non-zero only on dead. Conditional output is normal; 11 of them
  are pre-existing.

## What shipped where

Both changes were implemented in this session:

- **`walk-self-healing`** → branch `walk-self-healing`, PR #58, v9.8.0, CI green.
- **`ship-walks-and-ci-tests`** → branch `ship-walks-and-ci-tests`, **stacked on** `walk-self-healing`
  rather than cut from `main`, because both edit `wiki/stack/staging-walkthrough.md` and the walk
  skill. Its PR is based on the first branch, so **#58 must merge first** and the second PR's base
  then needs retargeting to `main` (GitHub does this automatically on merge of the base branch).

## Open threads

- Branch `walk-token-fallback` was the session's starting branch and was never used — it has no
  commits ahead of `main`. Work moved to `walk-self-healing` to keep branch name = change name.
  Nothing was lost; it can be deleted.
- **Neither change is walkable in this repo** — WongStack is the payload source and has no app, so
  `/walk` answers `NONE` here. The new `test` job likewise reports "no test script" and exits green.
  Both are exercised for real only in a target repo that took the stack pack.
- The `/ship` skill ended up **net longer** (82 lines vs 75) despite the concise rewrite, because it
  gained a whole step. The repetition the user objected to is gone — the never-test/never-walk stance
  went from five restatements to two. Don't "fix" the line count by deleting Step 4.
