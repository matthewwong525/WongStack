# Tasks

## 1. Code

- [x] 1.1 In `app-runs.mjs`, make `openSession()` open a worktree from the fetched default branch, or a local workspace when the folder is not git or no default branch can be named; keep the schedule label; rename the workspace from Paseo's *Created workspace* line; return fetch and rename problems as `warning`. `runRound()` logs the warning and leaves it out of the run result.
- [x] 1.2 In `workspace.mjs`, export `defaultBranch`, `freshBase` and `nameWorkspace`; make `freshBase`'s fetch asynchronous with an optional `timeout`, which `openSession()` sets to 60 seconds.
- [x] 1.3 In `helper-log.mjs`, add `warning` to the allowed fields, kept to 1,000 characters.

## 2. Tests

- [x] 2.1 In `scripts/tests/schedule-app.test.mjs`: a git project opens a branch-off worktree from `origin/main` and is renamed; a non-git folder opens local and is renamed; a refused rename still starts with a warning; a git project with no default branch opens local with both warnings; the warning reaches the helper's real log and never the app; a hung fetch stops at its timeout.
- [x] 2.2 In `scripts/tests/helper.test.mjs`: a run's warning keeps 1,000 characters, other fields 200.

## 3. Words

- [x] 3.1 Update the **Chat** line in `wiki/stack/host-schedules.md` and `wiki/stack/live-line.md#the-log`.
- [x] 3.2 Add a `## Next (minor) — Scheduled chats open in their own named workspace` entry to `CHANGELOG.md`.

## 4. Checks

- [x] 4.1 Run `node scripts/payload-checks.mjs` and the script tests; fix what fails.
