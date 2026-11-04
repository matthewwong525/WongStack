# Tasks

## 1. The morning starts in the worker

- [x] 1.1 In `.agents/skills/daily/scripts/config.mjs`, read an optional `morning` (`"HH:MM"`, default `"08:00"`) and reject another shape; add it to `references/example.json`.
- [x] 1.2 In `.agents/skills/daily/scripts/worker.mjs`, add the morning step to `workerPass`: with a settings file, at or past `morning` local time, and no `morning-<day>.json`, run `start()`, journal one line per started or failed routine, each add-on `line` and each `notRead`, and give add-on `events` to `worker.dispatch`; a dry run prints `wouldStart` from `start({ dryRun: true })`. Pass `hasFile` and `start` into `serveDaily` from `daily.mjs commands().serve`.
- [x] 1.3 In `scripts/tests/daily-worker.test.mjs`, add cases: before `morning` nothing starts; at `morning` one start and its journal lines; a second pass and a second worker start nothing again; no settings file starts nothing; add-on events reach `dispatch`; a dry run starts nothing. In `scripts/tests/daily.test.mjs`, add `morning` settings cases (default, custom, bad shape).

## 2. The Daily chat's code goes

- [x] 2.1 In `.agents/skills/daily/scripts/daily.mjs`, remove `openDaily`, `takeDay`, `dailyRecord`, `picture` and the helpers only it reads, the `start` write of `agentId`, `newDay`, `NEW_DAY`, `journalHook`, the `journal --hook` branch of `main`, and `open-daily`, `picture` and the hook from the usage, `FLAGS` and `NEED_FILE`; `commands().chief` drops `dailyId`.
- [x] 2.2 In `.agents/skills/daily/scripts/chief.mjs`, remove `dailyAgent`, `close`, the `asked` hand source and `OWN_NAMES`; make `chiefEnv(env, call)` give a `WONG_DAILY_RUN` env with no `PASEO_AGENT_ID` the stand-in id `daily-worker`; drop `status`'s `dailyId`; rename `newerDaily` to `newerDay` and the end reason `next-daily` to `next-day`.
- [x] 2.3 In `.agents/skills/daily/scripts/worker.mjs`, remove `boardLine`, `sendDaily`, the `told` queue field, `serveDaily`'s `daily` and `ignore`, and the `dailyAgent` import; fix the `runEnv` comment.
- [x] 2.4 Remove `dailyChat` and `isDaily` from `transcript.mjs`, the `daily` skip from `stop-check.mjs`, `OWN_NAMES` from `finished.mjs`, and `hookOutput` from `journal.mjs`; fix the journal file's header comment.
- [x] 2.5 Remove the `UserPromptSubmit` entry from `.agents/settings.json`.
- [x] 2.6 Add `open-daily` and `daily-workspace.json` to `scripts/retired-names.json`, each with the replacement named.
- [x] 2.7 Update the tests for 2.1 to 2.5: remove the `openDaily`, `dailyAgent`, `close`, `journalHook`, `newDay` and `picture` cases from `daily.test.mjs`, `daily-chief.test.mjs` and `daily-journal.test.mjs`; drop `daily-workspace.json` from `daily-worker.test.mjs`; in `daily-chief.test.mjs`, add `chiefEnv` cases (own id kept; background run gets `daily-worker`; plain terminal stays without an id, so `status` gives `unsupported`); in `daily-stop-check.test.mjs`, a chat that began with `/daily` gets a check-in; in `daily-finished.test.mjs`, a chat named `Daily` outside the main checkout is judged like any other; a board `not-read` journals one line a day and sends nothing.

## 3. Any chat does the daily's asks

- [x] 3.1 Rewrite `.agents/skills/daily/SKILL.md`: frontmatter `user-invocable: false`, no `disable-model-invocation`, a description naming the asks and settings changes; drop steps 1 to 4; *What's going on?* runs `D journal --new`, then `D status` in Paseo, and asks which finished chats to close; keep *Changing settings*.
- [x] 3.2 In `.agents/skills/daily/references/chief.md`, remove *Quick or big*, the Daily chat lines of *What already happened* and *The person's answers*, and the `D close` mention; keep *Brief before you start an agent*.
- [x] 3.3 Rebaseline the context measure once for the new skill description with `node scripts/measure-context.mjs`, keeping the total no larger than before.

