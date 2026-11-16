# Tasks

## 1. Store

- [x] 1.1 In `.agents/inbox/schedules.mjs` `finish`, after the claim check, read the schedule (`found(client, key)`) and, when `values.done` is set and the schedule has no `until`, throw a `ScheduleError` saying a run can't end a schedule with no end and to finish again without `--done`, before any progress write, end, or release.
- [x] 1.2 Add tests in `scripts/tests/schedule-app.test.mjs` with the fake app: `finish --done` on a recurring schedule with no `until` fails, leaves the schedule not ended, the progress unchanged and the claim held, and a second `finish` without `--done` releases it; `finish --done` on a schedule with an `until` saves progress, releases the claim, and ends it.

## 2. Run footer

- [x] 2.1 In `.agents/plugins/daily/skills/schedule/scripts/lib/hosts.mjs` `firstMessage`, add `[--done <proof the end is met>]` to the `When you stop` line only when `schedule.until` is set.
- [x] 2.2 Update `scripts/tests/schedule-hosts.test.mjs`: a footer with `until` offers `--done`; one with no `until` offers `--progress` and no `--done`. Update the finish-line assertion in `scripts/tests/schedule-app.test.mjs` ("a run's chat opens at medium thinking…") to match a schedule with no `until`.

## 3. Docs and release

- [x] 3.1 In `.agents/plugins/daily/skills/schedule/references/run.md`, say `--done <proof>` is only for a schedule with an end (*Ends when*), when that end is met, and that a run never runs `end`.
- [x] 3.2 Add a `## Next (patch) — A run can't end a repeating schedule by mistake` entry to `CHANGELOG.md`, with an **Updating.** note: nothing to do by hand; a schedule ended this way stays ended, so save it again under a new key.

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/schedule-app.test.mjs scripts/tests/schedule-hosts.test.mjs scripts/tests/daily-module.test.mjs`, `node scripts/check-payload-links.mjs`, and `node scripts/measure-context.mjs --check`; fix what fails.
