## 1. Script

- [x] 1.1 Create `.claude/skills/routine/scripts/routine.mjs` with the `create`, `ls`, `pause`, `resume`, `run`, `logs`, `change`, and `delete` commands and the exit codes in design.md. Use only Node built-ins plus the installed Paseo CLI. Build the create request and its defaults per review.html#/routine-create/defaults.
- [x] 1.2 Read `getDaemonHost` and `connectToDaemon` in the installed CLI. Pass the same local daemon target the CLI passes. Keep the client import and `scheduleCreate` call in one function, and return exit code `5` when the module or function is missing (review.html#/routine-create).
- [x] 1.3 Add `scripts/tests/routine.test.mjs`. Cover: cron field check, primary worktree from `git worktree list --porcelain` output, agent-to-mode mapping, default name, match rules (id, name, prefix, ambiguous), repo filter on `ls`, the exact create request against a fake Paseo package, exit codes `3`, `4`, and `5`, and no create call on `--dry-run`.

## 2. Skill

- [x] 2.1 Create `.claude/skills/routine/SKILL.md` with `name`, a trigger-rich `description` that names Paseo schedules (so it does not compete with the built-in cloud `schedule` skill), and `user-invocable: true`. Describe the flow in review.html#/routine-create: change the time to cron, run `create --dry-run`, show name, cron, timezone, mode, and prompt, then create and report the next run. Link [the ask convention](../../.claude/skills/explore/references/asking-the-user.md) for the confirmation. Do not copy it.
- [x] 2.2 Describe the no-argument list and the `pause`, `resume`, `run`, `logs`, `change`, and `delete` forms. Describe the fallback reply for exit codes `3` to `5`, printed from the script's output.
- [x] 2.3 Add `routine` to `core.skillDirs` in `.claude/skills/wong-sync/references/payload-files.json`.

## 3. Docs

- [x] 3.1 Add one line to "Run it on a cadence" in `wiki/development/repository-improvement.md` that points Paseo users to `/routine`. Do not change the four scheduler requirements or the `repository-improvement` spec.
- [x] 3.2 Add Paseo to `wiki/development/required-tools.md` as an optional tool that only `/routine` uses. Link `/routine` from the `wiki/development/README.md` hub. Add `/routine` to the README command table. Do not edit the `WONG-STACK` block in `CLAUDE.md`.
- [x] 3.3 Create a test routine on this host with `run` and `--max-runs 1`. Confirm that its agent starts in a new Paseo worktree based on the default branch, that the prompt is verbatim, and that the mode is correct. Delete it after. Record the result, and the worktree base, in the Decision log.

## 4. Release

- [x] 4.1 Bump `VERSION` to 18.1.0 and add a newest-first `CHANGELOG.md` entry for `/routine`.
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`. Fix any dead link.
- [x] 4.3 Run `/save` so CI runs the suite with `routine.test.mjs`. The task is done when CI passes.