## 4. Docs and release

- [x] 4.1 Rewrite `wiki/development/daily.md` for a day with no Daily chat: the opening, *What it does* as the morning start, `morning` in *Your settings file* and what `guide` now covers, *Ask in any chat* in place of *The Daily chat*, *Close finished chats* and *The journal* asked from any chat, the off switch also stopping the morning, and `open-daily` gone. Keep it under 3,000 words.
- [x] 4.2 Fix the other mentions: `wiki/development/README.md`'s daily line, the last sentence of *One task, one workspace* in `wiki/development/the-change-loop.md`, the `daily-routine` definition in `.agents/skills/memory/references/areas.json`, and the `daily-routine` Purpose in `openspec/specs/daily-routine/spec.md`; find the rest with `memory.mjs areas wiki/development/daily.md` and `grep -rn "Daily chat\|/daily\b\|open-daily"` outside archives and `CHANGELOG.md`.
- [x] 4.3 Add a `## Next (major) — Your day runs without a Daily chat` entry to `CHANGELOG.md`, with the **Updating.** step: remove a timer that runs `daily.mjs open-daily`; the morning now starts by itself.

## 5. Verify

- [x] 5.1 Run `node --test scripts/tests/daily*.test.mjs scripts/tests/memory-capture.test.mjs scripts/tests/setup-install.test.mjs scripts/tests/wong-sync-preflight.test.mjs`, `node scripts/measure-context.mjs --check`, `node scripts/check-retired-names.mjs`, `node scripts/check-payload-links.mjs` and `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 5.2 From a plain chat in this worktree, run `D serve --dry-run` (shows `wouldStart` for a due routine when past `morning`, else nothing), `D journal --new`, `D status`, and `D remind` on a past day (refused); each works with no Daily chat. Record the results in the Decision log.
- [x] 5.3 Run `openspec validate no-daily-chat --strict --no-interactive`; it passes.

## 6. Review fixes

- [x] 6.1 Restart a worker from before an update: `beat` records the code stamp (`codeStamp()` in `worker.mjs`, computed once at the worker's start); `D ensure` stops the lock holder whose own beat has no stamp or another one, journals `Restarted the worker: its code changed.`, and starts a new one; a new worker that has not beaten yet is left alone. Tests in `daily.test.mjs` (no stamp, matching stamp, other stamp, not yet beaten) and `daily-worker.test.mjs` (the beat holds the stamp); one sentence in `wiki/development/daily.md`.
- [x] 6.2 The morning re-reads the person's settings each pass through `personSettings`; a read error journals one line per day and skips that pass. Tests in `daily-worker.test.mjs`: a settings file made after the start gets its morning; a changed `morning` counts; a file that can not be read is journaled once and the morning runs once it is fixed.
- [x] 6.3 `wiki/development/wiki-dream.md` says *Ask any chat*; the grep for "Daily chat" outside archives, history entries and this change also found the inbox spec's *Delivered* scenario, fixed by an `inbox` delta. The Decision log's named leftovers stay.
- [x] 6.4 The worker belongs to the main checkout: `workerHome` finds the main checkout's daily scripts (`.agents`, else `.claude`), else this copy's; `D ensure` compares the beat with that folder's stamp and starts that `daily.mjs serve` in the main checkout; the per-pass settings re-read reads the main checkout. Tests in `daily.test.mjs`: a copy whose scripts differ leaves a matching worker alone, and a changed main stamp restarts it there; the spawn's script and folder, and the fallback; the re-read finds the main checkout's settings. One sentence in `wiki/development/daily.md`.

- [x] 6.5 In `daily.mjs ensure`, restart a worker for older code only when the main checkout's `worker.mjs` writes a code stamp, so a main checkout still on the code from before this release is not restarted at each chat start; extend the main-checkout test in `scripts/tests/daily.test.mjs`.
