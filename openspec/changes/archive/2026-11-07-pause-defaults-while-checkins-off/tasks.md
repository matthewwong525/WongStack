# Tasks

## 1. Default schedules follow check-ins

- [x] 1.1 `schedule/scripts/lib/defaults.mjs`: `addDefaults` takes `off`, keeps `off` and `added[key].checkins` in `defaults.json`, pauses untouched running defaults at the off flip, adds new ones paused while off, resumes marked paused ones at on, drops the mark when the person resumed one; `choice()` counts a marked paused default as untouched
- [x] 1.2 `schedule/scripts/schedule.mjs` `defaults`: pass `off` from the person's state folder
- [x] 1.3 `daily/scripts/daily.mjs`: `startDefaults` adds the off state to the stamp; `D checkins off` and `D checkins on` call it after the off file changes
- [x] 1.4 Tests in `scripts/tests/schedule-defaults.test.mjs`: off pauses untouched on defaults and marks them; an added default while off is paused; on resumes marked ones and clears marks; a person-paused, edited or ended default is untouched both ways; a resume while off stays on at the next pass; an update while off keeps it paused
- [x] 1.5 Tests in `scripts/tests/daily.test.mjs`: the stamp changes with the off file, so `ensure` starts `defaults` again; `checkins off|on` start it

## 2. Docs and release

- [x] 2.1 `wiki/stack/host-schedules.md` *Default schedules*: one bullet, a default you did not change waits paused while check-ins are off
- [x] 2.2 `wiki/development/daily.md` *Turn check-ins off*: the default schedules pause and go on again with check-ins
- [x] 2.3 `CHANGELOG.md`: a `## Next (minor)` entry

## 3. Checks

- [x] 3.1 Run `node --test scripts/tests/schedule-defaults.test.mjs scripts/tests/daily.test.mjs` and `node .github/scripts/checks.mjs --worktree`
- [x] 3.2 On a computer with check-ins off, run `schedule.mjs defaults --unattended` and check both defaults show *Paused* in the app (seen on wongos-16gb, 2026-11-07); the resume at check-ins on is covered by tests, not run live
