# Tasks

## 1. The 15-minute wait

- [x] 1.1 In `.agents/skills/daily/scripts/chief.mjs` `notice()`, keep the hold across the agent's later runs and stops until it ends; a new person message restarts it.
- [x] 1.2 In `scripts/tests/daily-chief.test.mjs`, test: typed 9:56, stop 10:01, runs, stop 10:05 → no `stopped` line before 10:11, one after; a new message at 10:08 moves it to 10:23.

## 2. Headless runs

- [x] 2.1 Move `agentCommand`'s Claude and Codex builders from `.agents/skills/memory/scripts/run.mjs` into a shared lib with a mode for the memory run's narrow permissions and the daily run's full ones; the memory run keeps its exact arguments.
- [x] 2.2 Test both modes' argument lists and the memory run's unchanged list.

## 3. Journal and worker

- [x] 3.1 Add `.agents/skills/daily/scripts/journal.mjs` from WongOS's: add, read, prune, hook output; the hook reads the Daily agent from `dailyRecord` and skips a run (`WONG_DAILY_RUN`).
- [x] 3.2 Add `.agents/skills/daily/scripts/worker.mjs` from WongOS's: dispatch, timed sweeps, pump, reap, tidy, boot; lanes and `ownPlace` from the list; the AI tool from `runs.agent`; the install's list merged over `references/sweeps.json`; briefs from the install's folder first.
- [x] 3.3 Add `references/sweeps.json` (judge on `stopped` and `asking`, held) and `references/briefs/header.md` and `judge.md`, with no WongOS name or email job.
- [x] 3.4 In `chief.mjs` and `daily.mjs`, `serve` runs the worker; delete `sendBatch`, `BATCH` and the outbox; add `D journal [--new]`; settings accept `sweeps` and `runs.agent` in `config.mjs`.
- [x] 3.5 Add the `UserPromptSubmit` hook to `.agents/settings.json`.
- [x] 3.6 Tests from WongOS's `journal.test.mjs` and `worker.test.mjs`, adapted: merge and brief lookup, lanes, the 3-run cap, the 30-minute stop, the board line once a day, a missed timed job, the hook in and out of the Daily chat, a restart's unfinished run.

## 4. Words

- [x] 4.1 `.agents/skills/daily/SKILL.md` step 4 and `references/chief.md`: the journal in place of `Watch ·` messages; another AI tool runs `D journal --new` per message.
- [x] 4.2 `wiki/development/daily.md`: replace "The watch on a computer" with the worker, the journal, adding a job, and a service file example with `EnvironmentFile=-/etc/environment` for `IS_SANDBOX=1`; keep the page under 3,000 words.
- [x] 4.3 `CHANGELOG.md` `minor` entry, with the WongOS migration steps from the design.

## 5. Verify

- [x] 5.1 Run the daily and memory tests and the payload checks; run `daily.mjs serve --dry-run` once on this computer and read its output.
- [ ] 5.2 `/save`, and check the gate passes.
