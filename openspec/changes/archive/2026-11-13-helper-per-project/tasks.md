# Tasks

## 1. One helper per project

- [x] 1.1 Diff `/root/WongOS/.agents/skills/reply-link/scripts/{helper.mjs,lib/computer.mjs,reply-link.mjs}` and its helper log module against this repo's; port only the per-project parts (`projectId`, `helperFiles(env, root)`, `wongstack-helper@.service` and the per-project LaunchAgent, the `--project` launcher, `serve-inbox --project` scoping, `leaveShared` and its watch); verify `node --check` passes on each file.
- [x] 1.2 Make `start` in a project with no helper of its own only restart the shared helper, never call `pointCurrent` on the shared `current.json`; keep `rememberApp`; verify with a `scripts/tests/helper.test.mjs` case where a copy at a higher `PROTOCOL` leaves the shared `current.json` unchanged.
- [x] 1.3 Raise `PROTOCOL` to 16 with its comment, and make `install` answer `HELPER=outdated` below 16; verify in `scripts/tests/helper.test.mjs`.
- [x] 1.4 Port WongOS's tests for the per-project helper into `scripts/tests/helper.test.mjs`, `scripts/tests/live-line.test.mjs` and `scripts/tests/reply-link-inbox.test.mjs`: install and uninstall per project, two projects never claim each other's runs, `leaveShared` moves the folder, ledger and items, one tap goes out once; verify `node --test` on those files passes.
- [x] 1.5 Point `schedule.mjs`'s OK step at the shared `approved.json` as before, with no per-project copy; verify `scripts/tests/schedule-app.test.mjs` passes.
- [x] 1.6 Update `wiki/stack/live-line.md` (one helper per project, the shared one's role, `helpers/<id>/` paths and log, install at a quiet minute, never moved between copies) from WongOS's page; verify the wiki checks pass.

## 2. A refusal for no sign-in says so

- [x] 2.1 In `.agents/inbox/runs.mjs`, return `not_signed_in` from `checkRun` when no one is signed in, and from `checkHandedRun` when `app.email(origin)` is null; keep `not_approved` for another person or no OK; update `scripts/tests/schedule-app.test.mjs` line 55 and `scripts/tests/daily-schedule-runs.test.mjs` with a no-sign-in case; verify both pass.
- [x] 2.2 Add `not_signed_in` to `WHY` in `app/src/apps/inbox/cadence.ts`; add cases in `cadence.test.ts` and `Schedules.test.tsx` that it shows "didn't start, this computer isn't signed in" with no "needs your OK"; verify the app tests pass.
- [x] 2.3 Name `not_signed_in` beside `not_approved` in `wiki/stack/host-schedules.md` where it lists why a run doesn't start; verify the wiki checks pass.

## 3. Release note

- [x] 3.1 Write the `CHANGELOG.md` entry with an **Updating.** line: say yes to `node .claude/skills/reply-link/scripts/helper.mjs install` at a quiet minute in each project that used the shared helper; verify the release check passes.

## 4. Checks

- [x] 4.1 Run the repo's local checks for the changed code, app and wiki (`slot.mjs --run precheck`); verify they pass. CI runs at `/ship`'s save.
