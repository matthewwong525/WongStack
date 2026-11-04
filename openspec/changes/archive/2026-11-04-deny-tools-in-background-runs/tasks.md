# Tasks

## 1. The run command and the worker

- [x] 1.1 In `.agents/skills/memory/scripts/lib/headless.mjs`, add `deny` to `headlessCommand` by design decision 2; in `scripts/tests/daily-worker.test.mjs`, assert a full Claude run with `deny` ends with `--disallowedTools` and the patterns, and that an empty or absent `deny`, a narrow grant, and Codex get no such option.
- [x] 1.2 In `.agents/skills/daily/scripts/worker.mjs`, check `deny` in `loadSweeps` and pass `sweeps.deny` from `start`, failing closed for Codex, by design decisions 1 and 3; in `scripts/tests/daily-worker.test.mjs`, assert a bad `deny` throws the bad-entry error, an install's `deny` reaches the launched args for a timed job and an event, and a Codex worker with `deny` launches nothing and journals `Not started: … the deny list works only with Claude Code`.

## 2. Docs and release

- [x] 2.1 In `wiki/development/daily.md#your-own-jobs`, add a `deny` bullet: what it holds, an example, that it reaches every background run, and that it is Claude Code only, with Codex starting no run; check `node scripts/check-payload-links.mjs` passes.
- [x] 2.2 Add a `## Next (minor) — Background runs can be denied tools` entry to `CHANGELOG.md`, with no hand step.

## 3. Verify

- [x] 3.1 Run `node --test scripts/tests/daily-worker.test.mjs` and `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 3.2 Run `claude -p` with `--permission-mode bypassPermissions --disallowedTools "Bash(*deny-probe*)"` asking it to run `echo deny-probe`, and confirm the tool is refused, while `echo other` runs.

## 4. Review fixes

- [x] 4.1 In `wiki/development/daily.md`, the `CHANGELOG.md` entry and `specs/daily-routine/spec.md`, say the list reaches the worker's background jobs (timed jobs and events), not morning routines, which open their own chats; rerun `openspec validate deny-tools-in-background-runs --strict --no-interactive` and `node scripts/check-payload-links.mjs`.
