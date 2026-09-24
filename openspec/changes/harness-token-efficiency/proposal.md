# Measure billed cost per task and fix the failing PR-body update

**Status:** ready-to-ship
**Branch:** optimize-agent-harness-tokens
**Open questions:** none

## Why

The user asked to lower the price-weighted token cost per completed task with no loss of quality, and to measure before changing anything. The repo could not do that: `scripts/measure-context.mjs` counts source words and states that it is not a runtime token estimator. The measurement found one payload defect that repeats on almost every checkpoint. `gh pr edit` failed on 36 of 43 recorded calls, left the old PR body, and cost recovery turns at about 220k tokens of context.

## What Changes

- New meta-only `scripts/measure-usage.mjs` reads Claude Code transcripts and reports billed cost per task. A task is one main session plus its subagents. The report splits cost by billing type (input, 5-minute and 1-hour cache writes, cache reads, output), model, active skill, and main thread vs subagents. It gives prefix rewrites by cause (idle over 1 hour, idle 5–60 minutes, model switch, other) and an estimated context-source split. Unknown models are listed, not priced by a guess. A fixture test covers pricing, request dedupe, chunk placement, miss causes, and subagent roll-up.
- The git gate updates an open PR's body through the REST endpoint, `gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR_NUMBER" -F "body=@$BODY_FILE"`, not `gh pr edit`. `gh pr create --body-file` still opens a new PR. `VERSION` goes to 16.7.1, with a `CHANGELOG.md` entry. (review.html#/pr-body)
- `notes/harness-token-efficiency.md` records the baseline and the ranked levers that this change does not apply.

**Non-goals:** Trim skill bodies or the `WONG-STACK` block; make the eager rule imports lazy; change which model a subagent uses; ship the measurement script to targets. These are ranked proposals in the note, each to be planned and evaluated on its own.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `context-economy`: billed usage is measurable per task from recorded transcripts.
- `checkpoint-helpers`: an open PR's body is published through the REST endpoint.

## Impact

New `scripts/measure-usage.mjs` and `scripts/tests/usage-measurement.test.mjs`, which are meta-only and not in `payload-files.json`. `.claude/skills/save/references/git-gate.md`, `VERSION`, `CHANGELOG.md`, and `notes/harness-token-efficiency.md`. Targets get the git-gate fix on their next `/wong-sync`. The REST call needs only the `gh` that `/save` already requires.

## Decision log

- **2026-09-24** — The user asked for lower cost per completed task: map and measure first, then rank, change only what is safe directly, and keep the rest behind flags or in proposals. The harness in reach is the WongStack payload. Claude Code owns request assembly, tool schemas, cache breakpoints, and compaction.
- **2026-09-24** — Measured 858 transcripts ($4,637) on this machine. Cache reads are 54% of cost, cache writes 32%, output 14%. The WongStack payload controls about 5–7% of cost directly. Full baseline: `notes/harness-token-efficiency.md`.
- **2026-09-24** — Made two changes directly: the telemetry, and the fix for a recurring tool error. Skill-body trims, lazy rule imports, and the `WONG-STACK` block diff stay as flagged proposals, because they change prompts and need an eval. A cheaper model for the review author is proposal-only, because it is a model choice.
- **2026-09-24** — Chose the REST `PATCH` for PR-body updates over requiring a newer `gh`. `notes/add-update-dependencies-skill.md` had recorded that workaround but never put it in the payload. The agent already fell back to it after each failure. It was checked on `gh` 2.46 against GitHub's side-effect-free `/markdown` endpoint: `-F text=@file` sends the file verbatim.
- **2026-09-24** — Did not reopen the 2026-09-02 decision to keep the `wiki-style.md`, `voice.md`, and `notes/README.md` imports eager. The note gives the data for reopening it: 49% of sessions that load them write no wiki or notes file.
- **2026-09-24** — Tests: the 4 new cases pass. Of the other script suites, only `review.test.mjs` fails locally, because it needs `jsdom` from `app/node_modules`; CI installs it. The payload link check and the OpenSpec config check pass.
- **2026-09-24** — `/ship` found no change record for this branch. The session established code, so the change was authored at ship time through `/save`'s new-plan fallback.
