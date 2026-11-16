# Design

## Context

`finish` in `.agents/inbox/schedules.mjs` (~line 104) checks the claim, writes progress, posts `schedule-end` when `--done` is given, then releases the claim. It never reads the schedule, so `--done` ends any schedule, a recurring one with `until: null` included. The app's `schedule-end` is final: `resume` and `save` of an ended key are refused. `firstMessage` in `.agents/plugins/daily/skills/schedule/scripts/lib/hosts.mjs` (~line 47) prints `[--done <proof the end is met>]` on every footer. `run.md` says `--done` "ends a met goal".

## Goals / Non-Goals

**Goals:** a run can't end a schedule that has no `until`; a refused finish leaves everything as it was, so a second `finish` works; a run is never told about `--done` when it can't use it.

**Non-Goals:** changing `end` or `cancel`; reopening ended schedules; any app (Worker) change.

## Decisions

- **Refuse in the computer's `finish`, not in the app.** The store already reads the schedule through `readSchedule`/`found`, and the shipped helper reaches every repo at its next update. An app-side guard would also block a person's own `end`, which must stay.
- **Order: claim check, then the `until` check, then progress, end, release.** Refusing before `progress.write` and `progress.release` keeps the run's claim and the stored progress untouched, so the run reruns `finish` without `--done`. Use `requireValue`/`ScheduleError` with a message such as: `This schedule has no end, so a run can't end it. Finish again without --done.`
- **Gate on `held.schedule.until`, not on timing mode.** A one-time schedule ends after its run anyway; a recurring one with an `until` keeps its met-goal ending. Only `until` says the person approved an end a run may judge.
- **Footer: print `[--done <proof the end is met>]` only when `schedule.until` is set**, beside the `Ends when` line it already gates.

## Risks / Trade-offs

- A run on a schedule with no `until` whose work truly is over can't end it; it says so in its report and the person ends it. This is the wanted trade.
- One more app read per finish; it is small and only at the end of a run.

## After the merge

- At WongOS's next update, check the next frisbee-league run's first message has no `--done` and its schedule stays active after it finishes.
