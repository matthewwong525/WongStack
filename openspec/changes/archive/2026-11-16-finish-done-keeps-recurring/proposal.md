# Proposal

**Status:** shipped
**Branch:** icy-seahorse
**Open questions:** none

## Why

A schedule that repeats with no end date can end for good by mistake. On 2026-11-09 and 2026-11-16, WongOS's frisbee-league run finished with "done" because its own run was done. The app then ended the whole schedule, and it could not be turned on again, so a new schedule had to be made. The run's guide says "done" ends "a met goal", and a run reads that as "this run's goal".

## What Changes

- **A run can't end a repeating schedule with no end.** When a run on such a schedule says "done", nothing is saved and the run still holds its place. It gets a clear message, then finishes again without "done". The schedule keeps its next run.
  ```mermaid
  flowchart TD
    A["Run finishes with done"] --> B{"Schedule has an end?"}
    B -- "yes" --> C["Save progress, end schedule"]
    B -- "no" --> D["Refused: nothing saved"]
    D --> E["Run finishes again without done"]
    E --> F["Next run stays on"]
  ```
- **A run sees "done" only when its schedule has an end.** The last lines of a run's first message offer "done" only beside "Ends when". A schedule with no end shows the finish line without it.
  ```text
  When you stop: node …/schedule.mjs finish
    --key frisbee-league --run 1f…
    [--progress <json file>]
  ```
- **The run's guide says it plainly.** "Done" is only for a schedule with an end, when that end is met. A run never ends its own schedule another way.
- **Every repo gets the fix** at its next update, WongOS included.

## What the build needs

- **Nothing.**

## Non-goals

- No change to how a person ends or cancels a schedule.
- No way to turn an ended schedule back on; the schedules WongOS remade stay as they are.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host-schedules`: a run's finish can't end a schedule that has no end condition, and the run's footer offers `--done` only when it has one.

## Impact

- `.agents/inbox/schedules.mjs` (`finish`): reads the schedule and refuses `--done` with no `until`, before progress is written or the claim released.
- `.agents/plugins/daily/skills/schedule/scripts/lib/hosts.mjs` (`firstMessage`): the footer's `--done` hint only with `until`.
- `.agents/plugins/daily/skills/schedule/references/run.md`: `--done` only for a schedule with an end; a run never calls `end`.
- Tests: `scripts/tests/schedule-hosts.test.mjs`, `scripts/tests/schedule-app.test.mjs`.
- `CHANGELOG.md`: a `## Next (patch)` entry.

## Decision log

- **2026-11-16** — Asked where to fix it → chose here in WongStack, so every repo gets it; WongOS gets it at its next update.
- **2026-11-16** — Asked what a refused `--done` does → chose: refuse with a clear message before progress is saved or the claim released, so the run can finish again without `--done`.
- **2026-11-16** — Asked how a run learns the rule → chose: the footer offers `--done` only with an `until`, and `run.md` says `--done` is only for a schedule with an end and a run never calls `end`.
- **2026-11-16** — Assumed: the release is a patch, because it closes a misuse and adds no new behavior a person uses.
- **2026-11-16** — Assumed: the `end` command stays as it is, because a person still needs it to end a schedule by request.
- **2026-11-16** — Assumed: the finish tests go in `scripts/tests/schedule-cli.test.mjs`, not `schedule-app.test.mjs`, because the existing `finish` test lives there and calls the CLI the run uses.
- **2026-11-16** — Assumed: archived and saved by /ship as 61.9.1; built, reviewed with no findings, local schedule tests pass.
