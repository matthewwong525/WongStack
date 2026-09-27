# Build each change in a fresh helper

**Status:** in-progress
**Branch:** explore/paseo-compact-before-apply
**Open questions:** none

## Why

When you say "build it", the assistant builds in the same conversation where you planned. That conversation already holds about 120k tokens of planning talk, and every build step carries it along. Over 127 past builds, the conversation doubled to about 300k by the end. Nothing ran out of room, but each step costs more, and the leftover talk crowds the assistant's focus. The plan is already saved in files, so a fresh helper can build from those alone.

## What Changes

- **A fresh helper does the building.** After the plan is ready, the assistant hands the change to a helper agent that starts empty. The helper reads the plan files, builds each task, and ticks it off. The conversation you're in gets back a short report, not every file the helper opened.
  ```text
  you: build it
     │
     ▼
  this chat: find the plan
     │
     ▼
  helper (fresh): read plan,
    build tasks, tick them off
     │  short report
     ▼
  this chat: preview link,
    "publish it?"
  ```
- **You talk to the same assistant as before.** The preview link, the loosened-checks list, and the *publish it?* question still come from the conversation you're in. Small follow-up tweaks after the preview are made there too.
- **Questions still reach you.** A helper can't ask you anything. When it hits something unclear, or a task that needs a save, it stops and hands back. The assistant asks you or saves, then starts a new helper for the tasks left.
- **Every build works this way.** That includes a build that *publish it* or picking up saved work starts. An AI tool that has no helper agents builds in the conversation, as now.
- **The usage report shows the saving.** It gains one table: how full the conversation is when each step starts, and at its peak. Run it before and after to see the difference.

Non-goals: no automatic `/compact` (only you can type it); no helper for planning, saving, or publishing; no change to what gets built or checked.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply-plan-handoff`: adds a requirement that `/apply` works the tasks in a fresh helper agent, and returns to the parent on a question, blocker, or gate task.
- `context-economy`: `Billed usage is measurable per task` adds a main-thread context-by-skill view (tokens at a skill's first turn and at its peak).

## Impact

- `.agents/skills/apply/SKILL.md`: the task-working paragraph becomes *Build in a helper*; follow-up edits stay inline.
- `.agents/skills/apply/references/build-helper.md` (new): the helper's brief, read only by the helper.
- `wiki/development/the-change-loop.md`: the `/apply` line says it builds in a helper.
- `scripts/measure-usage.mjs` and `scripts/tests/usage-measurement.test.mjs` (meta-only): the context-by-skill view and its test.
- `VERSION` 25.10.1 → 25.11.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked whether to run a Paseo compact before building or build in a helper → chose build in a helper, with this conversation keeping the preview, questions, and report.
- **2026-09-27** — Asked when to use the helper → chose always, for one predictable path.
- **2026-09-27** — Asked whether to measure first → chose yes. Baseline over 127 past `/apply` sessions: main-thread context at build start median 119k (p90 203k); peak median 297k (p90 520k); 2 of 127 compacted.
- **2026-09-27** — Assumed: no automatic compact, because Paseo has no compact command and `/compact` is a built-in only the person can type; sending it to the agent's own id through `paseo send` is untested and needs a second message to resume.
- **2026-09-27** — Assumed: the helper's brief lives in `apply/references/build-helper.md` and the parent passes its path with the change name, because the brief then loads only in the helper, not in every `/apply`.
- **2026-09-27** — Assumed: the helper stops and returns on ambiguity, a blocker, or a gate task, and the parent asks or runs `/save` and then starts a new helper for the remaining tasks, because a subagent could not see the ask tool on 2026-09-15 and git stays with the parent's `/save`.
- **2026-09-27** — Assumed: planning, the preview, the loosened-checks fix, and the report stay in the parent, because they are short or need the person.
- **2026-09-27** — Assumed: follow-up edits after the preview run in the parent, because they are small and conversational; a follow-up that adds tasks to `tasks.md` goes through a helper.
- **2026-09-27** — Assumed: a host with no helper agents, or an `/apply` already running inside a helper, builds inline, because nesting may be unavailable.
- **2026-09-27** — Assumed: the helper uses the parent's model, because a cheaper model could lower build quality.
- **2026-09-27** — Assumed: the helper's brief forbids deleting caches and running global installers, because a read-only audit subagent deleted the Playwright cache on 2026-09-25.
- **2026-09-27** — Assumed: the measurement becomes a context-by-skill view in `measure-usage.mjs`, because a before/after check should be one repeatable command, not a throwaway script. The after-check needs real builds, so `/ship` records it as an open thread.
- **2026-09-27** — Assumed: a minor release, 25.10.0, because it changes how the payload's `/apply` works.
- **2026-09-27** — Built: `/apply` gains *Build in a helper*, and the helper's brief is `apply/references/build-helper.md`; the change-loop `/apply` line links it. `measure-usage.mjs` prints main-thread context by skill; its first run put `/apply` at 119k start and 149k peak (median over 128 sessions), and `/save` at 200k start, so the saving also reaches the steps after a build. Main reached 25.10.1 meanwhile, so this release is 25.11.0, not 25.10.0. Payload link, config, and retired-name checks, strict validation, and 323 script tests passed.
