## 1. Open the chat with its name and its instructions

- [x] 1.1 Export `nameWorkspace` from `.agents/skills/schedule/scripts/workspace.mjs`.
- [x] 1.2 In `.agents/skills/schedule/scripts/lib/hosts.mjs`, replace `startupPrompt` with `firstMessage({ schedule, run, progress })`: instructions first and unchanged, then the footer from the design.
- [x] 1.3 In `startRun` (`lib/app-runs.mjs`), claim progress after `checkRun` and `admit`; a refused claim is `blocked` with reason `busy`; a failed open releases the claim. Pass the progress read to `openSession`.
- [x] 1.4 In `openSession`, send `firstMessage(...)` as the prompt, then rename the workspace with `nameWorkspace(bin, parseCreated(stderr), title, env)` and return its `warning`; `runRound` logs it as `message`.

## 2. End a run with one command

- [x] 2.1 In `.agents/skills/schedule/scripts/schedule.mjs`, add `finish --key --run [--progress <file>] [--done <proof>]`: write progress, end on `--done`, release; refuse when this run does not hold the claim.
- [x] 2.2 Remove `start` and `startedByApp`; drop `progress` and `release` from the command list unless a caller still needs them. Add `schedule.mjs start` to `scripts/retired-names.json`.
- [x] 2.3 Rewrite `.agents/skills/schedule/references/run.md` to the few lines the footer can not carry, and update `.agents/skills/schedule/SKILL.md` and `wiki/stack/host-schedules.md` (*How a run works*, *Where it runs*: the computer pastes the approved text; it still builds the message itself).

## 3. Tests

- [x] 3.1 `scripts/tests/schedule-app.test.mjs`: the fake `paseo` prints `Created workspace wks_1 - main (main)` on stderr; assert `workspace rename wks_1 "Weekly plan"` follows, and the prompt starts with the instructions and ends with the `finish` line.
- [x] 3.2 A rename that fails and a stderr with no workspace line: the run still starts, with a warning.
- [x] 3.3 A claim held by another run: `blocked`/`busy`, no `paseo run` call. A failed open releases the claim.
- [x] 3.4 Instructions `/news`: the prompt's first line is `/news`.
- [x] 3.5 `finish`: writes progress, ends on `--done`, releases; refuses a run that holds no claim.

## 4. Release and checks

- [x] 4.1 Add a `## Next (minor) — A scheduled chat shows its name and starts with your instructions` entry to `CHANGELOG.md`. **Updating.** note: open scheduled chats keep "main"; rename one with `paseo workspace rename <workspace-id> <title>`.
- [x] 4.2 Run `node scripts/measure-context.mjs --check` and `node .github/scripts/checks.mjs --worktree`; fix what fails.
- [x] 4.3 Open one scheduled chat for real through `openSession` with real Paseo, in a scratch repo with a test skill: its workspace shows its name in `~/.paseo/projects/workspaces.json`, its first message is the instructions, and `/ping` as instructions starts that skill. The app's claim and `finish` are checked by tests; the first real run after the update checks them live.
