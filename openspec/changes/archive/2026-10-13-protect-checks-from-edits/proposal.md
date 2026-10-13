# Checks the assistant can't quietly change

**Status:** in-progress
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
