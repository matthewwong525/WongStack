# Tasks

## 1. Daily start (`.agents/skills/daily/scripts/daily.mjs`)

- [x] 1.1 Add `defaultsStamp`, `defaultsDone` and `defaultsFailed` beside `defaultsFile`, per design.md *One helper records the outcome*
- [x] 1.2 Move the marker write out of the shared start into `startMoveIn` (unchanged behavior), and give `startDefaults` the five steps of design.md *When `startDefaults` starts a try*, with `RETRY_MS` one hour; stamp a try from the list of the copy whose `schedule.mjs` it starts
- [x] 1.3 Wrap the `defaults()` calls of `checkins off` and `checkins on` in `commands` in `try/catch`
- [x] 1.4 In `scripts/tests/daily.test.mjs`, update the `startDefaults` test and add cases: a start writes `tried` and no `day`/`stamp`; a second start within the hour starts nothing; a `tried` over an hour old journals *stopped with no result* and starts again; a fresh `failed` waits an hour for the same stamp but not for a changed one; a running try does not hold back a changed stamp; the stamp comes from the started copy's list; `startMoveIn` still starts once a day; `checkins off`/`on` answer when the start throws

## 2. Schedule `defaults` (`.agents/skills/schedule/scripts/schedule.mjs`)

- [x] 2.1 In `defaults()`, record the outcome per design.md *The child's outcome*: no sign-in and a throw (unattended) and `failed`/`refused` results go to `defaultsFailed`; all-good results go to `defaultsDone`, attended or not; a dry run records nothing
- [x] 2.2 In `scripts/tests/schedule-defaults.test.mjs`, add cases: a run where every default works writes today's `day` and the current `stamp` and deletes `tried`/`failed`; a run marks the stamp it started with; a default the app refuses leaves no `day`, writes `failed` and one journal line naming the key and reason; a chat run with a refusal marks nothing; a throw is journaled unattended and is an error in a chat; the no-sign-in case keeps its one line a day and now writes `failed`

## 3. Docs and release

- [x] 3.1 In `wiki/stack/host-schedules.md#default-schedules`, add one bullet: a setup that fails writes its reason in the journal and tries again at a chat start about an hour later
- [x] 3.2 `CHANGELOG.md`: a `## Next (patch)` entry

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/daily.test.mjs scripts/tests/schedule-defaults.test.mjs`
- [x] 4.2 Run the payload checks and the script suite: `checks.mjs --worktree` waited on another chat's lock, so each step ran by hand (oxlint, payload links, OpenSpec config, retired names, attachments, `openspec validate --specs`, `measure-context.mjs --check`, and the full `c8` script suite: 2,637 pass, 0 fail)
