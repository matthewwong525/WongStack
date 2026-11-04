## 1. Settings without a file

- [x] 1.1 In `.agents/skills/daily/scripts/config.mjs`, add `defaultSettings({ email, timezone })` by the design; test it in `scripts/tests/daily.test.mjs`, including an email with dots and a plus.
- [x] 1.2 In `daily.mjs`, export one resolver for the person's settings, the given file or the defaults, and use it in `main()` for every command but `start`, `picture`, `start-task` and `remind`, which keep the "No daily settings" error; the sign-in email when `valid` or `near`, else the git email. Test both paths and the kept error.

## 2. The stop step's check

- [x] 2.1 Add `.agents/skills/daily/scripts/stop-check.mjs` by the design: the skips (background runs, off, the Daily chat, `ask-check`'s block), the person's turn under 15 minutes, the streak file, one headless judge with a 240-second kill, the block answer, and a journal line each time. Inject the clock, the spawn and the state folder for tests.
- [x] 2.2 Read the person's last message and the transcript's tail for Claude Code and Codex rows, reusing `memory/scripts/lib/transcripts.mjs` and the row shapes `apply/scripts/helper-stop-check.mjs` reads; tool results and hook text are not the person's message.
- [x] 2.3 Add `.agents/skills/daily/references/briefs/stop-judge.md` and a short "From the stop step" section in `references/chief.md`: no `D reply`, end with the JSON line.
- [x] 2.4 In `.agents/settings.json` and `.agents/hooks.json`, add the `Stop` entry running `stop-check.mjs stop --agent claude|codex` with `"timeout": 300`; keep `mark` and `ask-check`.
- [x] 2.5 Write `scripts/tests/daily-stop-check.test.mjs`: away 40 minutes and a named next step → block with the reply; a message 5 minutes old → nothing and the streak reset; the sixth stop in a row → nothing and a journal line; off → nothing; a `/daily` chat → nothing; `WONG_DAILY_RUN` → nothing; a timeout, a bad end line, and a judge error → nothing; `ask-check` blocking → nothing; a Codex transcript → the same answers as Claude Code.

## 3. The worker, kept running when needed

- [x] 3.1 In `worker.mjs` or `daily.mjs serve`, take `<state>/serve.lock` with the pid; take over a dead pid's or stale beat's lock; a second `serve` exits 0 with one stderr line; add `serve --agent claude|codex`, with the settings' `runs.agent` winning. Test the take, the refusal and the takeover in `scripts/tests/daily-worker.test.mjs`.
- [x] 3.2 Make `serveDaily` keep running timed sweeps when Paseo is absent, skipping the chat watch, board to-dos and hands; test with a failing `paseoCli`.
- [x] 3.3 Add `D ensure` by the design, returning `{ state: 'started'|'running'|'off'|'no-jobs'|'no-person'|'run' }`; test each state with an injected spawn.
- [x] 3.4 Add `D checkins off|on`: `off` writes `<state>/off`, stops the lock's pid and journals a line; `on` removes it and runs `ensure`. Test both, and that `ensure` and `stop-check` do nothing while off.
- [x] 3.5 In `.agents/skills/memory/scripts/session-start.mjs`, call `ensure` inside a try, adding no output or time; test that a memory run and a daily run start no worker.
- [x] 3.6 In `chief.mjs` `admit()`, take a chat only when its `cwd` has this repo's git common dir, cached per cwd; started and handed rows stay from any folder. Test a chat in a Paseo worktree of this repo (taken), one in another repo (skipped), and one whose folder is gone (skipped) in `scripts/tests/daily-chief.test.mjs`.

## 4. The Daily chat stops watching

- [x] 4.1 Remove the `stopped` and `asking` events from `references/sweeps.json`.
- [x] 4.2 Remove the `watch` CLI command and `--hours`, the non-service `end('time')` and `end('empty')` paths, and `passes()`'s `serviceAlive` check; keep `watch()` for the worker. Update `scripts/tests/daily-chief.test.mjs` and `daily.test.mjs`; add `daily.mjs watch` to `scripts/retired-names.json` and run `node scripts/check-retired-names.mjs`.
- [x] 4.3 `.agents/skills/daily/SKILL.md` step 4 and `references/chief.md`: `D ensure`, then the journal; *stop check-ins* and *start check-ins* run `D checkins off|on`; cut words elsewhere so `node scripts/measure-context.mjs --check` passes.

- [x] 4.4 In `daily.mjs` `journal --hook` and `journal.mjs` `newLines`, know the Daily chat by its transcript's first message and keep its place by `session_id`; on the first message of a day with no morning run, add the new-day line. Test in `scripts/tests/daily-journal.test.mjs`: a Daily chat outside Paseo gets its lines; another chat gets none; Tuesday's first message gets the new-day line, the second gets none, and a `/daily` message gets none.
- [x] 4.5 `.agents/skills/daily/SKILL.md`: one line saying the new-day line runs steps 2 and 3.

## 5. Words

- [x] 5.1 `wiki/development/daily.md`: each chat checks its own stops, with or without Paseo; what waits for the person; a settings file is optional for check-ins; turning check-ins off; one Daily chat kept open for days; the worker starts at chat start only for board to-dos, add-ons and own jobs, and the service file stays an option. Keep the page under 3,000 words, and run `node scripts/check-payload-links.mjs`.
- [x] 5.2 `CHANGELOG.md` `## Next (minor) — Check-ins for everyone, with or without Paseo`, with an Updating note in plain words: check-ins now come from each chat; a computer that runs the daily as a service keeps it; an install that added its own `stopped` or `asking` job keeps it.

## 6. Verify

- [x] 6.1 Run the daily and memory tests and `node .github/scripts/checks.mjs --worktree`.
- [x] 6.2 On this computer, run `D checkins off` in this checkout first (WongOS's worker still judges every chat here). In a scratch checkout, outside Paseo, run one Claude Code chat and one Codex chat each to a stop with a named next step while the last person message is over 15 minutes old (set by the test clock or a waited turn), and confirm each carries on, writes a journal line, and that a fresh message makes the next stop wait.
- [ ] 6.3 `/save`, and check the gate passes.
